// ============================================
// Problem Service
// Truy vấn danh sách bài tập, chi tiết bài,
// phục vụ Frontend Workspace & Teacher Portal
// ============================================

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseStorageService } from '../ingestion/supabase-storage.service';

@Injectable()
export class ProblemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: SupabaseStorageService,
  ) {}

  /**
   * Lấy danh sách bài tập (có phân trang, filter độ khó/chủ đề)
   *
   * `includeUnpublished` chỉ dành cho Teacher Portal. Mặc định API công khai
   * chỉ trả bài đã publish — trước đây không lọc nên bài nháp của giáo viên
   * hiện thẳng trên trang chủ của học sinh.
   */
  async getProblems(query?: {
    difficulty?: string;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
    includeUnpublished?: boolean;
  }) {
    const page = Math.max(1, query?.page || 1);
    const limit = Math.min(100, Math.max(1, query?.limit || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (!query?.includeUnpublished) {
      where.isPublished = true;
    }

    if (query?.difficulty) {
      where.difficulty = query.difficulty;
    }

    if (query?.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { title: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query?.category) {
      where.problemTags = {
        some: {
          category: {
            slug: query.category,
          },
        },
      };
    }

    const [problems, total] = await Promise.all([
      this.prisma.problem.findMany({
        where,
        include: {
          problemTags: {
            include: {
              category: true,
            },
          },
          _count: {
            select: {
              testCases: true,
              submissions: true,
              // Teacher Portal cần biết bài đã có lời giải mẫu / thang điểm
              // subtask chưa. Trước đây frontend ghi cứng `hasSolution: true`
              // nên bài thiếu file .cpp vẫn hiện "✓ Đã có code C++".
              solutionCodes: true,
              subtasks: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.problem.count({ where }),
    ]);

    /**
     * Tỉ lệ AC thật, đếm ở phía Postgres. Trước đây frontend hiển thị cứng
     * `acRate: 50` cho mọi bài — một con số hoàn toàn bịa.
     */
    const acceptedByProblem = new Map<string, number>();
    if (problems.length > 0) {
      const groups = await this.prisma.submission.groupBy({
        by: ['problemId'],
        where: {
          problemId: { in: problems.map((p) => p.id) },
          verdict: 'AC',
        },
        _count: { _all: true },
      });
      groups.forEach((g) => acceptedByProblem.set(g.problemId, g._count._all));
    }

    return {
      problems: problems.map((p) => {
        const totalSubmissions = p._count.submissions;
        const acceptedSubmissions = acceptedByProblem.get(p.id) ?? 0;
        return {
          id: p.id,
          code: p.code,
          title: p.title,
          difficulty: p.difficulty,
          ioType: p.ioType,
          ioFileName: p.ioFileName,
          pdfUrl: p.pdfUrl,
          docxUrl: p.docxUrl,
          hasGuide: Boolean(p.guideHtml && p.guideHtml.trim().length > 0),
          totalSolutions: p._count.solutionCodes,
          totalSubtasks: p._count.subtasks,
          timeLimitMs: p.timeLimitMs,
          memoryLimitMb: p.memoryLimitMb,
          totalTests: p._count.testCases,
          totalSubmissions,
          acceptedSubmissions,
          // `null` = chưa ai nộp → frontend hiển thị "chưa có dữ liệu"
          acRate:
            totalSubmissions > 0
              ? Math.round((acceptedSubmissions / totalSubmissions) * 100)
              : null,
          maxScore: p.maxScore,
          isPublished: p.isPublished,
          // Frontend khai báo `tags` trong types/index.ts → trả cả hai tên để
          // không phá code cũ đang đọc `categories`.
          categories: p.problemTags.map((pt) => pt.category),
          tags: p.problemTags.map((pt) => pt.category),
          createdBy: p.createdBy,
          createdAt: p.createdAt,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Lấy thông tin chi tiết một bài tập theo mã code (VD: "STRNUM")
   */
  async getProblemByCode(code: string) {
    const problem = await this.prisma.problem.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        problemTags: {
          include: { category: true },
        },
        solutionCodes: {
          select: {
            id: true,
            label: true,
            fileName: true,
            sourceCode: true,
            isPrimary: true,
          },
        },
        subtasks: {
          include: {
            testCases: {
              select: { id: true, testNumber: true },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        testCases: {
          where: { isSample: true },
          select: {
            id: true,
            testNumber: true,
            inputData: true,
            outputData: true,
            isSample: true,
          },
          orderBy: { testNumber: 'asc' },
        },
        _count: {
          select: {
            testCases: true,
            submissions: true,
          },
        },
      },
    });

    if (!problem) {
      throw new NotFoundException(`Problem "${code}" not found`);
    }

    return {
      id: problem.id,
      code: problem.code,
      title: problem.title,
      description: problem.description,
      difficulty: problem.difficulty,
      ioType: problem.ioType,
      ioFileName: problem.ioFileName,
      pdfUrl: problem.pdfUrl,
      docxUrl: problem.docxUrl,
      guideHtml: problem.guideHtml,
      timeLimitMs: problem.timeLimitMs,
      memoryLimitMb: problem.memoryLimitMb,
      totalTests: problem._count.testCases,
      maxScore: problem.maxScore,
      isPublished: problem.isPublished,
      categories: problem.problemTags.map((pt) => pt.category),
      solutions: problem.solutionCodes,
      subtasks: problem.subtasks,
      sampleTestCases: problem.testCases,
      createdAt: problem.createdAt,
      updatedAt: problem.updatedAt,
    };
  }

  /**
   * Tạo subtask mới
   */
  async createSubtask(problemCode: string, data: { label: string; description?: string; score: number; sortOrder: number; testCaseIds?: string[] }) {
    const problem = await this.prisma.problem.findUnique({
      where: { code: problemCode.toUpperCase() },
    });
    if (!problem) {
      throw new NotFoundException(`Problem "${problemCode}" not found`);
    }

    return this.prisma.subtask.create({
      data: {
        problemId: problem.id,
        label: data.label,
        description: data.description,
        score: data.score,
        sortOrder: data.sortOrder,
        ...(data.testCaseIds && data.testCaseIds.length > 0 && {
          testCases: {
            connect: data.testCaseIds.map((id) => ({ id })),
          },
        }),
      },
    });
  }

  /**
   * Cập nhật subtask
   */
  async updateSubtask(subtaskId: string, data: { label?: string; description?: string; score?: number; sortOrder?: number; testCaseIds?: string[] }) {
    return this.prisma.subtask.update({
      where: { id: subtaskId },
      data: {
        ...(data.label !== undefined && { label: data.label }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.score !== undefined && { score: data.score }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.testCaseIds && {
          testCases: {
            set: data.testCaseIds.map((id) => ({ id })),
          },
        }),
      },
    });
  }

  /**
   * Xóa subtask
   */
  async deleteSubtask(subtaskId: string) {
    return this.prisma.subtask.delete({
      where: { id: subtaskId },
    });
  }

  /**
   * Xác định người đang thực hiện thao tác và bắt buộc phải là GIÁO VIÊN.
   *
   * Backend hiện chưa có tầng xác thực (không `UseGuards`, không xác minh JWT
   * của Supabase), nên vai trò được tra CHÍNH TỪ CSDL theo khoá mà client gửi
   * lên — giống cách `submission.service.ts` nhận diện người nộp bài: chấp nhận
   * `id` nội bộ, `supabaseId` hoặc `email`. Nhờ vậy client KHÔNG thể tự khai
   * `role: 'TEACHER'`; muốn xoá được thì tài khoản đó phải thật sự là giáo viên
   * trong bảng `User`.
   *
   * Hạn chế còn lại (đã báo với người dùng): kẻ biết email của một giáo viên vẫn
   * có thể mạo danh, vì không có token để đối chiếu. Chỉ khi bổ sung guard xác
   * minh JWT thì lỗ hổng này mới đóng hoàn toàn.
   */
  private async requireTeacher(identifier?: string) {
    const key = (identifier || '').trim();

    if (!key) {
      throw new UnauthorizedException(
        'Thiếu thông tin tài khoản thực hiện. Hãy đăng nhập lại rồi thử lại.',
      );
    }

    const actor = await this.prisma.user.findFirst({
      where: {
        OR: [{ id: key }, { supabaseId: key }, { email: key.toLowerCase() }],
      },
      select: { id: true, email: true, displayName: true, role: true },
    });

    if (!actor) {
      throw new UnauthorizedException(
        'Không tìm thấy tài khoản thực hiện thao tác. Hãy đăng nhập lại.',
      );
    }

    if (actor.role !== UserRole.TEACHER) {
      throw new ForbiddenException(
        'Chỉ tài khoản Giáo viên mới có quyền xoá bài tập.',
      );
    }

    return actor;
  }

  /**
   * Xoá hẳn một bài tập khỏi hệ thống (chỉ giáo viên).
   *
   * Mọi quan hệ của `Problem` trong `schema.prisma` đều là `onDelete: Cascade`
   * nên một lệnh `delete` sẽ kéo theo: testCases, subtasks, solutionCodes,
   * submissions (+ submissionResults), userProgress và problemTags. Vì vậy phải
   * đếm trước rồi báo lại cho giáo viên biết đã mất những gì — nhất là số lượt
   * nộp của học sinh, thứ không thể phục hồi.
   */
  async deleteProblem(code: string, identifier?: string) {
    const actor = await this.requireTeacher(identifier);
    const normalizedCode = code.trim().toUpperCase();

    const problem = await this.prisma.problem.findUnique({
      where: { code: normalizedCode },
      select: {
        id: true,
        code: true,
        title: true,
        pdfUrl: true,
        docxUrl: true,
        _count: {
          select: {
            testCases: true,
            subtasks: true,
            solutionCodes: true,
            submissions: true,
            userProgress: true,
            problemTags: true,
          },
        },
      },
    });

    if (!problem) {
      throw new NotFoundException(
        `Không tìm thấy bài tập "${normalizedCode}" để xoá.`,
      );
    }

    const counts = problem._count;

    // Dọn Storage TRƯỚC khi xoá bản ghi: xoá DB xong là mất luôn thông tin bài
    // từng có file gì. Lỗi Storage không được chặn việc xoá bài (bucket có thể
    // chưa cấu hình trên môi trường dev) — chỉ báo lại trong kết quả.
    const hadFiles = Boolean(problem.pdfUrl || problem.docxUrl);
    const storageResult: {
      configured: boolean;
      removed: string[];
      error?: string;
    } = hadFiles
      ? await this.storage.removeProblemFiles(problem.code)
      : { configured: this.storage.isConfigured(), removed: [] };

    await this.prisma.problem.delete({ where: { id: problem.id } });

    return {
      code: problem.code,
      title: problem.title,
      deletedBy: {
        id: actor.id,
        email: actor.email,
        displayName: actor.displayName,
      },
      deleted: {
        testCases: counts.testCases,
        subtasks: counts.subtasks,
        solutionCodes: counts.solutionCodes,
        submissions: counts.submissions,
        userProgress: counts.userProgress,
        problemTags: counts.problemTags,
      },
      storage: {
        configured: storageResult.configured,
        removedFiles: storageResult.removed.length,
        error: storageResult.error ?? null,
      },
    };
  }

  /**
   * Lấy analytics của một bài tập.
   *
   * Trước đây hàm này `findMany` TOÀN BỘ submission kèm `user` và `results`
   * rồi cộng dồn trong JS — bài có vài nghìn lượt nộp là hết RAM trên Render
   * free tier. Nay dùng aggregate/groupBy để Postgres tính, chỉ tải về 10 bản
   * ghi gần nhất để hiển thị.
   *
   * `passRate` cũng được sửa: cũ so `score >= 100` cứng nên bài có maxScore
   * khác 100 luôn ra 0%. Nay đếm theo verdict AC.
   */
  async getAnalytics(problemCode: string) {
    const problem = await this.prisma.problem.findUnique({
      where: { code: problemCode.toUpperCase() },
      select: { id: true, maxScore: true },
    });
    if (!problem) {
      throw new NotFoundException(`Problem "${problemCode}" not found`);
    }

    const where = { problemId: problem.id };

    const [aggregate, distinctUsers, verdictGroups, failureGroups, recent] =
      await Promise.all([
        this.prisma.submission.aggregate({
          where,
          _count: { _all: true },
          _avg: { score: true },
        }),
        this.prisma.submission.findMany({
          where,
          distinct: ['userId'],
          select: { userId: true },
        }),
        this.prisma.submission.groupBy({
          by: ['verdict'],
          where,
          _count: { _all: true },
        }),
        this.prisma.submissionResult.groupBy({
          by: ['testNumber'],
          where: {
            submission: where,
            verdict: { not: 'AC' },
          },
          _count: { _all: true },
        }),
        this.prisma.submission.findMany({
          where,
          orderBy: { submittedAt: 'desc' },
          take: 10,
          select: {
            userId: true,
            score: true,
            verdict: true,
            submittedAt: true,
            user: { select: { displayName: true } },
          },
        }),
      ]);

    const totalSubmissions = aggregate._count._all;
    const acceptedCount =
      verdictGroups.find((g) => g.verdict === 'AC')?._count._all ?? 0;

    return {
      totalSubmissions,
      totalStudents: distinctUsers.length,
      avgScore: aggregate._avg.score ?? 0,
      maxScore: problem.maxScore,
      passRate:
        totalSubmissions > 0 ? (acceptedCount / totalSubmissions) * 100 : 0,
      testCaseFailures: failureGroups
        .map((g) => ({
          testNumber: g.testNumber,
          failCount: g._count._all,
        }))
        .sort((a, b) => b.failCount - a.failCount),
      verdictDistribution: verdictGroups.map((g) => ({
        verdict: g.verdict || 'PENDING',
        count: g._count._all,
      })),
      recentSubmissions: recent.map((s) => ({
        userId: s.userId,
        displayName: s.user?.displayName || 'Unknown',
        score: s.score ?? 0,
        verdict: s.verdict || 'PENDING',
        submittedAt: s.submittedAt,
      })),
    };
  }
}
