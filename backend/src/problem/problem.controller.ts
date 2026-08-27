// ============================================
// Problem Controller
// REST endpoints cho xem bài tập
// ============================================

import { Controller, Get, Param, Query, Res, Post, Put, Delete, Body } from '@nestjs/common';
import { ProblemService } from './problem.service';

@Controller('problems')
export class ProblemController {
  constructor(private readonly problemService: ProblemService) {}

  /**
   * GET /api/problems
   *
   * `includeUnpublished=true` dành cho Teacher Portal (xem cả bài nháp).
   * Mặc định chỉ trả bài đã publish.
   */
  @Get()
  async getProblems(
    @Query('difficulty') difficulty?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('includeUnpublished') includeUnpublished?: string,
  ) {
    return this.problemService.getProblems({
      difficulty,
      category,
      search,
      page: Math.max(1, parseInt(page || '1', 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit || '20', 10) || 20)),
      includeUnpublished: includeUnpublished === 'true',
    });
  }

  /**
   * GET /api/problems/:code
   */
  @Get(':code')
  async getProblemByCode(@Param('code') code: string) {
    const problem = await this.problemService.getProblemByCode(code);
    return {
      statusCode: 200,
      data: problem,
    };
  }

  /**
   * GET /api/problems/:code/analytics
   */
  @Get(':code/analytics')
  async getAnalytics(@Param('code') code: string) {
    return this.problemService.getAnalytics(code);
  }

  /**
   * POST /api/problems/:code/subtasks
   */
  @Post(':code/subtasks')
  async createSubtask(
    @Param('code') code: string,
    @Body() data: { label: string; description?: string; score: number; sortOrder: number; testCaseIds?: string[] }
  ) {
    return this.problemService.createSubtask(code, data);
  }

  /**
   * PUT /api/problems/:code/subtasks/:subtaskId
   */
  @Put(':code/subtasks/:subtaskId')
  async updateSubtask(
    @Param('code') code: string,
    @Param('subtaskId') subtaskId: string,
    @Body() data: { label?: string; description?: string; score?: number; sortOrder?: number; testCaseIds?: string[] }
  ) {
    return this.problemService.updateSubtask(subtaskId, data);
  }

  /**
   * DELETE /api/problems/:code/subtasks/:subtaskId
   */
  @Delete(':code/subtasks/:subtaskId')
  async deleteSubtask(
    @Param('code') code: string,
    @Param('subtaskId') subtaskId: string
  ) {
    return this.problemService.deleteSubtask(subtaskId);
  }

  /**
   * GET /api/problems/:code/pdf
   * Chuyển hướng tới file PDF thật trên Supabase Storage.
   *
   * KHÔNG đoán đường dẫn nữa: ingestion lưu file theo TÊN GỐC
   * (`problems/STRNUM/Đề bài STRNUM.pdf`), nên URL đoán kiểu `strnum.pdf` luôn
   * 404 — client nhận về một trang lỗi XML của Supabase và tưởng PDF hỏng.
   */
  @Get(':code/pdf')
  async getProblemPdf(@Param('code') code: string, @Res() res: any) {
    let pdfUrl: string | null = null;
    try {
      const problem = await this.problemService.getProblemByCode(code);
      pdfUrl = problem.pdfUrl ?? null;
    } catch {
      return res.status(404).json({
        statusCode: 404,
        message: `Không tìm thấy bài tập "${code.toUpperCase()}"`,
      });
    }

    if (!pdfUrl) {
      return res.status(404).json({
        statusCode: 404,
        message: `Bài "${code.toUpperCase()}" chưa có file đề PDF. Hãy nạp lại gói đề (thư mục Doc/*.pdf).`,
      });
    }

    return res.redirect(pdfUrl);
  }
}
