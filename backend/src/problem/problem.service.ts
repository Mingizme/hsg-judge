// ============================================
// Problem Service
// Truy vấn danh sách bài tập, chi tiết bài,
// phục vụ Frontend Workspace & Teacher Portal
// ============================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProblemService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy danh sách bài tập (có phân trang, filter độ khó/chủ đề)
   */
  async getProblems(query?: {
    difficulty?: string;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

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
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.problem.count({ where }),
    ]);

    return {
      problems: problems.map((p) => ({
        id: p.id,
        code: p.code,
        title: p.title,
        difficulty: p.difficulty,
        ioType: p.ioType,
        ioFileName: p.ioFileName,
        pdfUrl: p.pdfUrl,
        timeLimitMs: p.timeLimitMs,
        memoryLimitMb: p.memoryLimitMb,
        totalTests: p._count.testCases,
        totalSubmissions: p._count.submissions,
        maxScore: p.maxScore,
        isPublished: p.isPublished,
        categories: p.problemTags.map((pt) => pt.category),
        createdBy: p.createdBy,
        createdAt: p.createdAt,
      })),
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
   * Lấy analytics của một bài tập
   */
  async getAnalytics(problemCode: string) {
    const problem = await this.prisma.problem.findUnique({
      where: { code: problemCode.toUpperCase() },
    });
    if (!problem) {
      throw new NotFoundException(`Problem "${problemCode}" not found`);
    }

    const submissions = await this.prisma.submission.findMany({
      where: { problemId: problem.id },
      include: {
        user: true,
        results: true,
      },
      orderBy: { submittedAt: 'desc' },
    });

    const totalSubmissions = submissions.length;
    const uniqueStudents = new Set(submissions.map((s) => s.userId)).size;

    let totalScore = 0;
    let passedCount = 0;
    const verdicts: Record<string, number> = {};
    const testCaseFailuresRecord: Record<number, number> = {};

    submissions.forEach((s) => {
      totalScore += s.score || 0;
      if ((s.score || 0) >= 100) {
        passedCount++;
      }

      const verdict = s.verdict || 'PENDING';
      verdicts[verdict] = (verdicts[verdict] || 0) + 1;

      if (s.results) {
        s.results.forEach((tcr) => {
          if (tcr.verdict !== 'AC') {
            testCaseFailuresRecord[tcr.testNumber] = (testCaseFailuresRecord[tcr.testNumber] || 0) + 1;
          }
        });
      }
    });

    const testCaseFailures = Object.entries(testCaseFailuresRecord)
      .map(([testNumber, failCount]) => ({ testNumber: Number(testNumber), failCount }))
      .sort((a, b) => b.failCount - a.failCount);

    const verdictDistribution = Object.entries(verdicts).map(([verdict, count]) => ({
      verdict,
      count,
    }));

    return {
      totalSubmissions,
      totalStudents: uniqueStudents,
      avgScore: totalSubmissions > 0 ? totalScore / totalSubmissions : 0,
      passRate: totalSubmissions > 0 ? (passedCount / totalSubmissions) * 100 : 0,
      testCaseFailures,
      verdictDistribution,
      recentSubmissions: submissions.slice(0, 10).map((s) => ({
        userId: s.userId,
        displayName: s.user?.displayName || 'Unknown',
        score: s.score || 0,
        verdict: s.verdict || 'PENDING',
        submittedAt: s.submittedAt,
      })),
    };
  }
}
