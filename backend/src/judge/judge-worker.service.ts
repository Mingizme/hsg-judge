// ============================================
// Judge Worker Service
// Chấm code C++ cho từng test case
// Phối hợp: Piston API + File I/O Handler + Diff Checker
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { Verdict } from '@prisma/client';
import { PistonService, ExecutionResult } from './piston.service';
import { prepareCodeForExecution } from './file-io-handler.util';
import { compareOutputs, DiffResult } from './diff-checker.util';

// ── Types ─────────────────────────────────────

export interface TestCaseInput {
  testCaseId: string;
  testNumber: number;
  inputData: string;
  expectedOutput: string;
}

export interface JudgeTestResult {
  testCaseId: string;
  testNumber: number;
  verdict: Verdict;
  executionTimeMs: number;
  memoryUsageKb: number | null;
  actualOutput: string;
  errorMessage: string | null;
  diff: DiffResult | null;
}

export interface CompileCheckResult {
  success: boolean;
  error: string | null;
}

export interface JudgeConfig {
  timeLimitMs: number;
  memoryLimitMb: number;
  ioType: 'FILE' | 'STANDARD';
}

@Injectable()
export class JudgeWorkerService {
  private readonly logger = new Logger(JudgeWorkerService.name);

  constructor(private readonly piston: PistonService) {}

  // ── Compile Check (CE detection) ────────────

  /**
   * Kiểm tra compile trước khi chạy test cases.
   * Chạy với empty input, chỉ quan tâm CE hay không.
   */
  async compileCheck(
    sourceCode: string,
    config: JudgeConfig,
  ): Promise<CompileCheckResult> {
    const prepared = prepareCodeForExecution(sourceCode, config.ioType);

    const result = await this.piston.execute(
      prepared,
      '',                                  // Empty stdin
      5000,                                // 5s timeout cho compile check
      config.memoryLimitMb,
    );

    if (result.compilationError) {
      return {
        success: false,
        error: result.compilationError,
      };
    }

    return { success: true, error: null };
  }

  // ── Judge Single Test Case ──────────────────

  /**
   * Chấm code trên 1 test case:
   * 1. Transform code (File I/O → stdin/stdout)
   * 2. Execute via Piston
   * 3. Compare output via Diff Checker
   * 4. Return verdict
   */
  async judgeTestCase(
    sourceCode: string,
    testCase: TestCaseInput,
    config: JudgeConfig,
  ): Promise<JudgeTestResult> {
    const prepared = prepareCodeForExecution(sourceCode, config.ioType);

    // ── Execute ───────────────────────────────

    const execResult = await this.piston.execute(
      prepared,
      testCase.inputData,
      config.timeLimitMs,
      config.memoryLimitMb,
    );

    // ── Determine Verdict ─────────────────────

    return this.evaluateResult(execResult, testCase, config);
  }

  // ── Judge All Test Cases (Sequential) ───────

  /**
   * Chấm code trên toàn bộ test cases, tuần tự.
   * Trả về kết quả từng test qua callback (cho SSE streaming).
   *
   * @param sourceCode - Code C++ của học sinh
   * @param testCases - Danh sách test cases
   * @param config - Cấu hình chấm (TL, ML, IO type)
   * @param onTestResult - Callback khi có kết quả 1 test (cho SSE)
   */
  async judgeAllTests(
    sourceCode: string,
    testCases: TestCaseInput[],
    config: JudgeConfig,
    onTestResult?: (result: JudgeTestResult) => void,
  ): Promise<JudgeTestResult[]> {
    const results: JudgeTestResult[] = [];

    // ── Compile check trước ───────────────────

    const compileCheck = await this.compileCheck(sourceCode, config);

    if (!compileCheck.success) {
      // CE → tất cả test đều CE
      this.logger.warn(`   ❌ Compilation Error`);

      for (const tc of testCases) {
        const ceResult: JudgeTestResult = {
          testCaseId: tc.testCaseId,
          testNumber: tc.testNumber,
          verdict: Verdict.CE,
          executionTimeMs: 0,
          memoryUsageKb: null,
          actualOutput: '',
          errorMessage: compileCheck.error,
          diff: null,
        };
        results.push(ceResult);
        onTestResult?.(ceResult);
      }

      return results;
    }

    this.logger.log(`   ✅ Compilation OK`);

    // ── Chạy từng test case ───────────────────

    for (const tc of testCases) {
      this.logger.log(
        `   🧪 Judging Test ${String(tc.testNumber).padStart(2, '0')}...`,
      );

      const result = await this.judgeTestCase(sourceCode, tc, config);
      results.push(result);

      // Emit result cho SSE stream
      onTestResult?.(result);

      const icon = result.verdict === Verdict.AC ? '✅' : '❌';
      this.logger.log(
        `   ${icon} Test ${String(tc.testNumber).padStart(2, '0')}: ${result.verdict} (${result.executionTimeMs}ms)`,
      );
    }

    return results;
  }

