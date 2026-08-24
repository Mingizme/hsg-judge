'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
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
  GraduationCap,
} from 'lucide-react';

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
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

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || 'https://hsg-judge.onrender.com/api';

      let url = `${apiUrl}/submissions?problemCode=${problemCode.toUpperCase()}&limit=50`;
      
      // Nếu chọn lọc bài nộp của tôi và đã đăng nhập
      if (scope === 'my' && user) {
        const userIdentifier = user.id || user.email;
        if (userIdentifier) {
          url += `&userId=${encodeURIComponent(userIdentifier)}`;
        }
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
  }, [problemCode, scope, user]);

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

  const getVerdictBadge = (verdict?: string) => {
    switch (verdict) {
      case 'AC':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5" /> Accepted
          </span>
        );
      case 'WA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shadow-sm">
            <XCircle className="w-3.5 h-3.5" /> Wrong Answer
          </span>
        );
      case 'TLE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-sm">
            <Clock className="w-3.5 h-3.5" /> Time Limit
          </span>
        );
      case 'CE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30 shadow-sm">
            <FileCode className="w-3.5 h-3.5" /> Compile Error
          </span>
        );
      case 'RTE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 shadow-sm">
            <AlertTriangle className="w-3.5 h-3.5" /> Runtime Error
          </span>
        );
      default:
        return (
          <span className="inline-flex px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            {verdict || 'PENDING'}
          </span>
        );
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-background">
      {/* Header bar with Scope Filter */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 border-b bg-muted/30 gap-2 shrink-0">
        <div className="flex items-center gap-2">
          {/* Scope Switcher: Của tôi vs Toàn trường */}
          <div className="flex items-center bg-muted/80 p-0.5 rounded-xl border shadow-inner">
            <button
              onClick={() => setScope('my')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all',
                scope === 'my'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <User className="w-3.5 h-3.5" />
              <span>Của tôi</span>
            </button>

            <button
              onClick={() => setScope('all')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all',
                scope === 'all'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Tất cả tài khoản</span>
            </button>
          </div>

          <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
            ({submissions.length} bài nộp)
          </span>
        </div>

        <button
          onClick={fetchHistory}
          disabled={loading}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border bg-background hover:bg-muted text-xs font-semibold text-foreground transition shadow-sm"
          title="Tải lại lịch sử nộp bài"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
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
              {scope === 'my' ? 'Bạn chưa có lượt nộp bài nào' : 'Chưa có ai nộp bài tập này'}
            </div>
            <p className="text-xs max-w-[280px] leading-relaxed">
              {scope === 'my'
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

                  return (
                    <tr key={sub.id} className="hover:bg-muted/30 transition">
                      {/* Cột Tài khoản / Người nộp */}
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary uppercase">
                            {displayName.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-foreground text-xs">
                                {displayName}
                              </span>
                              {isCurrentAccount && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  Tôi
                                </span>
                              )}
                              {isTeacher && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-0.5">
                                  <ShieldCheck className="w-2.5 h-2.5" /> GV
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
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        {getVerdictBadge(sub.verdict)}
                      </td>

                      {/* Điểm số */}
                      <td className="px-3.5 py-3 whitespace-nowrap text-center font-mono font-bold">
                        <span
                          className={
                            sub.score === (sub.maxScore || 100)
                              ? 'text-emerald-500 font-extrabold text-sm'
                              : sub.score === 0
                              ? 'text-rose-500'
                              : 'text-foreground'
                          }
                        >
                          {sub.score ?? 0}/{sub.maxScore || 100}
                        </span>
                      </td>

                      {/* Thời gian chạy */}
                      <td className="px-3.5 py-3 whitespace-nowrap hidden sm:table-cell text-muted-foreground font-mono">
                        {sub.executionTimeMs
                          ? `${(sub.executionTimeMs / 1000).toFixed(3)}s`
                          : '0.003s'}
                      </td>

                      {/* Ngôn ngữ */}
                      <td className="px-3.5 py-3 whitespace-nowrap hidden md:table-cell text-muted-foreground font-mono">
                        {sub.language === 'cpp' ? 'C++ 17' : sub.language}
                      </td>

                      {/* Thời điểm nộp */}
                      <td className="px-3.5 py-3 whitespace-nowrap text-right text-muted-foreground font-mono">
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
