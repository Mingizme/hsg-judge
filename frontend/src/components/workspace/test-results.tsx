'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, AlertTriangle, Ban, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TestResult } from '@/hooks/use-submission';

interface TestResultsProps {
  results: TestResult[];
  verdict: string | null;
  score: number;
  isSubmitting: boolean;
  totalTestsExpected?: number;
}

const getVerdictConfig = (verdict: string) => {
  switch (verdict) {
    case 'AC': return { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/20', label: 'Accepted' };
    case 'WA': return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10', border: 'border-red-200 dark:border-red-500/20', label: 'Wrong Answer' };
    case 'TLE': return { icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10', border: 'border-orange-200 dark:border-orange-500/20', label: 'Time Limit Exceeded' };
    case 'RTE': return { icon: AlertTriangle, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10', border: 'border-purple-200 dark:border-purple-500/20', label: 'Runtime Error' };
    case 'CE': return { icon: Ban, color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-500/10', border: 'border-slate-200 dark:border-slate-500/20', label: 'Compile Error' };
    default: return { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-200 dark:border-blue-500/20', label: 'Pending', spin: true };
  }
};

export function TestResults({ results, verdict, score, isSubmitting, totalTestsExpected }: TestResultsProps) {
  if (results.length === 0 && !isSubmitting && !verdict) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        Chưa có kết quả chấm. Nhấn "Nộp bài" để chấm điểm code của bạn.
      </div>
    );
  }

  const passedTests = results.filter(r => r.verdict === 'AC').length;
  const totalTests = totalTestsExpected || results.length || 1; // avoid / 0
  const maxTime = results.reduce((max, r) => Math.max(max, r.executionTimeMs ?? (r as any).timeMs ?? 0), 0);

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex flex-wrap items-center justify-between rounded-lg border bg-card p-4 shadow-sm gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-muted-foreground">Trạng thái</span>
          {verdict ? (
            <span className={cn("text-lg font-bold", getVerdictConfig(verdict).color)}>
              {getVerdictConfig(verdict).label}
            </span>
          ) : (
            <div className="flex items-center text-lg font-bold text-blue-500 gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Đang chấm...
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">Điểm số</span>
            <span className="text-lg font-bold font-mono">{score}/100</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">Test qua</span>
            <span className="text-lg font-bold font-mono">{passedTests}/{totalTests}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">Max Time</span>
            <span className="text-lg font-bold font-mono">{maxTime}ms</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        <AnimatePresence>
          {results.map((result) => {
            const config = getVerdictConfig(result.verdict);
            const Icon = config.icon;
            
            return (
              <motion.div
                key={result.testNumber}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-lg border shadow-sm transition-colors",
                  config.bg, config.border
                )}
              >
                <span className="text-xs font-semibold mb-2 text-muted-foreground">Test {result.testNumber}</span>
                <Icon className={cn("h-6 w-6 mb-1", config.color, config.spin && "animate-spin")} />
                <span className={cn("text-xs font-bold", config.color)}>{result.verdict}</span>
                {(result.executionTimeMs !== undefined || (result as any).timeMs !== undefined) && (
                  <span className="text-[10px] text-muted-foreground mt-1 font-mono">
                    {result.executionTimeMs ?? (result as any).timeMs}ms
                  </span>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
