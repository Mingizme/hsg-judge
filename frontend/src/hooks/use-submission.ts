'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useSSE } from './use-sse';
import { useAuth } from '@/contexts/auth-context';
import { API_BASE } from '@/lib/api-config';

export interface TestResult {
  testNumber: number;
  verdict: 'AC' | 'WA' | 'TLE' | 'MLE' | 'RTE' | 'CE' | 'SE' | 'PENDING';
  executionTimeMs?: number;
  memoryUsageKb?: number;
  errorMessage?: string | null;
  diff?: any;
}

/** Thứ tự ưu tiên khi báo verdict tổng: lỗi nghiêm trọng hiện trước */
const VERDICT_PRIORITY: TestResult['verdict'][] = [
  'CE',
  'SE',
  'RTE',
  'MLE',
  'TLE',
  'WA',
];

export function useSubmission() {
  const { user } = useAuth();
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [maxScore, setMaxScore] = useState<number>(100);
  const [totalTests, setTotalTests] = useState<number>(0);
  const [passedTests, setPassedTests] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { events, isConnected, isComplete, latestResult, usedFallback } =
    useSSE(submissionId);

  useEffect(() => {
    if (events.length > 0) {
      // Accumulate individual test results
      const testEvents = events
        .filter((e) => e.type === 'test-result')
        .map((e) => e.data as TestResult);

      if (testEvents.length > 0) {
        setResults((prev) => {
          const map = new Map<number, TestResult>();
          prev.forEach((r) => map.set(r.testNumber, r));
          testEvents.forEach((r) => map.set(r.testNumber, r));
          return Array.from(map.values()).sort((a, b) => a.testNumber - b.testNumber);
        });
      }

      // Tổng số test được server công bố ngay ở event `compile`
      const compileEvent = events.find((e) => e.type === 'compile');
      if (typeof compileEvent?.data?.totalTests === 'number') {
        setTotalTests(compileEvent.data.totalTests);
      }

      const errorEvent = events.find((e) => e.type === 'error');
      if (errorEvent) {
        setErrorMessage(
          errorEvent.data?.message || 'Lỗi hệ thống trong quá trình chấm bài',
        );
        setIsSubmitting(false);
      }

      // Handle final compilation / complete event
      const completeEvent = events.find((e) => e.type === 'complete');
      if (completeEvent) {
        const d = completeEvent.data ?? {};
        setVerdict((d.verdict as string) ?? null);
        setScore(typeof d.score === 'number' ? d.score : 0);
        if (typeof d.maxScore === 'number' && d.maxScore > 0) {
          setMaxScore(d.maxScore);
        }
        if (typeof d.totalTests === 'number') setTotalTests(d.totalTests);
        if (typeof d.passedTests === 'number') setPassedTests(d.passedTests);
        setIsSubmitting(false);

        if (typeof window !== 'undefined') {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('submission-completed'));
          }, 300);
        }
      }
    }

    if (isComplete) {
      setIsSubmitting(false);
    }
  }, [events, isComplete]);

  // ── Dự phòng khi event `complete` bị trễ hoặc mất kết nối ──

  const settled = !isSubmitting || isComplete;

  const effectiveVerdict = useMemo(() => {
    if (verdict) return verdict;
    if (results.length === 0 || !settled) return null;

    // Ưu tiên lỗi nặng nhất, giống thứ tự server dùng khi chốt verdict
    for (const v of VERDICT_PRIORITY) {
      if (results.some((r) => r.verdict === v)) return v;
    }
    return results.every((r) => r.verdict === 'AC') ? 'AC' : 'WA';
  }, [verdict, results, settled]);

  /**
   * Điểm ước lượng khi chưa có event `complete`.
   *
   * Trước đây chia cho `results.length` (số test ĐÃ nhận) và luôn nhân 100 →
   * đang chấm test 3/30 mà pass cả 3 thì hiện "100đ". Nay chia cho tổng số test
   * thật và quy theo `maxScore` của bài. Vẫn chỉ là ước lượng tuyến tính: điểm
   * chính thức (có trọng số subtask) do server trả trong `complete`.
   */
  const effectiveScore = useMemo(() => {
    if (score !== null) return score;
    if (results.length === 0 || !settled) return 0;

    const denominator = totalTests > 0 ? totalTests : results.length;
    const passed = results.filter((r) => r.verdict === 'AC').length;
    return Math.round((passed / denominator) * maxScore * 100) / 100;
  }, [score, results, settled, totalTests, maxScore]);

  const effectivePassedTests = useMemo(
    () =>
      passedTests > 0
        ? passedTests
        : results.filter((r) => r.verdict === 'AC').length,
    [passedTests, results],
  );

  const submitCode = useCallback(async (code: string, problemCode: string) => {
    setIsSubmitting(true);
    setSubmissionId(null);
    setResults([]);
    setVerdict(null);
    setScore(null);
    setPassedTests(0);
    setTotalTests(0);
    setErrorMessage(null);

    try {
      const currentUser = userRef.current;
      const targetUserId = currentUser?.id || currentUser?.email || undefined;

      const response = await fetch(`${API_BASE}/submissions/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemCode,
          sourceCode: code,
          language: 'cpp',
          userId: targetUserId,
        }),
      });

      const resData = await response.json();
      const newSubId = resData.data?.submissionId || resData.submissionId || resData.id;

      if (newSubId) {
        setSubmissionId(newSubId);
      } else {
        throw new Error(resData.message || 'Submission failed');
      }
    } catch (error) {
      console.error('Submit error:', error);
      setErrorMessage(
        error instanceof Error
          ? `Không gửi được bài: ${error.message}`
          : 'Không gửi được bài lên máy chấm.',
      );
      setIsSubmitting(false);
    }
  }, []);

  const runCustom = useCallback(async (code: string, input: string, problemCode: string = 'STRNUM') => {
    setIsRunning(true);
    try {
      const response = await fetch(`${API_BASE}/submissions/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemCode,
          sourceCode: code,
          customInput: input,
        }),
      });

      const data = await response.json();
      setIsRunning(false);
      return data.data;
    } catch (error) {
      console.error('Run custom error:', error);
      setIsRunning(false);
      return {
        stdout: '',
        stderr: 'Lỗi thực thi kiểm thử cục bộ',
        exitCode: 1,
      };
    }
  }, []);

  const reset = useCallback(() => {
    setSubmissionId(null);
    setResults([]);
    setVerdict(null);
    setScore(null);
    setPassedTests(0);
    setTotalTests(0);
    setErrorMessage(null);
    setIsSubmitting(false);
    setIsRunning(false);
  }, []);

  return {
    isSubmitting,
    isRunning,
    submissionId,
    results,
    verdict: effectiveVerdict,
    score: effectiveScore,
    maxScore,
    totalTests,
    passedTests: effectivePassedTests,
    errorMessage,
    isConnected,
    isComplete,
    usedFallback,
    latestResult,
    submitCode,
    runCustom,
    reset,
  };
}
