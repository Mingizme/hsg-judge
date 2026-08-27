// ============================================
// Piston API Service (Multi-Engine)
// Hỗ trợ: Judge0 CE (RapidAPI) + Piston (emkc / self-hosted)
//
// Bổ sung so với bản đầu:
// - Rate limiter toàn cục + retry 429/5xx (Piston công khai giới hạn ~5 req/s;
//   chấm 3 test song song trước đây gây RTE/WA giả hàng loạt).
// - Phân loại verdict đúng: SIGSEGV là Runtime Error, KHÔNG phải MLE.
// - Tách lỗi hạ tầng (systemError) khỏi lỗi chương trình học sinh.
// - Ghi rõ nguồn đo thời gian: Judge0 trả CPU time thật, Piston chỉ có
//   wall-clock của lời gọi HTTP (kèm độ trễ mạng).
// ============================================

import { Injectable, Logger } from '@nestjs/common';

// ── Types ─────────────────────────────────────

export type TimeSource = 'cpu' | 'wall';

export interface ExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: string | null;
  compilationError: string | null;
  executionTimeMs: number;
  memoryUsageKb: number | null;
  timedOut: boolean;
  memoryExceeded: boolean;
  /** true khi lỗi đến từ hạ tầng chấm (quota, mạng, 5xx), không phải code HS */
  systemError: boolean;
  /** 'cpu' = thời gian CPU thật (Judge0); 'wall' = ước lượng gồm độ trễ mạng */
  timeSource: TimeSource;
}

// Judge0 API types
interface Judge0Submission {
  source_code: string;
  language_id: number;
  stdin: string;
  cpu_time_limit: number; // seconds
  memory_limit: number; // KB
  expected_output?: string;
}

interface Judge0Result {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  time: string | null; // seconds as string
  memory: number | null; // KB
  status: {
    id: number;
    description: string;
  };
}

// Piston API types
interface PistonExecuteRequest {
  language: string;
  version: string;
  files: Array<{ name: string; content: string }>;
  stdin?: string;
  compile_timeout?: number;
  run_timeout?: number;
  compile_memory_limit?: number;
  run_memory_limit?: number;
}

interface PistonExecuteResponse {
  language: string;
  version: string;
  run: {
    stdout: string;
    stderr: string;
    code: number | null;
    signal: string | null;
    output: string;
  };
  compile?: {
    stdout: string;
    stderr: string;
    code: number | null;
    signal: string | null;
    output: string;
  };
}

// ── Judge0 Status Codes ───────────────────────

const JUDGE0_STATUS = {
  IN_QUEUE: 1,
  PROCESSING: 2,
  ACCEPTED: 3,
  WRONG_ANSWER: 4,
  TIME_LIMIT: 5,
  COMPILATION_ERROR: 6,
  RUNTIME_ERROR_SIGSEGV: 7,
  RUNTIME_ERROR_SIGXFSZ: 8,
  RUNTIME_ERROR_SIGFPE: 9,
  RUNTIME_ERROR_SIGABRT: 10,
  RUNTIME_ERROR_NZEC: 11,
  RUNTIME_ERROR_OTHER: 12,
  INTERNAL_ERROR: 13,
  EXEC_FORMAT_ERROR: 14,
} as const;

// C++17 language ID in Judge0
const CPP17_LANGUAGE_ID = 54;

/**
 * Dấu hiệu tràn bộ nhớ THẬT trong stderr.
 * SIGSEGV bị loại khỏi danh sách này: truy cập mảng ngoài biên (lỗi phổ biến
 * nhất của học sinh) cũng sinh SIGSEGV và phải báo RTE để các em biết sửa,
 * chứ không phải MLE.
 */
