// ============================================
// Auth Controller
// REST API endpoints cho đồng bộ User & phân quyền
// ============================================

import { Controller, Post, Get, Body, Param, Headers, UnauthorizedException } from '@nestjs/common';
import { AuthService, SyncUserDto } from './auth.service';
import { UserRole } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/auth/sync
   * Đồng bộ User khi đăng nhập/đăng ký từ Client
   */
  @Post('sync')
  async syncUser(@Body() dto: SyncUserDto) {
    const user = await this.authService.syncUser(dto);
    return {
      statusCode: 200,
      message: 'User profile synced successfully',
      data: user,
    };
  }

  /**
   * GET /api/auth/me/:identifier
   * Lấy thông tin chi tiết và quyền của user
   */
  @Get('me/:identifier')
  async getProfile(@Param('identifier') identifier: string) {
    const profile = await this.authService.getProfile(identifier);
    return {
      statusCode: 200,
      data: profile,
    };
  }

  /**
   * POST /api/auth/upgrade-teacher
   * Nâng cấp tài khoản thành Giáo viên
   */
  @Post('upgrade-teacher')
  async upgradeToTeacher(
    @Body() body: { email: string; secretCode?: string },
  ) {
    const user = await this.authService.setRole(
      body.email,
      UserRole.TEACHER,
      body.secretCode,
    );
    return {
      statusCode: 200,
      message: 'Tài khoản đã được nâng cấp quyền Giáo viên',
      data: user,
    };
  }
}
