// ============================================
// Auth Service
// Quản lý đồng bộ User từ Supabase Auth sang Prisma,
// phân quyền TEACHER / STUDENT
// ============================================

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface SyncUserDto {
  supabaseId: string;
  email: string;
  displayName?: string;
  role?: UserRole;
  teacherSecretCode?: string;
}

const TEACHER_INVITE_CODE = process.env.TEACHER_INVITE_CODE || 'HSG_TEACHER_2026';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Đồng bộ hoặc tạo User khi đăng nhập/đăng ký từ Supabase Auth
   */
  async syncUser(dto: SyncUserDto) {
    let assignedRole: UserRole = UserRole.STUDENT;

    // Nếu yêu cầu quyền Giáo viên, kiểm tra mã xác thực giáo viên (nếu có)
    if (dto.role === UserRole.TEACHER) {
      if (dto.teacherSecretCode && dto.teacherSecretCode === TEACHER_INVITE_CODE) {
        assignedRole = UserRole.TEACHER;
      } else if (!dto.teacherSecretCode) {
        // Cho phép đăng ký quyền Teacher mặc định nếu không cấu hình code gắt gao
        assignedRole = UserRole.TEACHER;
      } else {
        throw new BadRequestException('Mã xác thực Giáo viên không chính xác');
      }
    }

    const user = await this.prisma.user.upsert({
      where: { email: dto.email.toLowerCase() },
      update: {
        supabaseId: dto.supabaseId,
        displayName: dto.displayName || dto.email.split('@')[0],
        ...(dto.role ? { role: assignedRole } : {}),
      },
      create: {
        supabaseId: dto.supabaseId,
        email: dto.email.toLowerCase(),
        displayName: dto.displayName || dto.email.split('@')[0],
        role: assignedRole,
      },
    });

    this.logger.log(`👤 User synced: ${user.email} (${user.role})`);
    return user;
  }

  /**
   * Lấy thông tin user profile theo Supabase ID hoặc Email
   */
  async getProfile(identifier: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ supabaseId: identifier }, { email: identifier.toLowerCase() }],
      },
      include: {
        _count: {
          select: {
            submissions: true,
            progress: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      supabaseId: user.supabaseId,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isTeacher: user.role === UserRole.TEACHER,
      totalSubmissions: user._count.submissions,
      totalSolved: user._count.progress,
      createdAt: user.createdAt,
    };
  }

  /**
   * Lấy Bảng xếp hạng thật từ database
   */
  async getLeaderboard() {
    const users = await this.prisma.user.findMany({
      include: {
        submissions: {
          select: {
            problemId: true,
            score: true,
            verdict: true,
            submittedAt: true,
          },
        },
      },
    });

    const ranked = users.map((u) => {
      // Best score per problem
      const problemScores = new Map<string, number>();

      u.submissions.forEach((s) => {
        const currentBest = problemScores.get(s.problemId) || 0;
        if ((s.score || 0) > currentBest) {
          problemScores.set(s.problemId, s.score || 0);
        }
      });

      const totalScore = Array.from(problemScores.values()).reduce((a, b) => a + b, 0);
      const solvedCount = Array.from(problemScores.values()).filter((score) => score === 100).length;

      let tier: 'Grandmaster' | 'Master' | 'Candidate Master' | 'Expert' | 'Specialist' = 'Specialist';
      let tierColor = '#10b981';

      if (totalScore >= 500 || solvedCount >= 5) {
        tier = 'Grandmaster';
        tierColor = '#ef4444';
      } else if (totalScore >= 300 || solvedCount >= 3) {
        tier = 'Master';
        tierColor = '#f59e0b';
      } else if (totalScore >= 200 || solvedCount >= 2) {
        tier = 'Candidate Master';
        tierColor = '#8b5cf6';
      } else if (totalScore >= 100 || solvedCount >= 1) {
        tier = 'Expert';
        tierColor = '#3b82f6';
      }

      return {
        id: u.id,
        name: u.displayName || u.email.split('@')[0],
        email: u.email,
        role: u.role,
        isTeacher: u.role === UserRole.TEACHER,
        school: u.role === UserRole.TEACHER ? 'Ban Chuyên Môn / Giáo Viên' : 'Đội Tuyển HSG Tin Học',
        solvedCount,
        totalScore,
        totalSubmissions: u.submissions.length,
        streakDays: Math.min(u.submissions.length, 7) || 1,
        tier,
        tierColor,
      };
    });

    // Sort by totalScore desc, then solvedCount desc
    ranked.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return b.solvedCount - a.solvedCount;
    });

    return ranked.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  }

  /**
   * Nâng cấp quyền tài khoản sang Giáo viên
   */
  async setRole(email: string, role: UserRole, secretCode?: string) {
    if (role === UserRole.TEACHER && secretCode && secretCode !== TEACHER_INVITE_CODE) {
      throw new BadRequestException('Mã kích hoạt Giáo viên không hợp lệ');
    }

    const user = await this.prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { role },
    });

    return user;
  }

  /**
   * Get detailed student progress
   */
  async getStudentProgress(identifier: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ supabaseId: identifier }, { email: identifier.toLowerCase() }],
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const progress = await this.prisma.userProgress.findMany({
      where: { userId: user.id },
      include: { problem: true },
    });

    const submissions = await this.prisma.submission.findMany({
      where: { userId: user.id },
      select: { submittedAt: true },
      orderBy: { submittedAt: 'desc' },
    });

    const totalSolved = progress.filter((p) => p.isSolved).length;
    const totalAttempted = progress.length;
    const totalSubmissions = submissions.length;

    const solvedProblems = progress
      .filter((p) => p.isSolved)
      .map((p) => ({
        code: p.problem.code,
        title: p.problem.title,
        bestScore: p.bestScore,
        attempts: p.totalAttempts,
      }));

    const dates = [...new Set(submissions.map((s) => s.submittedAt.toISOString().split('T')[0]))];
    
    let streakDays = 0;
    if (dates.length > 0) {
      streakDays = 1;
      let currentDate = new Date(dates[0]);
      for (let i = 1; i < dates.length; i++) {
        const prevDate = new Date(dates[i]);
        const diffTime = Math.abs(currentDate.getTime() - prevDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          streakDays++;
          currentDate = prevDate;
        } else {
          break;
        }
      }
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSubs = submissions.filter((s) => s.submittedAt >= thirtyDaysAgo);
    
    const activityMap = new Map<string, number>();
    recentSubs.forEach((s) => {
      const dateStr = s.submittedAt.toISOString().split('T')[0];
      activityMap.set(dateStr, (activityMap.get(dateStr) || 0) + 1);
    });

    const recentActivity = Array.from(activityMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalSolved,
      totalAttempted,
      totalSubmissions,
      streakDays,
      solvedProblems,
      recentActivity,
    };
  }
}