const MEMORY_ERROR_PATTERNS = [
  'std::bad_alloc',
  'bad_alloc',
  'out of memory',
  'cannot allocate memory',
  'memory limit',
  'killed (out of memory)',
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Injectable()
export class PistonService {
  private readonly logger = new Logger(PistonService.name);
  private readonly engine: 'judge0' | 'piston';
  private readonly judge0Url: string;
  private readonly judge0Key: string;
  private readonly pistonUrl: string;

  // ── Rate limiting state ───────────────────────
  /** Khoảng cách tối thiểu giữa 2 request rời máy (ms) */
  private readonly minRequestGapMs: number;
  /** Chuỗi tuần tự hoá việc "lấy vé" gửi request */
  private gate: Promise<void> = Promise.resolve();
  private lastRequestAt = 0;

  private static readonly MAX_RETRIES = 3;

  constructor() {
    this.judge0Url =
      process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com';
    this.judge0Key = process.env.JUDGE0_API_KEY || '';
    this.pistonUrl =
      process.env.JUDGE_API_URL || 'https://emkc.org/api/v2/piston';

    if (this.judge0Key) {
      this.engine = 'judge0';
      this.logger.log('🔧 Judge engine: Judge0 CE (RapidAPI)');
    } else {
      this.engine = 'piston';
      this.logger.log(
        '🔧 Judge engine: Piston (set JUDGE0_API_KEY để dùng Judge0)',
      );
    }

    // Piston public (emkc) giới hạn ~5 request/giây → mặc định giãn 220ms.
    const defaultGap = this.engine === 'piston' ? 220 : 120;
    const configured = parseInt(
      process.env.JUDGE_MIN_REQUEST_GAP_MS || '',
      10,
    );
    this.minRequestGapMs = Number.isFinite(configured)
      ? Math.max(0, configured)
      : defaultGap;

    this.logger.log(
      `⏱️  Rate limit: tối thiểu ${this.minRequestGapMs}ms giữa 2 request chấm`,
    );
  }

  /** Engine đang dùng — cho endpoint health/UI hiển thị đúng sự thật */
  getEngineInfo(): { engine: 'judge0' | 'piston'; apiUrl: string; timeSource: TimeSource } {
    return {
      engine: this.engine,
      apiUrl: this.engine === 'judge0' ? this.judge0Url : this.pistonUrl,
      timeSource: this.engine === 'judge0' ? 'cpu' : 'wall',
    };
  }

  // ── Rate limiter ────────────────────────────

  /**
   * Giãn thời điểm BẮT ĐẦU của các request để không vượt quota API,
   * nhưng vẫn cho phép nhiều request chạy đồng thời (giữ tốc độ chấm).
   */
  private async acquireSlot(): Promise<void> {
    const ticket = this.gate.then(async () => {
      const wait = Math.max(
        0,
        this.lastRequestAt + this.minRequestGapMs - Date.now(),
      );
      if (wait > 0) await sleep(wait);
      this.lastRequestAt = Date.now();
    });
    this.gate = ticket.catch(() => undefined);
    await ticket;
  }

  /**
   * Gọi API kèm rate limit + retry cho 429 / 5xx / lỗi mạng.
   * Trả về `null` nếu hết số lần thử.
   */
  private async fetchWithRetry(
    url: string,
    init: RequestInit,
    label: string,
  ): Promise<{ response: Response } | { error: string }> {
    let lastError = 'Unknown error';

    for (let attempt = 0; attempt <= PistonService.MAX_RETRIES; attempt++) {
      await this.acquireSlot();

      try {
        const response = await fetch(url, init);

        // Quá tải / vượt quota → chờ rồi thử lại
        if (response.status === 429 || response.status >= 500) {
          const retryAfterHeader = response.headers.get('retry-after');
          const retryAfterMs = retryAfterHeader
            ? Math.min(10_000, parseFloat(retryAfterHeader) * 1000)
            : 0;
          const backoff =
            retryAfterMs ||
            Math.min(4_000, 400 * Math.pow(2, attempt)) +
              Math.floor(Math.random() * 200);

          lastError = `${label} HTTP ${response.status}`;

          if (attempt < PistonService.MAX_RETRIES) {
            this.logger.warn(
              `⚠️  ${lastError} — thử lại sau ${backoff}ms (lần ${attempt + 1}/${PistonService.MAX_RETRIES})`,
            );
            await sleep(backoff);
            continue;
          }
          return { error: lastError };
        }

        return { response };
      } catch (error) {
        lastError =
          error instanceof Error ? error.message : 'Network error';
        if (attempt < PistonService.MAX_RETRIES) {
          const backoff = Math.min(4_000, 400 * Math.pow(2, attempt));
          this.logger.warn(
            `⚠️  ${label} lỗi mạng: ${lastError} — thử lại sau ${backoff}ms`,
          );
          await sleep(backoff);
          continue;
        }
      }
    }

    return { error: lastError };
  }

  // ── Execute C++ Code ────────────────────────

  async execute(
    sourceCode: string,
    stdin: string,
    timeLimitMs: number = 1000,
    memoryLimitMb: number = 256,
  ): Promise<ExecutionResult> {
    if (this.engine === 'judge0') {
      return this.executeJudge0(
        sourceCode,
        stdin,
        timeLimitMs,
        memoryLimitMb,
      );
    }
    return this.executePiston(sourceCode, stdin, timeLimitMs, memoryLimitMb);
  }

  // ── Judge0 CE Implementation ────────────────

  private async executeJudge0(
    sourceCode: string,
    stdin: string,
    timeLimitMs: number,
    memoryLimitMb: number,
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    const submission: Judge0Submission = {
      source_code: this.base64Encode(sourceCode),
      language_id: CPP17_LANGUAGE_ID,
      stdin: this.base64Encode(stdin),
      cpu_time_limit: timeLimitMs / 1000, // ms → seconds
      memory_limit: memoryLimitMb * 1024, // MB → KB
    };

    const attempt = await this.fetchWithRetry(
      `${this.judge0Url}/submissions?base64_encoded=true&wait=true&fields=*`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': this.judge0Key,
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
        },
        body: JSON.stringify(submission),
      },
      'Judge0',
    );

    if ('error' in attempt) {
      return this.makeErrorResult(attempt.error, startTime, 'cpu');
    }

    const submitResponse = attempt.response;

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text().catch(() => '');
      this.logger.error(
        `Judge0 API error ${submitResponse.status}: ${errorText.slice(0, 300)}`,
      );
      return this.makeErrorResult(
        `Judge0 API error: ${submitResponse.status}`,
        startTime,
        'cpu',
      );
    }

    try {
      const result: Judge0Result = await submitResponse.json();

      const stdout = this.base64Decode(result.stdout);
      const stderr = this.base64Decode(result.stderr);
      const compileOutput = this.base64Decode(result.compile_output);

      // Judge0 trả CPU time thật → đo chính xác, không lẫn độ trễ mạng
      const executionTimeMs = result.time
        ? Math.round(parseFloat(result.time) * 1000)
        : Date.now() - startTime;

      const statusId = result.status?.id;

      // Compilation Error
      if (statusId === JUDGE0_STATUS.COMPILATION_ERROR) {
        return {
          success: false,
          stdout: '',
          stderr: compileOutput || stderr,
          exitCode: null,
          signal: null,
          compilationError: compileOutput || 'Compilation failed',
          executionTimeMs,
          memoryUsageKb: result.memory,
          timedOut: false,
          memoryExceeded: false,
          systemError: false,
          timeSource: 'cpu',
        };
      }

      // Time Limit Exceeded
      if (statusId === JUDGE0_STATUS.TIME_LIMIT) {
        return {
          success: false,
          stdout: stdout.substring(0, 500),
          stderr,
          exitCode: null,
          signal: 'SIGKILL',
          compilationError: null,
          executionTimeMs,
          memoryUsageKb: result.memory,
          timedOut: true,
          memoryExceeded: false,
          systemError: false,
          timeSource: 'cpu',
        };
      }

      // Runtime Errors (7..12)
      if (statusId >= 7 && statusId <= 12) {
        const combined = `${stderr}\n${result.message || ''}`;
        return {
          success: false,
          stdout: stdout.substring(0, 500),
          stderr: stderr || result.message || 'Runtime Error',
          exitCode: 1,
          signal:
            statusId === JUDGE0_STATUS.RUNTIME_ERROR_SIGSEGV
              ? 'SIGSEGV'
              : 'SIGABRT',
          compilationError: null,
          executionTimeMs,
          memoryUsageKb: result.memory,
          timedOut: false,
          // Chỉ báo MLE khi có bằng chứng tràn bộ nhớ, hoặc dùng vượt hạn mức.
          // SIGSEGV thuần → RTE (thường do truy cập ngoài biên mảng).
          memoryExceeded:
            this.looksLikeMemoryError(combined) ||
            (result.memory != null && result.memory > memoryLimitMb * 1024),
          systemError: false,
          timeSource: 'cpu',
        };
      }

      // Chạy xong bình thường (Judge0 tự so output nhưng ta dùng checker riêng)
      if (
        statusId === JUDGE0_STATUS.ACCEPTED ||
        statusId === JUDGE0_STATUS.WRONG_ANSWER
      ) {
        return {
          success: true,
          stdout,
          stderr,
          exitCode: 0,
          signal: null,
          compilationError: null,
          executionTimeMs,
          memoryUsageKb: result.memory,
          timedOut: false,
          memoryExceeded: false,
          systemError: false,
          timeSource: 'cpu',
        };
      }

      // System/Internal Error
      return this.makeErrorResult(
        result.message || `Judge0 status: ${result.status?.description}`,
        startTime,
        'cpu',
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Judge0 execution failed: ${message}`);
      return this.makeErrorResult(message, startTime, 'cpu');
    }
  }

  // ── Piston Implementation ──────────────────

  private async executePiston(
    sourceCode: string,
    stdin: string,
    timeLimitMs: number,
    memoryLimitMb: number,
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    const request: PistonExecuteRequest = {
      language: 'c++',
      version: '10.2.0',
      files: [{ name: 'solution.cpp', content: sourceCode }],
      stdin,
      compile_timeout: 10000,
      // Trước đây cộng thêm 500ms "ân hạn" khiến bài vượt giới hạn vẫn đậu.
      // Chỉ chừa 100ms cho chi phí khởi tạo tiến trình của sandbox.
      run_timeout: timeLimitMs + 100,
      compile_memory_limit: -1,
      run_memory_limit: memoryLimitMb * 1024 * 1024,
    };

    const attempt = await this.fetchWithRetry(
      `${this.pistonUrl}/execute`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      },
      'Piston',
    );

    if ('error' in attempt) {
      return this.makeErrorResult(attempt.error, startTime, 'wall');
    }

    const response = attempt.response;

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      this.logger.error(
        `Piston API error ${response.status}: ${errorText.slice(0, 300)}`,
      );
      return this.makeErrorResult(
        `Piston API error: ${response.status}`,
        startTime,
        'wall',
      );
    }

    try {
      const result: PistonExecuteResponse = await response.json();

      // Piston KHÔNG trả CPU time. Đây là wall-clock của lời gọi HTTP nên đã
      // gồm cả độ trễ mạng — chỉ dùng để tham khảo, không dùng để phán TLE.
      const executionTimeMs = Date.now() - startTime;

      // Compilation Error
      if (result.compile && result.compile.code !== 0) {
        return {
          success: false,
          stdout: '',
          stderr: result.compile.stderr || result.compile.output,
          exitCode: result.compile.code,
          signal: result.compile.signal,
          compilationError:
            result.compile.stderr ||
            result.compile.output ||
            'Compilation failed',
          executionTimeMs,
          memoryUsageKb: null,
          timedOut: false,
          memoryExceeded: false,
          systemError: false,
          timeSource: 'wall',
        };
      }

      const runStderr = result.run.stderr || '';
      const signal = result.run.signal;

      // Piston kill tiến trình quá hạn bằng SIGKILL
      const timedOut =
        signal === 'SIGKILL' ||
        /timed?\s*out/i.test(runStderr) ||
        signal === 'SIGXCPU';

      // SIGSEGV KHÔNG còn bị coi là MLE — chỉ nhận diện qua thông điệp lỗi
      const memoryExceeded =
        !timedOut && this.looksLikeMemoryError(runStderr);

      const runtimeError =
        !timedOut &&
        !memoryExceeded &&
        result.run.code !== 0 &&
        result.run.code !== null;

      return {
        success: !timedOut && !memoryExceeded && !runtimeError,
        stdout: result.run.stdout || '',
        stderr: runStderr,
        exitCode: result.run.code,
        signal,
        compilationError: null,
        executionTimeMs,
        memoryUsageKb: null,
        timedOut,
        memoryExceeded,
        systemError: false,
        timeSource: 'wall',
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Piston execution failed: ${message}`);
      return this.makeErrorResult(message, startTime, 'wall');
    }
  }

  // ── Health Check ────────────────────────────

  async healthCheck(): Promise<{
    available: boolean;
    engine: string;
    apiUrl: string;
    timeSource: TimeSource;
    details?: string;
  }> {
    const info = this.getEngineInfo();
    try {
      if (this.engine === 'judge0') {
        const response = await fetch(`${this.judge0Url}/statuses`, {
          headers: {
            'X-RapidAPI-Key': this.judge0Key,
            'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
          },
        });
        return { ...info, available: response.ok };
      }

      const response = await fetch(`${this.pistonUrl}/runtimes`);
      return { ...info, available: response.ok };
    } catch (error) {
      return {
        ...info,
        available: false,
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ── Helpers ─────────────────────────────────

  private looksLikeMemoryError(text: string): boolean {
    if (!text) return false;
    const lower = text.toLowerCase();
    return MEMORY_ERROR_PATTERNS.some((p) => lower.includes(p));
  }

  private base64Encode(str: string | null): string {
    if (!str) return '';
    return Buffer.from(str, 'utf-8').toString('base64');
  }

  private base64Decode(str: string | null): string {
    if (!str) return '';
    try {
      return Buffer.from(str, 'base64').toString('utf-8');
    } catch {
      return str; // Not base64 encoded
    }
  }

  private makeErrorResult(
    message: string,
    startTime: number,
    timeSource: TimeSource,
  ): ExecutionResult {
    return {
      success: false,
      stdout: '',
      stderr: `System error: ${message}`,
      exitCode: null,
      signal: null,
      compilationError: null,
      executionTimeMs: Date.now() - startTime,
      memoryUsageKb: null,
      timedOut: false,
      memoryExceeded: false,
      // Đánh dấu là lỗi hạ tầng → judge worker báo SE thay vì RTE oan cho HS
      systemError: true,
      timeSource,
    };
  }
}
