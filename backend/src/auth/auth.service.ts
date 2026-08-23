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
}