  // ── Private: Evaluate Execution Result ──────

  private evaluateResult(
    execResult: ExecutionResult,
    testCase: TestCaseInput,
    config: JudgeConfig,
  ): JudgeTestResult {
    const baseResult = {
      testCaseId: testCase.testCaseId,
      testNumber: testCase.testNumber,
      executionTimeMs: execResult.executionTimeMs,
      memoryUsageKb: execResult.memoryUsageKb ?? null,
    };

    // ── Compilation Error ─────────────────────

    if (execResult.compilationError) {
      return {
        ...baseResult,
        verdict: Verdict.CE,
        actualOutput: '',
        errorMessage: execResult.compilationError,
        diff: null,
      };
    }

    // ── Time Limit Exceeded ───────────────────

    if (execResult.timedOut) {
      return {
        ...baseResult,
        verdict: Verdict.TLE,
        actualOutput: execResult.stdout.substring(0, 500),
        errorMessage: `Time Limit Exceeded (limit: ${config.timeLimitMs}ms)`,
        diff: null,
      };
    }

    // ── Memory Limit Exceeded ─────────────────

    if (execResult.memoryExceeded) {
      return {
        ...baseResult,
        verdict: Verdict.MLE,
        actualOutput: '',
        errorMessage: `Memory Limit Exceeded (limit: ${config.memoryLimitMb}MB)`,
        diff: null,
      };
    }

    // ── Runtime Error ─────────────────────────

    if (!execResult.success) {
      return {
        ...baseResult,
        verdict: Verdict.RTE,
        actualOutput: execResult.stdout.substring(0, 500),
        errorMessage:
          execResult.stderr?.substring(0, 1000) ||
          `Runtime Error (exit code: ${execResult.exitCode}, signal: ${execResult.signal})`,
        diff: null,
      };
    }

    // ── Compare Output ────────────────────────

    const diff = compareOutputs(
      testCase.expectedOutput,
      execResult.stdout,
    );

    if (diff.isMatch) {
      return {
        ...baseResult,
        verdict: Verdict.AC,
        actualOutput: execResult.stdout.substring(0, 2000),
        errorMessage: null,
        diff,
      };
    } else {
      return {
        ...baseResult,
        verdict: Verdict.WA,
        actualOutput: execResult.stdout.substring(0, 2000),
        errorMessage: diff.details,
        diff,
      };
    }
  }

  // ── Run Custom Input (không chấm) ───────────

  /**
   * Chạy code với input tùy chỉnh từ học sinh (Run button).
   * Chỉ trả về output, không so sánh.
   */
  async runCustom(
    sourceCode: string,
    customInput: string,
    config: JudgeConfig,
  ): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number | null;
    executionTimeMs: number;
    compilationError: string | null;
  }> {
    const prepared = prepareCodeForExecution(sourceCode, config.ioType);

    const result = await this.piston.execute(
      prepared,
      customInput,
      config.timeLimitMs,
      config.memoryLimitMb,
    );

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      executionTimeMs: result.executionTimeMs,
      compilationError: result.compilationError,
    };
  }
}
