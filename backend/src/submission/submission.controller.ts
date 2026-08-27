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
import { Observable, map } from 'rxjs';
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
    const userId = dto.userId || 'student@hsgjudge.local';

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
    const sseStream = this.submissionService.getSSEStream(submissionId);

    if (!sseStream) {
      // Stream đã bị dọn (client kết nối rất muộn / server vừa restart).
      // Thay vì chỉ báo lỗi rồi để UI treo, đọc kết quả đã lưu trong DB và
      // phát lại đúng một event `complete` để giao diện chốt được trạng thái.
      return new Observable<MessageEvent>((subscriber) => {
        this.submissionService
          .getSubmission(submissionId)
          .then((submission) => {
            subscriber.next({
              type: 'complete',
              data: JSON.stringify({
                submissionId: submission.submissionId,
                verdict: submission.verdict,
                score: submission.score ?? 0,
                maxScore: submission.maxScore,
                totalTests: submission.totalTests,
                passedTests: submission.passedTests,
                executionTimeMs: submission.executionTimeMs ?? 0,
                replayedFromDatabase: true,
              }),
            } as MessageEvent);
            subscriber.complete();
          })
          .catch(() => {
            subscriber.next({
              type: 'error',
              data: JSON.stringify({
                submissionId,
                message:
                  'Không tìm thấy phiên chấm bài này. Hãy tải lại lịch sử nộp bài.',
              }),
            } as MessageEvent);
            subscriber.complete();
          });
      });
    }

    return sseStream.pipe(
      map(
        (event: SSEEvent): MessageEvent =>
          ({
            type: event.type,
            data: JSON.stringify(event.data),
          }) as MessageEvent,
      ),
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
    @Query('userId') userId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // Chặn giá trị bất thường: NaN, số âm, hoặc limit khổng lồ làm sập DB
    const parsedPage = Math.max(1, parseInt(page || '1', 10) || 1);
    const parsedLimit = Math.min(
      100,
      Math.max(1, parseInt(limit || '20', 10) || 20),
    );

    const result = await this.submissionService.getSubmissionsByUser(
      userId,
      problemCode,
      parsedPage,
      parsedLimit,
    );

    return {
      statusCode: HttpStatus.OK,
      data: result,
    };
  }
}
