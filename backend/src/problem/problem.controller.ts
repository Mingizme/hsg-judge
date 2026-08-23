// ============================================
// Problem Controller
// REST endpoints cho xem bài tập
// ============================================

import { Controller, Get, Param, Query } from '@nestjs/common';
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
}
