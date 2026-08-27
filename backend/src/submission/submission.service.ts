// ============================================
// Submission Service
// Quản lý vòng đời submission:
// Create → Judge → Score → Update Progress
// ============================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Verdict, SubmissionStatus, IOType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  JudgeWorkerService,
  JudgeTestResult,
  TestCaseInput,
  JudgeConfig,
} from '../judge/judge-worker.service';
import { ReplaySubject } from 'rxjs';

// ── Types ─────────────────────────────────────

export interface SSEEvent {
  type: 'compile' | 'test-result' | 'complete' | 'error';
  data: Record<string, unknown>;
}

export interface SubmissionSummary {
  submissionId: string;
  problemCode: string;
  status: SubmissionStatus;
  verdict: Verdict | null;
  score: number | null;
  maxScore: number;
  totalTests: number;
  passedTests: number;
  executionTimeMs: number | null;
  submittedAt: Date;
  results: Array<{
    testNumber: number;
    verdict: Verdict;
    executionTimeMs: number;
    errorMessage: string | null;
  }>;
}

@Injectable()
export class SubmissionService {
  private readonly logger = new Logger(SubmissionService.name);

  /**
   * Map submissionId → ReplaySubject (real-time streaming).
   *
   * QUAN TRỌNG: phải là ReplaySubject, không phải Subject. Quá trình chấm bắt
   * đầu ngay khi POST /submit trả về, tức là TRƯỚC khi client kịp mở
   * EventSource. Với Subject thường, các event `compile` và những
   * `test-result` đầu tiên bị mất; bài biên dịch lỗi hoặc bài rất nhanh còn
   * `complete()` xong trước khi client subscribe → UI treo ở "Đang chấm".
   * ReplaySubject phát lại toàn bộ lịch sử cho subscriber đến muộn (Render
   * free tier cold-start có thể mất vài giây).
   */
  private readonly sseStreams = new Map<string, ReplaySubject<SSEEvent>>();

  /** Hẹn giờ dọn stream — giữ tham chiếu để clear khi cần */
  private readonly sseCleanupTimers = new Map<string, NodeJS.Timeout>();

