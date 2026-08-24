'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useSSE } from './use-sse';
import { useAuth } from '@/contexts/auth-context';

export interface TestResult {
  testNumber: number;
  verdict: 'AC' | 'WA' | 'TLE' | 'MLE' | 'RTE' | 'CE' | 'PENDING';
  executionTimeMs?: number;
  memoryUsageKb?: number;
  errorMessage?: string | null;
  diff?: any;
}

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
  const [score, setScore] = useState<number>(0);
  const [maxScore, setMaxScore] = useState<number>(100);
  const [totalTests, setTotalTests] = useState<number>(0);
  const [passedTests, setPassedTests] = useState<number>(0);

  const { events, isConnected, isComplete, latestResult } = useSSE(submissionId);

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

      // Handle final compilation / complete event
      const completeEvent = events.find((e) => e.type === 'complete');
      if (completeEvent) {
        const finalVerdict = completeEvent.data.verdict as string;
        const finalScore = (completeEvent.data.score as number) ?? 0;
        setVerdict(finalVerdict);
        setScore(finalScore);
        setMaxScore((completeEvent.data.maxScore as number) || 100);
        setTotalTests((completeEvent.data.totalTests as number) || 0);
        setPassedTests((completeEvent.data.passedTests as number) || 0);
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

  // Fallback: Tự động tính toán verdict & điểm số nếu SSE complete event bị trễ hoặc mất kết nối
  const effectiveVerdict = useMemo(() => {
    if (verdict) return verdict;
    if (results.length > 0 && (!isSubmitting || isComplete)) {
      if (results.every((r) => r.verdict === 'AC')) return 'AC';
      const failed = results.find((r) => r.verdict !== 'AC');
      return failed?.verdict || 'WA';
    }
    return null;
  }, [verdict, results, isSubmitting, isComplete]);

  const effectiveScore = useMemo(() => {
    if (score > 0) return score;
    if (results.length > 0 && (!isSubmitting || isComplete)) {
      const passed = results.filter((r) => r.verdict === 'AC').length;
      return Math.round((passed / results.length) * 100);
    }
    return 0;
  }, [score, results, isSubmitting, isComplete]);

  const submitCode = useCallback(async (code: string, problemCode: string) => {
    setIsSubmitting(true);
    setSubmissionId(null);
    setResults([]);
    setVerdict(null);
    setScore(0);

    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || 'https://hsg-judge.onrender.com/api';
      const currentUser = userRef.current;
      const targetUserId = currentUser?.id || currentUser?.email || undefined;

      const response = await fetch(`${apiUrl}/submissions/submit`, {
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
      setIsSubmitting(false);
    }
  }, []);

  const runCustom = useCallback(async (code: string, input: string, problemCode: string = 'STRNUM') => {
    setIsRunning(true);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || 'https://hsg-judge.onrender.com/api';
      const response = await fetch(`${apiUrl}/submissions/run`, {
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
    setScore(0);
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
    passedTests,
    isConnected,
    isComplete,
    latestResult,
    submitCode,
    runCustom,
    reset,
  };
}
