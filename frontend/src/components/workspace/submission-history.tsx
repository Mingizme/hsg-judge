'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { API_BASE } from '@/lib/api-config';
import { cn } from '@/lib/utils';
import {
  RefreshCw,
  History,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileCode,
  User,
  Users,
  ShieldCheck,
  Database,
  ServerCrash,
  type LucideIcon,
} from 'lucide-react';

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

/** 20 → "20", 12.5 → "12.5" (không hiện ".00" vô nghĩa cho điểm nguyên) */
function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

interface SubmissionUser {
  id?: string;
  email?: string;
  displayName?: string;
  role?: string;
}

interface SubmissionItem {
  id: string;
  problemCode: string;
  problemTitle: string;
  status: string;
  verdict?: string;
  score?: number;
  maxScore?: number;
  language: string;
  executionTimeMs?: number;
  submittedAt: string;
  totalTests: number;
  user?: SubmissionUser | null;
}

interface SubmissionHistoryProps {
  problemCode: string;
}

export function SubmissionHistory({ problemCode }: SubmissionHistoryProps) {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  // Mode lọc: 'my' (bài nộp của tài khoản hiện tại) hoặc 'all' (tất cả học sinh / tài khoản)
  const [scope, setScope] = useState<'my' | 'all'>('my');

  /**
   * Khoá tài khoản dùng để lọc. Backend nhận cả `id`, `supabaseId` lẫn `email`
   * (xem `getSubmissionsByUser`), nên chỉ cần một trong số đó.
   */
  const identifier = user?.id || user?.email || '';
  const needsLogin = scope === 'my' && !identifier;

  const fetchHistory = useCallback(async () => {
    // Chưa đăng nhập mà vẫn gọi API không kèm `userId` thì server trả bài nộp
    // của TẤT CẢ mọi người trong khi nhãn đang là "Của tôi" — sai sự thật.
    if (needsLogin) {
      setSubmissions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let url = `${API_BASE}/submissions?problemCode=${problemCode.toUpperCase()}&limit=50`;

      if (scope === 'my' && identifier) {
        url += `&userId=${encodeURIComponent(identifier)}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        const list = json.data?.submissions || json.submissions || [];
        setSubmissions(list);
      }
    } catch (err) {
      console.error('Failed to fetch submission history', err);
    } finally {
      setLoading(false);
    }
  }, [problemCode, scope, identifier, needsLogin]);

  useEffect(() => {
    fetchHistory();

    const onSubmitted = () => {
      setTimeout(() => {
        fetchHistory();
      }, 400);
    };

    window.addEventListener('submission-completed', onSubmitted);
    return () => {
      window.removeEventListener('submission-completed', onSubmitted);
    };
  }, [fetchHistory]);

  const VERDICT_BADGES: Record<
    string,
    { icon: LucideIcon | null; label: string; className: string }
  > = {
    AC: {
      icon: CheckCircle2,
      label: 'Accepted',
      className: 'bg-success/15 text-success border-success/30',
    },
    WA: {
      icon: XCircle,
      label: 'Wrong Answer',
      className: 'bg-destructive/15 text-destructive border-destructive/30',
    },
    TLE: {
      icon: Clock,
      label: 'Time Limit',
      className: 'bg-warning/15 text-warning border-warning/30',
    },
    MLE: {
      icon: Database,
      label: 'Memory Limit',
      className: 'bg-warning/15 text-warning border-warning/30',
    },
    CE: {
      icon: FileCode,
      label: 'Compile Error',
      className: 'bg-muted text-muted-foreground border-border',
    },
    RTE: {
      icon: AlertTriangle,
      label: 'Runtime Error',
      className:
        'bg-[hsl(280_70%_60%/0.15)] text-[hsl(280_70%_55%)] border-[hsl(280_70%_60%/0.3)]',
    },
    SE: {
      icon: ServerCrash,
      label: 'Lỗi hệ thống',
      className: 'bg-warning/15 text-warning border-warning/30',
    },
  };

  /**
   * Bài chưa chấm xong: API trả `verdict = null`, phải hiển thị trạng thái
   * thật (PENDING / JUDGING) chứ không đoán bừa.
   */
  const getVerdictBadge = (verdict?: string, status?: string) => {
    const config = verdict ? VERDICT_BADGES[verdict] : undefined;

    if (!config) {
      const pendingLabel =
        status === 'JUDGING'
          ? 'Đang chấm…'
          : status === 'ERROR'
            ? 'Lỗi hệ thống'
            : 'Chờ chấm';
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-info/30 bg-info/15 px-2.5 py-0.5 text-xs font-bold text-info">
          {status === 'JUDGING' && (
            <RefreshCw className="h-3 w-3 animate-spin" aria-hidden />
          )}
          {pendingLabel}
        </span>
      );
    }

    const Icon = config.icon;
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-xs font-bold shadow-subtle',
          config.className,
        )}
      >
        {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />} {config.label}
      </span>
    );
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-background">
      {/* Header bar with Scope Filter */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 border-b bg-muted/30 gap-2 shrink-0">
        <div className="flex items-center gap-2">
          {/* Scope Switcher: Của tôi vs Toàn trường */}
          <div
            role="group"
            aria-label="Phạm vi lịch sử nộp bài"
            className="flex items-center rounded-xl border bg-muted/80 p-0.5 shadow-inner"
          >
            <button
              type="button"
              onClick={() => setScope('my')}
              aria-pressed={scope === 'my'}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-all duration-200 ease-smooth',
                scope === 'my'
                  ? 'bg-primary text-primary-foreground shadow-subtle'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <User className="h-3.5 w-3.5" aria-hidden />
              <span>Của tôi</span>
            </button>

            <button
              type="button"
              onClick={() => setScope('all')}
              aria-pressed={scope === 'all'}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-all duration-200 ease-smooth',
                scope === 'all'
                  ? 'bg-primary text-primary-foreground shadow-subtle'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Users className="h-3.5 w-3.5" aria-hidden />
              <span>Tất cả tài khoản</span>
            </button>
          </div>

          <span className="hidden text-xs font-medium text-muted-foreground sm:inline">
            ({submissions.length} bài nộp)
          </span>
        </div>

        <button
          type="button"
          onClick={fetchHistory}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1 text-xs font-semibold text-foreground shadow-subtle transition hover:bg-muted disabled:opacity-60"
          title="Tải lại lịch sử nộp bài"
        >
          <RefreshCw
            className={cn('h-3.5 w-3.5', loading && 'animate-spin')}
            aria-hidden
          />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Content Table */}
      <div className="flex-1 overflow-auto">
        {loading && submissions.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground text-xs gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-primary" />
            <span>Đang tải lịch sử chấm bài...</span>
          </div>
        ) : submissions.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center text-muted-foreground space-y-2">
            <History className="w-10 h-10 stroke-1 opacity-40 text-primary" />
            <div className="text-sm font-medium text-foreground">
              {needsLogin
                ? 'Hãy đăng nhập để xem bài nộp của bạn'
                : scope === 'my'
                  ? 'Bạn chưa có lượt nộp bài nào'
                  : 'Chưa có ai nộp bài tập này'}
            </div>
            <p className="text-xs max-w-[280px] leading-relaxed">
              {needsLogin
                ? 'Lịch sử chấm bài được lưu theo từng tài khoản. Bấm “Tất cả tài khoản” nếu chỉ muốn xem thống kê chung.'
                : scope === 'my'
                  ? 'Hãy viết mã nguồn và nhấn "Nộp bài" ở góc dưới bên phải để bắt đầu chấm điểm!'
                  : 'Các bài nộp của học sinh và giáo viên sẽ được thống kê chi tiết tại đây.'}
            </p>
          </div>
        ) : (
          <div className="p-3">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="text-xs text-muted-foreground bg-muted/40 sticky top-0 border-b">
                <tr>
                  <th className="px-3.5 py-2.5 font-semibold">Tài khoản</th>
                  <th className="px-3.5 py-2.5 font-semibold">Trạng thái</th>
                  <th className="px-3.5 py-2.5 font-semibold text-center">Điểm số</th>
                  <th className="px-3.5 py-2.5 font-semibold hidden sm:table-cell">Thời gian chạy</th>
                  <th className="px-3.5 py-2.5 font-semibold hidden md:table-cell">Ngôn ngữ</th>
                  <th className="px-3.5 py-2.5 font-semibold text-right">Thời điểm nộp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs font-medium">
                {submissions.map((sub) => {
                  const isCurrentAccount =
                    (user?.id && sub.user?.id === user.id) ||
                    (user?.email && sub.user?.email === user.email);

                  const displayName =
                    sub.user?.displayName ||
                    sub.user?.email?.split('@')[0] ||
                    'Học sinh ẩn danh';

                  const isTeacher = sub.user?.role === 'TEACHER';
                  const maxScore = sub.maxScore ?? 100;
                  const isFullMark =
                    sub.score != null && maxScore > 0 && sub.score >= maxScore;

                  return (
                    <tr key={sub.id} className="transition hover:bg-muted/30">
                      {/* Cột Tài khoản / Người nộp */}
                      <td className="whitespace-nowrap px-3.5 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-[10px] font-bold uppercase text-primary">
                            {displayName.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-semibold text-foreground">
                                {displayName}
                              </span>
                              {isCurrentAccount && (
                                <span className="rounded border border-info/30 bg-info/15 px-1.5 py-px text-[10px] font-bold text-info">
                                  Tôi
                                </span>
                              )}
                              {isTeacher && (
                                <span className="flex items-center gap-0.5 rounded border border-warning/20 bg-warning/15 px-1.5 py-px text-[10px] font-bold text-warning">
                                  <ShieldCheck className="h-2.5 w-2.5" aria-hidden />{' '}
                                  GV
                                </span>
                              )}
                            </div>
                            {sub.user?.email && (
                              <span className="text-[10px] text-muted-foreground">
                                {sub.user.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Trạng thái chấm */}
                      <td className="whitespace-nowrap px-3.5 py-3">
                        {getVerdictBadge(sub.verdict, sub.status)}
                      </td>

                      {/* Điểm số */}
                      <td className="whitespace-nowrap px-3.5 py-3 text-center font-mono font-bold tabular-nums">
                        {sub.score == null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span
                            className={
                              isFullMark
                                ? 'text-sm font-extrabold text-success'
                                : sub.score === 0
                                  ? 'text-destructive'
                                  : 'text-foreground'
                            }
                          >
                            {formatScore(sub.score)}/{formatScore(maxScore)}
                          </span>
                        )}
                      </td>

                      {/* Thời gian chạy — KHÔNG bịa số khi chưa đo được */}
                      <td className="hidden whitespace-nowrap px-3.5 py-3 font-mono text-muted-foreground sm:table-cell">
                        {sub.executionTimeMs != null
                          ? `${(sub.executionTimeMs / 1000).toFixed(3)}s`
                          : '—'}
                      </td>

                      {/* Ngôn ngữ */}
                      <td className="hidden whitespace-nowrap px-3.5 py-3 font-mono text-muted-foreground md:table-cell">
                        {sub.language === 'cpp' ? 'C++ 17' : sub.language}
                      </td>

                      {/* Thời điểm nộp */}
                      <td className="whitespace-nowrap px-3.5 py-3 text-right font-mono text-muted-foreground">
                        {formatDate(sub.submittedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
