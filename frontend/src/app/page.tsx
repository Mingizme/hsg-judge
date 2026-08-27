'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Flame,
  Trophy,
  Sparkles,
  Send,
  Workflow,
  Cpu,
} from 'lucide-react';
import { ProblemCard } from '@/components/problems/problem-card';
import { KatakanaRain } from '@/components/ui/katakana-rain';
import {
  API_BASE,
  fetchJudgeHealth,
  fetchProblemList,
  getCachedProblemList,
  type JudgeHealth,
  type ProblemSummary,
} from '@/lib/problems-api';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { RefreshCw, Zap } from 'lucide-react';

const HEATMAP_DAYS = 30;
const PREVIEW_COUNT = 6;

interface ActivityDay {
  date: string;
  count: number;
}

interface StudentProgress {
  totalSolved?: number;
  totalAttempted?: number;
  totalSubmissions?: number;
  streakDays?: number;
  recentActivity?: ActivityDay[];
}

/** `yyyy-mm-dd` theo giờ địa phương — `toISOString()` lệch một ngày ở múi giờ +7 */
function toLocalKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Backend chỉ trả về những NGÀY CÓ lượt nộp (mảng thưa). Trước đây trang này
 * thấy thiếu dữ liệu là sinh luôn 30 ngày bằng `Math.random()` — biểu đồ hoạt
 * động hoàn toàn bịa. Nay luôn dựng đủ 30 ô và tra số thật theo ngày.
 */
function buildHeatmap(raw: unknown): ActivityDay[] {
  const counts = new Map<string, number>();
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const date = String((item as ActivityDay)?.date ?? '').slice(0, 10);
      const count = Number((item as ActivityDay)?.count ?? 0);
      if (date) {
        counts.set(date, (counts.get(date) ?? 0) + (Number.isFinite(count) ? count : 0));
      }
    }
  }

  const today = new Date();
  return Array.from({ length: HEATMAP_DAYS }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (HEATMAP_DAYS - 1 - i));
    const key = toLocalKey(d);
    return { date: key, count: counts.get(key) ?? 0 };
  });
}

/** 4 mức đậm nhạt kiểu GitHub, dùng token `success` nên khớp cả Sáng và Tối */
function heatClass(count: number): string {
  if (count <= 0) return 'bg-muted';
  if (count === 1) return 'bg-success/30';
  if (count <= 3) return 'bg-success/60';
  return 'bg-success';
}

