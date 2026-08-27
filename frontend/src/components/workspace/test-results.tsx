'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Ban,
  Loader2,
  ServerCrash,
  Database,
  Gauge,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TestResult } from '@/hooks/use-submission';

interface TestResultsProps {
  results: TestResult[];
  verdict: string | null;
  score: number;
  maxScore?: number;
  isSubmitting: boolean;
  totalTestsExpected?: number;
  errorMessage?: string | null;
  /** true khi kết quả lấy từ database do mất kết nối realtime */
  usedFallback?: boolean;
}

interface VerdictConfig {
  icon: LucideIcon;
  color: string;
  bg: string;
  border: string;
  label: string;
  spin?: boolean;
}

const VERDICT_CONFIG: Record<string, VerdictConfig> = {
  AC: {
    icon: CheckCircle2,
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success/25',
    label: 'Accepted',
  },
  WA: {
    icon: XCircle,
    color: 'text-destructive',
    bg: 'bg-destructive/10',
    border: 'border-destructive/25',
    label: 'Wrong Answer',
  },
  TLE: {
    icon: Clock,
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/25',
    label: 'Time Limit Exceeded',
  },
  MLE: {
    icon: Database,
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/25',
    label: 'Memory Limit Exceeded',
  },
  RTE: {
    icon: AlertTriangle,
    color: 'text-[hsl(280_70%_60%)]',
    bg: 'bg-[hsl(280_70%_60%/0.1)]',
    border: 'border-[hsl(280_70%_60%/0.25)]',
    label: 'Runtime Error',
  },
  CE: {
    icon: Ban,
    color: 'text-muted-foreground',
    bg: 'bg-muted/60',
    border: 'border-border',
    label: 'Compile Error',
  },
  SE: {
    icon: ServerCrash,
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/25',
    label: 'Lỗi hệ thống chấm',
  },
};

const PENDING_CONFIG: VerdictConfig = {
  icon: Loader2,
  color: 'text-info',
  bg: 'bg-info/10',
  border: 'border-info/25',
  label: 'Đang chờ',
  spin: true,
};

const getVerdictConfig = (verdict: string): VerdictConfig =>
  VERDICT_CONFIG[verdict] ?? PENDING_CONFIG;

export function TestResults({
  results,
  verdict,
  score,
  maxScore = 100,
  isSubmitting,
  totalTestsExpected,
  errorMessage,
  usedFallback,
}: TestResultsProps) {
  if (results.length === 0 && !isSubmitting && !verdict && !errorMessage) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <Gauge className="h-8 w-8 text-muted-foreground/40" aria-hidden />
        <p className="text-sm text-muted-foreground">
          Chưa có kết quả chấm. Nhấn{' '}
          <span className="font-medium text-foreground">Nộp bài</span> để chấm
          điểm code của bạn.
        </p>
      </div>
    );
  }

  const passedTests = results.filter((r) => r.verdict === 'AC').length;
  const receivedTests = results.length;
  const totalTests = Math.max(totalTestsExpected || 0, receivedTests);
  const maxTime = results.reduce(
    (max, r) => Math.max(max, r.executionTimeMs ?? 0),
    0,
  );

  // Ô giữ chỗ cho các test chưa nhận kết quả → thanh tiến trình không "nhảy"
  const pendingSlots =
    isSubmitting && totalTests > receivedTests ? totalTests - receivedTests : 0;
  const progressPct =
    totalTests > 0 ? Math.round((receivedTests / totalTests) * 100) : 0;

  const activeConfig = verdict ? getVerdictConfig(verdict) : null;

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      {/* ── Thẻ tổng kết ─────────────────────── */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Trạng thái
            </span>
            {activeConfig ? (
              <span
                className={cn(
                  'flex items-center gap-2 text-lg font-bold',
                  activeConfig.color,
                )}
              >
                <activeConfig.icon className="h-5 w-5" aria-hidden />
                {activeConfig.label}
              </span>
            ) : (
              <span className="flex items-center gap-2 text-lg font-bold text-info">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                Đang chấm…
              </span>
            )}
          </div>

          <dl className="flex items-center gap-6">
            <Stat label="Điểm số">
              {formatScore(score)}
              <span className="text-sm text-muted-foreground">
                /{formatScore(maxScore)}
              </span>
            </Stat>
            <Stat label="Test qua">
              {passedTests}
              <span className="text-sm text-muted-foreground">
                /{totalTests || '—'}
              </span>
            </Stat>
            <Stat label="Thời gian lớn nhất">
              {maxTime}
              <span className="text-sm text-muted-foreground">ms</span>
            </Stat>
          </dl>
        </div>

        {isSubmitting && totalTests > 0 && (
          <div
            className="h-1 w-full bg-muted"
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Tiến độ chấm bài"
          >
            <div
              className="h-full bg-gradient-brand transition-[width] duration-500 ease-smooth"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
      </div>

      {errorMessage && (
        <p
          role="alert"
          className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-foreground"
        >
          {errorMessage}
        </p>
      )}

      {usedFallback && !errorMessage && (
        <p className="rounded-lg border border-info/30 bg-info/10 px-3 py-2 text-xs text-muted-foreground">
          Kết nối realtime bị ngắt — kết quả bên dưới được đọc lại từ máy chủ.
        </p>
      )}

      {/* ── Lưới từng test ───────────────────── */}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {results.map((result, index) => {
          const config = getVerdictConfig(result.verdict);
          const Icon = config.icon;
          const detail = result.errorMessage?.trim();

          return (
            <motion.li
              key={result.testNumber}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.24,
                delay: Math.min(index * 0.02, 0.2),
                ease: [0.16, 1, 0.3, 1],
              }}
              title={detail || `Test ${result.testNumber}: ${config.label}`}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-xl border p-3 shadow-subtle',
                config.bg,
                config.border,
              )}
            >
              <span className="text-[11px] font-semibold text-muted-foreground">
                Test {result.testNumber}
              </span>
              <Icon
                className={cn('h-6 w-6', config.color, config.spin && 'animate-spin')}
                aria-hidden
              />
              <span className={cn('text-xs font-bold', config.color)}>
                {result.verdict}
              </span>
              {result.executionTimeMs !== undefined && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  {result.executionTimeMs}ms
                </span>
              )}
            </motion.li>
          );
        })}

        {Array.from({ length: pendingSlots }, (_, i) => (
          <li
            key={`pending-${i}`}
            className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border/70 p-3"
          >
            <span className="text-[11px] font-semibold text-muted-foreground/60">
              Test {receivedTests + i + 1}
            </span>
            <span className="h-6 w-6 animate-pulse rounded-full bg-muted" />
            <span className="text-xs font-medium text-muted-foreground/50">
              …
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="font-mono text-lg font-bold tabular-nums">{children}</dd>
    </div>
  );
}

/** 20 → "20", 12.5 → "12.5" (không hiện ".00" vô nghĩa cho điểm nguyên) */
function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
