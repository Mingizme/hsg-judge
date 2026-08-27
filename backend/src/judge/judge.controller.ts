// ============================================
// Judge Controller
// Công khai trạng thái máy chấm để UI hiển thị đúng sự thật
// (trang chủ trước đây ghi cứng "Judge0 CE" dù đang chạy Piston).
// ============================================

import { Controller, Get, HttpStatus } from '@nestjs/common';
import { PistonService } from './piston.service';

@Controller('judge')
export class JudgeController {
  constructor(private readonly piston: PistonService) {}

  /**
   * GET /api/judge/health
   *
   * `engine`     — judge0 | piston
   * `timeSource` — 'cpu' (Judge0 trả CPU time thật) hoặc 'wall'
   *                (Piston chỉ có wall-clock kèm độ trễ mạng → thời gian
   *                hiển thị chỉ mang tính tham khảo).
   */
  @Get('health')
  async health() {
    const status = await this.piston.healthCheck();

    return {
      statusCode: HttpStatus.OK,
      data: {
        ...status,
        engineLabel:
          status.engine === 'judge0' ? 'Judge0 CE' : 'Piston (emkc)',
        timeAccuracy:
          status.timeSource === 'cpu'
            ? 'Thời gian CPU chính xác'
            : 'Thời gian ước lượng (gồm độ trễ mạng)',
      },
    };
  }
}