export default function Home() {
  const { user } = useAuth();
  
  // Tải ngay từ bộ nhớ đệm (nếu có) để người dùng không phải nhìn ô trống khi máy chủ Render đang thức dậy
  const cached = typeof window !== 'undefined' ? getCachedProblemList({ page: 1, limit: PREVIEW_COUNT }) : null;
  const [problems, setProblems] = useState<ProblemSummary[]>(cached?.problems ?? []);
  const [totalProblems, setTotalProblems] = useState<number | null>(cached?.total ?? null);
  const [loadingProblems, setLoadingProblems] = useState(!cached);
  const [isWakingServer, setIsWakingServer] = useState(false);
  const [judge, setJudge] = useState<JudgeHealth | null>(null);
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [heatmap, setHeatmap] = useState<ActivityDay[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  /** Danh sách xem trước + TỔNG SỐ BÀI THẬT */
  useEffect(() => {
    const controller = new AbortController();
    
    // Nếu sau 3.5s chưa có kết quả (máy chủ Render đang khởi động lại từ sleep), hiển thị thông báo nhẹ nhàng
    const wakingTimer = setTimeout(() => {
      if (loadingProblems || !judge) {
        setIsWakingServer(true);
      }
    }, 3500);

    fetchProblemList({ page: 1, limit: PREVIEW_COUNT }, controller.signal)
      .then((data) => {
        clearTimeout(wakingTimer);
        setProblems(data.problems);
        setTotalProblems(data.total);
        setLoadingProblems(false);
        setIsWakingServer(false);
      })
      .catch(() => {
        clearTimeout(wakingTimer);
        if (controller.signal.aborted) return;
        setLoadingProblems(false);
      });

    // Tên máy chấm THẬT
    fetchJudgeHealth(controller.signal).then((j) => {
      setJudge(j);
      if (j) setIsWakingServer(false);
    });

    return () => {
      clearTimeout(wakingTimer);
      controller.abort();
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!user) {
      setProgress(null);
      setHeatmap([]);
      return;
    }
    const controller = new AbortController();

    fetch(`${API_BASE}/auth/progress/${user.id}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json) return;
        const data: StudentProgress = json.data ?? json;
        setProgress(data);
        setHeatmap(buildHeatmap(data.recentActivity));
      })
      .catch(() => {
        /* Render miễn phí có thể đang khởi động lại — im lặng, không bịa số */
      });

    return () => controller.abort();
  }, [user, reloadKey]);

  const stats = [
    {
      label: 'Bài tập trong kho',
      value: totalProblems === null ? 'Đang tải…' : String(totalProblems),
      hint: 'Số bài thật lấy từ máy chủ',
      icon: BookOpen,
      tone: 'text-primary',
    },
    {
      label: 'Máy chấm',
      value: judge?.engineLabel ?? 'Đang kiểm tra…',
      hint: judge?.timeAccuracy,
      icon: Cpu,
      tone: 'text-success',
    },
    {
      label: 'Sơ đồ thuật toán',
      value: 'Tương tác',
      hint: 'Dựng từ code mẫu, chạy thử từng bước',
      icon: Workflow,
      tone: 'text-info',
    },
    {
      label: 'Bảng xếp hạng',
      value: 'Thời gian thực',
      hint: 'Cập nhật ngay sau mỗi lượt nộp',
      icon: Trophy,
      tone: 'text-warning',
    },
  ];

  return (
    <div className="container relative mx-auto max-w-7xl space-y-16 px-4 py-10 md:py-14">
      {/* Hero */}
      <motion.section
        className="flex flex-col items-center space-y-6 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="inline-flex items-center gap-2 rounded-full border bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Nền tảng chấm bài chuẩn HSG Tin học
        </div>
        <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight md:text-6xl">
          Luyện thi{' '}
          <span className="bg-gradient-brand bg-clip-text text-transparent">
            HSG Tin học
          </span>
        </h1>
        <p className="max-w-[620px] text-lg text-muted-foreground md:text-xl">
          Đề thi PDF, hướng dẫn của giáo viên, sơ đồ thuật toán tương tác và
          chấm điểm tự động theo từng test — tất cả trong một không gian làm bài.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/problems"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 font-semibold text-primary-foreground shadow-glow transition-all duration-300 ease-smooth hover:bg-primary/90 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Bắt đầu luyện tập
            <ArrowRight className="h-5 w-5" aria-hidden />
          </Link>
          <Link
            href="/leaderboard"
            className="inline-flex items-center justify-center gap-2 rounded-full border bg-card px-8 py-4 font-semibold text-foreground shadow-subtle transition-all duration-300 ease-smooth hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Trophy className="h-4 w-4" aria-hidden />
            Bảng xếp hạng
          </Link>
        </div>
      </motion.section>

      {/* Thông báo khởi động máy chủ (khi Render Free Tier đang cold-start) */}
      {isWakingServer && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-warning flex flex-col sm:flex-row items-center justify-between gap-3 shadow-subtle"
        >
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 animate-spin shrink-0 text-warning" />
            <div className="text-xs sm:text-sm">
              <span className="font-bold">Máy chủ chấm bài đang khởi động (Cold-start ~30s)...</span>
              <p className="text-muted-foreground text-[11px] sm:text-xs mt-0.5">
                Máy chủ miễn phí trên Render tự ngủ khi không có lượt truy cập. Dữ liệu và bài tập sẽ tự động hiển thị sau giây lát!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsWakingServer(false);
              setReloadKey((k) => k + 1);
            }}
            className="shrink-0 rounded-xl bg-warning/20 hover:bg-warning/30 px-3 py-1.5 text-xs font-semibold text-warning transition flex items-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Tải lại ngay</span>
          </button>
        </motion.div>
      )}

      {/* Thẻ số liệu */}
      <motion.section
        className="grid grid-cols-2 gap-4 md:grid-cols-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col items-center gap-1 rounded-2xl border bg-card p-6 text-center shadow-subtle transition-shadow duration-300 hover:shadow-card"
          >
            <stat.icon className={cn('mb-2 h-8 w-8', stat.tone)} aria-hidden />
            <span className="text-lg font-bold leading-tight md:text-xl">
              {stat.value}
            </span>
            <span className="text-xs text-muted-foreground">{stat.label}</span>
            {stat.hint && (
              <span className="text-[10px] leading-snug text-muted-foreground/70">
                {stat.hint}
              </span>
            )}
          </div>
        ))}
      </motion.section>

      {/* Tiến độ — chỉ hiện khi đã đăng nhập */}
      {user && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="space-y-6"
        >
          <h2 className="text-2xl font-bold tracking-tight">Tiến độ học tập</h2>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: 'Bài đã giải', value: String(progress?.totalSolved ?? 0), icon: CheckCircle2, tone: 'text-success' },
              { label: 'Bài đã thử', value: String(progress?.totalAttempted ?? 0), icon: BookOpen, tone: 'text-primary' },
              { label: 'Chuỗi ngày liên tục', value: `${progress?.streakDays ?? 0} ngày`, icon: Flame, tone: 'text-warning' },
              { label: 'Tổng lượt nộp', value: String(progress?.totalSubmissions ?? 0), icon: Send, tone: 'text-info' },
            ].map((item) => (
              <div
                key={item.label}
                className="flex flex-col rounded-2xl border bg-card p-4 shadow-subtle"
              >
                <div className={cn('mb-2 flex items-center gap-2', item.tone)}>
                  <item.icon className="h-5 w-5" aria-hidden />
                  <span className="text-sm font-semibold">{item.label}</span>
                </div>
                <span className="text-2xl font-bold tabular-nums">{item.value}</span>
              </div>
            ))}
          </div>

          {/* Biểu đồ hoạt động 30 ngày — số liệu thật, ngày không nộp là ô xám */}
          <div className="rounded-2xl border bg-card p-4 shadow-subtle">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Hoạt động 30 ngày gần đây</h3>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span>Ít</span>
                {['bg-muted', 'bg-success/30', 'bg-success/60', 'bg-success'].map((c) => (
                  <span key={c} className={cn('h-3 w-3 rounded-sm', c)} aria-hidden />
                ))}
                <span>Nhiều</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {(heatmap.length > 0 ? heatmap : buildHeatmap(null)).map((day) => (
                <div
                  key={day.date}
                  className={cn('h-4 w-4 rounded-sm', heatClass(day.count))}
                  title={`${day.date}: ${day.count} lượt nộp`}
                />
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* Bài tập mới nhất */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="space-y-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-2xl font-bold tracking-tight">Bài tập mới nhất</h2>
          <Link
            href="/problems"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {totalProblems === null
              ? 'Xem tất cả'
              : `Xem tất cả (${totalProblems} bài)`}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        {loadingProblems ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: PREVIEW_COUNT }).map((_, i) => (
              <div
                key={i}
                className="h-[188px] animate-pulse rounded-2xl border bg-muted/40"
                aria-hidden
              />
            ))}
            <span className="sr-only">Đang tải bài tập…</span>
          </div>
        ) : problems.length === 0 ? (
          <div className="rounded-2xl border bg-card p-12 text-center text-xs text-muted-foreground">
            Chưa tải được bài tập nào. Máy chủ miễn phí có thể đang “ngủ” —
            hãy thử lại sau vài giây.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {problems.map((problem) => (
              <ProblemCard key={problem.id} problem={problem} />
            ))}
          </div>
        )}
      </motion.section>

      {/*
        Nền mưa chữ katakana/hiragana — chỉ bật ở TRANG CHỦ (không đặt trong
        layout) để trang làm bài và trang cấu hình vẫn giữ nền phẳng, dễ đọc.
        Lớp này `fixed inset-0 -z-10 pointer-events-none` nên nằm dưới toàn bộ
        nội dung và không cản thao tác.

        Đặt Ở CUỐI danh sách con và ép `!mt-0` vì thẻ cha dùng `space-y-16`:
        `space-y-*` cộng `margin-top` cho MỌI con trừ con đầu, nếu để lớp nền
        làm con đầu thì hero bị đẩy xuống 4rem một cách vô cớ.
      */}
      <KatakanaRain className="!mt-0" />
    </div>
  );
}
