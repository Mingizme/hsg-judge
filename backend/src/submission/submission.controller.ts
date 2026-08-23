// ============================================
// Submission Controller
// REST API + Server-Sent Events (SSE) streaming
// ============================================

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Sse,
  HttpCode,
  HttpStatus,
  NotFoundException,
  MessageEvent,
  Header,
} from '@nestjs/common';
import { Observable, map, finalize, EMPTY } from 'rxjs';
import { SubmissionService, SSEEvent } from './submission.service';
import { SubmitCodeDto, RunCustomDto } from './dto/submit-code.dto';

@Controller('submissions')
export class SubmissionController {
  constructor(private readonly submissionService: SubmissionService) {}

  // ── POST /api/submissions/submit ────────────

  /**
   * Nộp bài chấm full test cases.
   * Trả về submissionId, client dùng ID này
   * để subscribe SSE stream.
   *
   * Flow:
   *   1. Client POST submit → nhận submissionId
   *   2. Client mở SSE: GET /submissions/:id/stream
   *   3. Server stream kết quả từng test realtime
   */
  @Post('submit')
  @HttpCode(HttpStatus.CREATED)
  async submit(@Body() dto: SubmitCodeDto) {
    // TODO: Lấy userId từ JWT token (Supabase Auth)
    // Tạm dùng demo user ID
    const userId = 'demo-student-id';

    const submissionId = await this.submissionService.submitAndJudge(
      userId,
      dto.problemCode,
      dto.sourceCode,
      dto.language || 'cpp',
    );

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Submission created, judging started',
      data: {
        submissionId,
        streamUrl: `/api/submissions/${submissionId}/stream`,
      },
    };
  }

  // ── GET /api/submissions/:id/stream (SSE) ───

  /**
   * Server-Sent Events endpoint.
   * Stream kết quả chấm từng test case theo thời gian thực.
   *
   * Event types:
   *   - compile: { status: 'compiling', totalTests: N }
   *   - test-result: { testNumber, verdict, executionTimeMs, ... }
   *   - complete: { verdict, score, maxScore, passedTests, ... }
   *   - error: { message }
   *
   * Client example:
   * ```javascript
   * const es = new EventSource('/api/submissions/xxx/stream');
   * es.addEventListener('test-result', (e) => {
   *   const data = JSON.parse(e.data);
   *   console.log(`Test ${data.testNumber}: ${data.verdict}`);
   * });
   * es.addEventListener('complete', (e) => {
   *   const data = JSON.parse(e.data);
   *   console.log(`Final: ${data.verdict} ${data.score}/${data.maxScore}`);
   *   es.close();
   * });
   * ```
   */
  @Get(':id/stream')
  @Header('Content-Type', 'text/event-stream')
  @Header('Cache-Control', 'no-cache')
  @Header('Connection', 'keep-alive')
  @Header('X-Accel-Buffering', 'no')
  @Sse()
  streamResults(
    @Param('id') submissionId: string,
  ): Observable<MessageEvent> {
    const sseStream =
      this.submissionService.getSSEStream(submissionId);

    if (!sseStream) {
      // Submission đã chấm xong hoặc không tồn tại
      // Trả về empty stream
      return new Observable<MessageEvent>((subscriber) => {
        subscriber.next({
          type: 'error',
          data: JSON.stringify({
            message:
              'Stream not available. Submission may have already completed.',
            submissionId,
          }),
        } as MessageEvent);
        subscriber.complete();
      });
    }

    return sseStream.pipe(
      map((event: SSEEvent): MessageEvent => {
        return {
          type: event.type,
          data: JSON.stringify(event.data),
        } as MessageEvent;
      }),
      finalize(() => {
        // Cleanup khi client ngắt kết nối
      }),
    );
  }

  // ── POST /api/submissions/run ───────────────

  /**
   * Chạy code với input tùy chỉnh (nút Run).
   * Không lưu submission, chỉ trả về output.
   */
  @Post('run')
  @HttpCode(HttpStatus.OK)
  async runCustom(@Body() dto: RunCustomDto) {
    const result = await this.submissionService.runCustomInput(
      dto.problemCode,
      dto.sourceCode,
      dto.customInput,
    );

    return {
      statusCode: HttpStatus.OK,
      data: {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        executionTimeMs: result.executionTimeMs,
        compilationError: result.compilationError,
      },
    };
  }

  // ── GET /api/submissions/:id ────────────────

  /**
   * Lấy chi tiết kết quả submission (sau khi chấm xong).
   */
  @Get(':id')
  async getSubmission(@Param('id') submissionId: string) {
    const submission =
      await this.submissionService.getSubmission(submissionId);

    return {
      statusCode: HttpStatus.OK,
      data: submission,
    };
  }

  // ── GET /api/submissions/history ────────────

  /**
   * Lấy lịch sử nộp bài của user hiện tại.
   * Query params: ?problemCode=STRNUM&page=1&limit=20
   */
  @Get()
  async getHistory(
    @Query('problemCode') problemCode?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // TODO: Lấy userId từ JWT token
    const userId = 'demo-student-id';

    const result = await this.submissionService.getSubmissionsByUser(
      userId,
      problemCode,
      parseInt(page || '1', 10),
      parseInt(limit || '20', 10),
    );

    return {
      statusCode: HttpStatus.OK,
      data: result,
    };
  }
}
