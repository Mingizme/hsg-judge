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
   */
  @Get()
  async getProblems(
    @Query('difficulty') difficulty?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.problemService.getProblems({
      difficulty,
      category,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
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
   * Chuyển hướng trực tiếp tới file PDF trên Supabase Storage
   */
  @Get(':code/pdf')
  async getProblemPdf(@Param('code') code: string, @Res() res: any) {
    try {
      const problem = await this.problemService.getProblemByCode(code);
      if (problem.pdfUrl) {
        return res.redirect(problem.pdfUrl);
      }
    } catch {
      // Fallback below
    }

    const supabaseUrl = process.env.SUPABASE_URL || 'https://ekjqhmosasziofldicwb.supabase.co';
    const directPdfUrl = `${supabaseUrl}/storage/v1/object/public/problem-pdfs/problems/${code.toUpperCase()}/${code.toLowerCase()}.pdf`;
    return res.redirect(directPdfUrl);
  }
}
