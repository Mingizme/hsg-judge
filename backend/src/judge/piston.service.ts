// ============================================
// Piston API Service (Multi-Engine)
// Hỗ trợ: Judge0 CE (RapidAPI) + Piston (self-hosted)
// ============================================

import { Injectable, Logger } from '@nestjs/common';

// ── Types ─────────────────────────────────────

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
}

// Judge0 API types
interface Judge0Submission {
  source_code: string;
  language_id: number;
  stdin: string;
  cpu_time_limit: number;     // seconds
  memory_limit: number;        // KB
  expected_output?: string;
}

interface Judge0Result {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  time: string | null;          // seconds as string
  memory: number | null;        // KB
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

@Injectable()
export class PistonService {
  private readonly logger = new Logger(PistonService.name);
  private readonly engine: 'judge0' | 'piston';
  private readonly judge0Url: string;
  private readonly judge0Key: string;
  private readonly pistonUrl: string;

  constructor() {
    // Prefer Judge0 if configured, fallback to Piston
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
        '🔧 Judge engine: Piston (set JUDGE0_API_KEY for Judge0)',
      );
    }
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
    return this.executePiston(
      sourceCode,
      stdin,
      timeLimitMs,
      memoryLimitMb,
    );
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
      cpu_time_limit: timeLimitMs / 1000,        // ms → seconds
      memory_limit: memoryLimitMb * 1024,        // MB → KB
    };

    try {
      // ── Submit code ─────────────────────────

      const submitResponse = await fetch(
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
      );

      if (!submitResponse.ok) {
        const errorText = await submitResponse.text();
        this.logger.error(
          `Judge0 API error ${submitResponse.status}: ${errorText}`,
        );
        return this.makeErrorResult(
          `Judge0 API error: ${submitResponse.status}`,
          startTime,
        );
      }

      const result: Judge0Result = await submitResponse.json();

      // Decode base64 outputs
      const stdout = this.base64Decode(result.stdout);
      const stderr = this.base64Decode(result.stderr);
      const compileOutput = this.base64Decode(result.compile_output);
      const executionTimeMs = result.time
        ? Math.round(parseFloat(result.time) * 1000)
        : Date.now() - startTime;

      // ── Map Judge0 status to ExecutionResult ─

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
        };
      }

      // Runtime Errors
      if (statusId >= 7 && statusId <= 12) {
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
          memoryExceeded:
            statusId === JUDGE0_STATUS.RUNTIME_ERROR_SIGSEGV,
        };
      }

      // Accepted (or any successful execution)
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
        };
      }

      // System/Internal Error
      return this.makeErrorResult(
        result.message || `Judge0 status: ${result.status?.description}`,
        startTime,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Judge0 execution failed: ${message}`);
      return this.makeErrorResult(message, startTime);
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
      run_timeout: timeLimitMs + 500,
      compile_memory_limit: -1,
      run_memory_limit: memoryLimitMb * 1024 * 1024,
    };

    try {
      const response = await fetch(`${this.pistonUrl}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Piston API error ${response.status}: ${errorText}`,
        );
        return this.makeErrorResult(
          `Piston API error: ${response.status}`,
          startTime,
        );
      }

      const result: PistonExecuteResponse = await response.json();
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
            result.compile.stderr || result.compile.output || 'Compilation failed',
          executionTimeMs,
          memoryUsageKb: null,
          timedOut: false,
          memoryExceeded: false,
        };
      }

      const timedOut =
        result.run.signal === 'SIGKILL' ||
        result.run.stderr?.includes('timed out');

      const memoryExceeded =
        result.run.signal === 'SIGSEGV' ||
        result.run.stderr?.includes('memory');

      const runtimeError =
        !timedOut &&
        !memoryExceeded &&
        result.run.code !== 0 &&
        result.run.code !== null;

      return {
        success: !timedOut && !memoryExceeded && !runtimeError,
        stdout: result.run.stdout || '',
        stderr: result.run.stderr || '',
        exitCode: result.run.code,
        signal: result.run.signal,
        compilationError: null,
        executionTimeMs,
        memoryUsageKb: null,
        timedOut,
        memoryExceeded,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Piston execution failed: ${message}`);
      return this.makeErrorResult(message, startTime);
    }
  }

  // ── Health Check ────────────────────────────

  async healthCheck(): Promise<{
    available: boolean;
    engine: string;
    apiUrl: string;
    details?: string;
  }> {
    try {
      if (this.engine === 'judge0') {
        const response = await fetch(
          `${this.judge0Url}/statuses`,
          {
            headers: {
              'X-RapidAPI-Key': this.judge0Key,
              'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
            },
          },
        );
        return {
          available: response.ok,
          engine: 'judge0',
          apiUrl: this.judge0Url,
        };
      } else {
        const response = await fetch(`${this.pistonUrl}/runtimes`);
        return {
          available: response.ok,
          engine: 'piston',
          apiUrl: this.pistonUrl,
        };
      }
    } catch (error) {
      return {
        available: false,
        engine: this.engine,
        apiUrl:
          this.engine === 'judge0' ? this.judge0Url : this.pistonUrl,
        details:
          error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ── Helpers ─────────────────────────────────

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
    };
  }
}
