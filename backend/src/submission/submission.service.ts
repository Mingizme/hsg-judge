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
import { Subject } from 'rxjs';

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

  // Map submissionId → SSE Subject (cho real-time streaming)
  private readonly sseStreams = new Map<string, Subject<SSEEvent>>();

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

    const sseSubject = new Subject<SSEEvent>();
    this.sseStreams.set(submission.id, sseSubject);

    // ── 4. Start judging (async, non-blocking) ─

    this.executeJudging(
      submission.id,
      sourceCode,
      problem,
      sseSubject,
    ).catch((err) => {
      this.logger.error(`Judge error for ${submission.id}:`, err);
      sseSubject.next({
        type: 'error',
        data: { message: 'System error during judging' },
      });
      sseSubject.complete();
    });

    return submission.id;
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
    sseSubject: Subject<SSEEvent>,
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

    // ── Calculate Score ───────────────────────

    const { score, verdict, passedTests, maxTimeMs } =
      this.calculateScore(judgeResults, problem);

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
            ? problem.maxScore / problem.testCases.length
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

    // Cleanup SSE stream after short delay
    setTimeout(() => {
      this.sseStreams.delete(submissionId);
    }, 30000);

    this.logger.log(
      `\n🏁 Submission ${submissionId}: ${verdict} (${score}/${problem.maxScore}) — ${passedTests}/${testCases.length} tests passed`,
    );
  }

  // ── Score Calculator ────────────────────────

  private calculateScore(
    results: JudgeTestResult[],
    problem: { maxScore: number; testCases: { id: string }[] },
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

    // Điểm theo tỷ lệ test passed
    const scorePerTest = problem.maxScore / totalTests;
    const score = Math.round(passedTests * scorePerTest * 100) / 100;

    // Max execution time (ms)
    const maxTimeMs = Math.max(
      ...results.map((r) => r.executionTimeMs),
      0,
    );

    // Verdict tổng hợp
    let verdict: Verdict;
    if (passedTests === totalTests) {
      verdict = Verdict.AC;
    } else if (results.some((r) => r.verdict === Verdict.CE)) {
      verdict = Verdict.CE;
    } else if (results.some((r) => r.verdict === Verdict.TLE)) {
      verdict = Verdict.TLE;
    } else if (results.some((r) => r.verdict === Verdict.MLE)) {
      verdict = Verdict.MLE;
    } else if (results.some((r) => r.verdict === Verdict.RTE)) {
      verdict = Verdict.RTE;
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
   * Lấy SSE Subject cho client subscribe.
   */
  getSSEStream(submissionId: string): Subject<SSEEvent> | null {
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
      if (user) {
        where.userId = user.id;
      }
    }

    if (problemCode) {
      const problem = await this.prisma.problem.findUnique({
        where: { code: problemCode.toUpperCase() },
      });
      if (problem) {
        where.problemId = problem.id;
      }
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
        verdict: s.verdict || (s.status === 'COMPLETED' ? 'AC' : s.status),
        score: s.score ?? (s.verdict === 'AC' ? (s.maxScore || 100) : 0),
        maxScore: s.maxScore || 100,
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