  /** Giữ stream đủ lâu để client vượt qua cold-start / mất mạng tạm thời */
  private static readonly SSE_RETENTION_MS = 5 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly judgeWorker: JudgeWorkerService,
  ) {}

  // ── Submit & Judge ──────────────────────────

  /**
   * Luồng chính xử lý submission:
   * 1. Validate problem exists
   * 2. Create Submission record (PENDING)
   * 3. Fetch all test cases
   * 4. Judge sequentially, stream results via SSE
   * 5. Calculate score, update submission
   * 6. Update user progress
   */
  async submitAndJudge(
    userId: string,
    problemCode: string,
    sourceCode: string,
    language: string = 'cpp',
  ): Promise<string> {
    // ── 1. Validate Problem ───────────────────

    const problem = await this.prisma.problem.findUnique({
      where: { code: problemCode.toUpperCase() },
      include: {
        testCases: {
          orderBy: { testNumber: 'asc' },
        },
        subtasks: {
          include: { testCases: true },
        },
      },
    });

    if (!problem) {
      throw new NotFoundException(
        `Problem "${problemCode}" not found`,
      );
    }

    // ── 2. Find or Create Valid User ─────────
    let validUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { id: userId },
          { supabaseId: userId },
          { email: userId.toLowerCase() },
        ],
      },
    });

    if (!validUser) {
      const isEmail = userId.includes('@');
      validUser = await this.prisma.user.create({
        data: {
          supabaseId: userId,
          email: isEmail ? userId.toLowerCase() : `user-${userId.slice(0, 8)}@hsgjudge.local`,
          displayName: isEmail ? userId.split('@')[0] : 'Thí sinh',
          role: 'STUDENT',
        },
      });
    }

    const submission = await this.prisma.submission.create({
      data: {
        userId: validUser.id,
        problemId: problem.id,
        sourceCode,
        language,
        status: SubmissionStatus.PENDING,
        maxScore: problem.maxScore,
      },
    });

    this.logger.log(
      `\n📝 Submission ${submission.id} created for ${problemCode} by user ${userId}`,
    );

    // ── 3. Create SSE stream ──────────────────

    // Buffer không giới hạn: mọi event từ lúc bắt đầu chấm đều được phát lại
    // cho client dù client subscribe muộn.
    const sseSubject = new ReplaySubject<SSEEvent>();
    this.sseStreams.set(submission.id, sseSubject);
    this.scheduleStreamCleanup(submission.id);

    // ── 4. Start judging (async, non-blocking) ─

    this.executeJudging(
      submission.id,
      sourceCode,
      problem,
      sseSubject,
    ).catch(async (err) => {
      this.logger.error(`Judge error for ${submission.id}:`, err);

      // Đánh dấu submission thất bại để UI không treo vô hạn ở PENDING
      try {
        await this.prisma.submission.update({
          where: { id: submission.id },
          data: {
            status: SubmissionStatus.ERROR,
            verdict: Verdict.SE,
            judgedAt: new Date(),
            compilationLog: String(err?.message || err).slice(0, 2000),
          },
        });
      } catch (updateErr) {
        this.logger.warn(`Cannot mark submission FAILED: ${updateErr}`);
      }

      sseSubject.next({
        type: 'error',
        data: {
          submissionId: submission.id,
          message: 'Lỗi hệ thống trong quá trình chấm bài',
        },
      });
      sseSubject.complete();
    });

    return submission.id;
  }

  /** Dọn stream sau khoảng giữ, luôn reset timer cũ nếu có */
  private scheduleStreamCleanup(submissionId: string): void {
    const existing = this.sseCleanupTimers.get(submissionId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.sseStreams.delete(submissionId);
      this.sseCleanupTimers.delete(submissionId);
    }, SubmissionService.SSE_RETENTION_MS);

    // Không giữ event loop sống chỉ vì timer dọn rác
    timer.unref?.();
    this.sseCleanupTimers.set(submissionId, timer);
  }

  // ── Execute Judging (async worker) ──────────

  private async executeJudging(
    submissionId: string,
    sourceCode: string,
    problem: {
      id: string;
      code: string;
      ioType: IOType;
      timeLimitMs: number;
      memoryLimitMb: number;
      maxScore: number;
      testCases: Array<{
        id: string;
        testNumber: number;
        inputData: string;
        outputData: string;
      }>;
      subtasks: Array<{
        id: string;
        score: number;
        testCases: Array<{ id: string }>;
      }>;
    },
    sseSubject: ReplaySubject<SSEEvent>,
  ): Promise<void> {
    // Update status → JUDGING
    await this.prisma.submission.update({
      where: { id: submissionId },
      data: { status: SubmissionStatus.JUDGING },
    });

    const config: JudgeConfig = {
      timeLimitMs: problem.timeLimitMs,
      memoryLimitMb: problem.memoryLimitMb,
      ioType: problem.ioType as 'FILE' | 'STANDARD',
    };

    const testCases: TestCaseInput[] = problem.testCases.map((tc) => ({
      testCaseId: tc.id,
      testNumber: tc.testNumber,
      inputData: tc.inputData,
      expectedOutput: tc.outputData,
    }));

    // Emit compile start
    sseSubject.next({
      type: 'compile',
      data: { status: 'compiling', totalTests: testCases.length },
    });

    // Bài chưa nạp test case → dừng sớm với thông báo rõ ràng thay vì
    // chia cho 0 rồi lưu score = NaN.
    if (testCases.length === 0) {
      await this.prisma.submission.update({
        where: { id: submissionId },
        data: {
          status: SubmissionStatus.ERROR,
          verdict: Verdict.SE,
          score: 0,
          maxScore: problem.maxScore,
          judgedAt: new Date(),
          compilationLog: 'Bài tập chưa có test case nào được nạp.',
        },
      });
      sseSubject.next({
        type: 'error',
        data: {
          submissionId,
          message: `Bài "${problem.code}" chưa có test case. Giáo viên cần nạp lại dữ liệu.`,
        },
      });
      sseSubject.complete();
      return;
    }

    // ── Judge all tests with SSE callback ─────

    const judgeResults = await this.judgeWorker.judgeAllTests(
      sourceCode,
      testCases,
      config,
      (result: JudgeTestResult) => {
        // Stream mỗi test result về client
        sseSubject.next({
          type: 'test-result',
          data: {
            testNumber: result.testNumber,
            verdict: result.verdict,
            executionTimeMs: result.executionTimeMs,
            errorMessage: result.errorMessage,
            diff: result.diff
              ? {
                  firstDiffLine: result.diff.firstDiffLine,
                  expectedPreview: result.diff.expectedPreview,
                  actualPreview: result.diff.actualPreview,
                }
              : null,
          },
        });
      },
    );

    // ── Calculate Score (theo thang điểm Subtask) ──

    const testWeights = this.buildTestWeights(problem);

    const { score, verdict, passedTests, maxTimeMs } = this.calculateScore(
      judgeResults,
      problem,
      testWeights,
    );

    // ── Save Results to Database ──────────────

    // Batch insert submission results
    await this.prisma.submissionResult.createMany({
      data: judgeResults.map((r) => ({
        submissionId,
        testCaseId: r.testCaseId,
        testNumber: r.testNumber,
        verdict: r.verdict,
        executionTimeMs: r.executionTimeMs,
        memoryUsageKb: r.memoryUsageKb,
        actualOutput: r.actualOutput?.substring(0, 5000),
        errorMessage: r.errorMessage?.substring(0, 2000),
        score:
          r.verdict === Verdict.AC
            ? Math.round((testWeights.get(r.testCaseId) ?? 0) * 100) / 100
            : 0,
        checkedAt: new Date(),
      })),
    });

    // Update submission
    await this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: SubmissionStatus.COMPLETED,
        verdict,
        score,
        maxScore: problem.maxScore,
        executionTimeMs: maxTimeMs,
        compilationLog:
          judgeResults[0]?.verdict === Verdict.CE
            ? judgeResults[0].errorMessage
            : null,
        judgedAt: new Date(),
      },
    });

    // ── Emit complete event FIRST ──────────────
    sseSubject.next({
      type: 'complete',
      data: {
        submissionId,
        verdict,
        score,
        maxScore: problem.maxScore,
        totalTests: testCases.length,
        passedTests,
        executionTimeMs: maxTimeMs,
      },
    });

    sseSubject.complete();

    // ── Update User Progress Safely ───────────
    try {
      const sub = await this.prisma.submission.findUnique({
        where: { id: submissionId },
        select: { userId: true },
      });
      if (sub?.userId) {
        await this.updateUserProgress(
          sub.userId,
          problem.id,
          score,
          problem.maxScore,
        );
      }
    } catch (progressErr) {
      this.logger.warn(`⚠️ User progress update warning: ${progressErr}`);
    }

    // Gia hạn thời gian giữ stream tính từ lúc chấm xong, để client vừa mở
    // EventSource sau khi bài chấm xong vẫn nhận đủ event replay.
    this.scheduleStreamCleanup(submissionId);

    this.logger.log(
      `\n🏁 Submission ${submissionId}: ${verdict} (${score}/${problem.maxScore}) — ${passedTests}/${testCases.length} tests passed`,
    );
  }

  // ── Test Weights (thang điểm Subtask) ───────

  /**
   * Tính điểm của TỪNG test case theo cấu hình Subtask của giáo viên.
   *
   * Quy tắc (khớp cách chấm Themis quen dùng cho HSG Việt Nam):
   * - Mỗi Subtask có tổng điểm `score`, chia đều cho số test thuộc Subtask đó.
   *   VD: "Test 1-10: 10đ" → mỗi test 1đ; "Test 11-30: 20đ" → mỗi test 1đ.
   * - Test không thuộc Subtask nào chia đều phần điểm còn lại của `maxScore`.
   * - Bài không cấu hình Subtask → chia đều `maxScore` cho toàn bộ test.
   *
   * Trả về Map testCaseId → điểm, dùng cho cả tổng điểm và điểm từng dòng
   * SubmissionResult (trước đây điểm từng dòng luôn là maxScore/n, bỏ qua
   * hoàn toàn thang điểm Subtask đã cấu hình).
   */
  private buildTestWeights(problem: {
    maxScore: number;
    testCases: Array<{ id: string }>;
    subtasks: Array<{ score: number; testCases: Array<{ id: string }> }>;
  }): Map<string, number> {
    const weights = new Map<string, number>();
    const assigned = new Set<string>();
    let allocated = 0;

    for (const subtask of problem.subtasks || []) {
      const tests = (subtask.testCases || []).filter(
        (tc) => !assigned.has(tc.id),
      );
      if (tests.length === 0) continue;

      const perTest = subtask.score / tests.length;
      for (const tc of tests) {
        weights.set(tc.id, perTest);
        assigned.add(tc.id);
      }
      allocated += subtask.score;
    }

    const leftovers = problem.testCases.filter((tc) => !assigned.has(tc.id));
    if (leftovers.length > 0) {
      const remaining = Math.max(0, problem.maxScore - allocated);
      const perTest = remaining / leftovers.length;
      for (const tc of leftovers) {
        weights.set(tc.id, perTest);
      }
    }

    return weights;
  }

  // ── Score Calculator ────────────────────────

  private calculateScore(
    results: JudgeTestResult[],
    problem: { maxScore: number; testCases: { id: string }[] },
    testWeights: Map<string, number>,
  ): {
    score: number;
    verdict: Verdict;
    passedTests: number;
    maxTimeMs: number;
  } {
    const totalTests = results.length;
    const passedTests = results.filter(
      (r) => r.verdict === Verdict.AC,
    ).length;

    // Cộng điểm theo trọng số từng test (đã tính từ Subtask)
    const rawScore = results.reduce(
      (sum, r) =>
        r.verdict === Verdict.AC
          ? sum + (testWeights.get(r.testCaseId) ?? 0)
          : sum,
      0,
    );

    // Chặn trên bằng maxScore để tránh sai lệch làm tròn / cấu hình Subtask lệch
    const score =
      Math.round(Math.min(rawScore, problem.maxScore) * 100) / 100;

    // Max execution time (ms)
    const maxTimeMs = results.length
      ? Math.max(...results.map((r) => r.executionTimeMs || 0), 0)
      : 0;

    // Verdict tổng hợp — ưu tiên lỗi nghiêm trọng nhất
    let verdict: Verdict;
    if (totalTests === 0) {
      verdict = Verdict.SE;
    } else if (results.some((r) => r.verdict === Verdict.CE)) {
      verdict = Verdict.CE;
    } else if (passedTests === totalTests) {
      verdict = Verdict.AC;
    } else if (results.some((r) => r.verdict === Verdict.TLE)) {
      verdict = Verdict.TLE;
    } else if (results.some((r) => r.verdict === Verdict.MLE)) {
      verdict = Verdict.MLE;
    } else if (results.some((r) => r.verdict === Verdict.RTE)) {
      verdict = Verdict.RTE;
    } else if (results.some((r) => r.verdict === Verdict.SE)) {
      verdict = Verdict.SE;
    } else {
      verdict = Verdict.WA;
    }

    return { score, verdict, passedTests, maxTimeMs };
  }

  // ── Update User Progress ────────────────────

  private async updateUserProgress(
    userId: string,
    problemId: string,
    score: number,
    maxScore: number,
  ): Promise<void> {
    const existing = await this.prisma.userProgress.findUnique({
      where: {
        userId_problemId: { userId, problemId },
      },
    });

    const isSolved = score >= maxScore;

    if (existing) {
      await this.prisma.userProgress.update({
        where: { id: existing.id },
        data: {
          bestScore: Math.max(existing.bestScore, score),
          totalAttempts: existing.totalAttempts + 1,
          isSolved: existing.isSolved || isSolved,
          firstSolvedAt:
            isSolved && !existing.isSolved
              ? new Date()
              : existing.firstSolvedAt,
          lastAttemptAt: new Date(),
        },
      });
    } else {
      await this.prisma.userProgress.create({
        data: {
          userId,
          problemId,
          bestScore: score,
          totalAttempts: 1,
          isSolved,
          firstSolvedAt: isSolved ? new Date() : null,
          lastAttemptAt: new Date(),
        },
      });
    }
  }

  // ── Get SSE Stream ──────────────────────────

  /**
   * Lấy SSE stream cho client subscribe.
   * ReplaySubject nên subscriber đến muộn vẫn nhận đủ event từ đầu.
   */
  getSSEStream(submissionId: string): ReplaySubject<SSEEvent> | null {
    return this.sseStreams.get(submissionId) || null;
  }

  // ── Run Custom Input ────────────────────────

  async runCustomInput(
    problemCode: string,
    sourceCode: string,
    customInput: string,
  ) {
    const problem = await this.prisma.problem.findUnique({
      where: { code: problemCode.toUpperCase() },
    });

    if (!problem) {
      throw new NotFoundException(
        `Problem "${problemCode}" not found`,
      );
    }

    const config: JudgeConfig = {
      timeLimitMs: problem.timeLimitMs,
      memoryLimitMb: problem.memoryLimitMb,
      ioType: problem.ioType as 'FILE' | 'STANDARD',
    };

    return this.judgeWorker.runCustom(sourceCode, customInput, config);
  }

  // ── Get Submission Detail ───────────────────

  async getSubmission(submissionId: string): Promise<SubmissionSummary> {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        problem: true,
        results: {
          orderBy: { testNumber: 'asc' },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException(
        `Submission "${submissionId}" not found`,
      );
    }

    return {
      submissionId: submission.id,
      problemCode: submission.problem.code,
      status: submission.status,
      verdict: submission.verdict,
      score: submission.score,
      maxScore: submission.maxScore || submission.problem.maxScore,
      totalTests: submission.results.length,
      passedTests: submission.results.filter(
        (r) => r.verdict === Verdict.AC,
      ).length,
      executionTimeMs: submission.executionTimeMs,
      submittedAt: submission.submittedAt,
      results: submission.results.map((r) => ({
        testNumber: r.testNumber,
        verdict: r.verdict,
        executionTimeMs: r.executionTimeMs || 0,
        errorMessage: r.errorMessage,
      })),
    };
  }

  async getSubmissionsByUser(
    userId?: string,
    problemCode?: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const where: Record<string, unknown> = {};

    if (userId) {
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [{ id: userId }, { supabaseId: userId }, { email: userId.toLowerCase() }],
        },
      });
      // Không tìm thấy tài khoản → PHẢI trả rỗng. Trước đây bỏ qua điều kiện
      // lọc nên tab "Của tôi" hiện bài nộp của tất cả mọi người.
      where.userId = user ? user.id : '__no_such_user__';
    }

    if (problemCode) {
      const problem = await this.prisma.problem.findUnique({
        where: { code: problemCode.toUpperCase() },
      });
      // Tương tự: mã bài không tồn tại thì không được trả bài của bài khác.
      where.problemId = problem ? problem.id : '__no_such_problem__';
    }

    const [submissions, total] = await Promise.all([
      this.prisma.submission.findMany({
        where,
        include: {
          problem: { select: { code: true, title: true } },
          user: { select: { id: true, email: true, displayName: true, role: true } },
          _count: { select: { results: true } },
        },
        orderBy: { submittedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.submission.count({ where }),
    ]);

    return {
      submissions: submissions.map((s) => ({
        id: s.id,
        problemCode: s.problem.code,
        problemTitle: s.problem.title,
        status: s.status,
        // Không "đoán" verdict: bài chưa chấm xong thì verdict là null và UI
        // hiển thị trạng thái thật (PENDING/JUDGING) thay vì AC giả.
        verdict: s.verdict,
        score: s.score,
        maxScore: s.maxScore ?? 100,
        language: s.language,
        executionTimeMs: s.executionTimeMs,
        submittedAt: s.submittedAt,
        totalTests: s._count.results,
        user: s.user
          ? {
              id: s.user.id,
              email: s.user.email,
              displayName: s.user.displayName,
              role: s.user.role,
            }
          : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
