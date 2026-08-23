'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { ChevronRight, RefreshCw, History, CheckCircle2, XCircle, Clock, AlertTriangle, FileCode } from 'lucide-react';

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
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
}

interface SubmissionHistoryProps {
  problemCode: string;
}

export function SubmissionHistory({ problemCode }: SubmissionHistoryProps) {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || 'https://hsg-judge.onrender.com/api';
      const userParam = user?.id || user?.email || '';
      const url = `${apiUrl}/submissions?problemCode=${problemCode.toUpperCase()}${userParam ? `&userId=${userParam}` : ''}`;
      
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setSubmissions(json.data?.submissions || []);
      }
    } catch (err) {
      console.error('Failed to fetch submission history', err);
    } finally {
      setLoading(false);
    }
  }, [problemCode, user]);

  useEffect(() => {
    fetchHistory();

    const onSubmitted = () => {
      fetchHistory();
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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Accepted
          </span>
        );
      case 'WA':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" /> Wrong Answer
          </span>
        );
      case 'TLE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" /> Time Limit
          </span>
        );
      case 'CE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            <FileCode className="w-3 h-3" /> Compile Error
          </span>
        );
      case 'RTE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <AlertTriangle className="w-3 h-3" /> Runtime Error
          </span>
        );
      default:
        return (
          <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">
            {verdict || 'PENDING'}
          </span>
        );
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-background">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/20">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
          <History className="w-3.5 h-3.5 text-primary" />
          <span>Lịch sử nộp bài ({submissions.length})</span>
        </div>
        <button
          onClick={fetchHistory}
          disabled={loading}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition"
          title="Làm mới lịch sử"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading && submissions.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground text-xs gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Đang tải lịch sử...</span>
          </div>
        ) : submissions.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center text-muted-foreground space-y-2">
            <History className="w-10 h-10 stroke-1 opacity-40" />
            <div className="text-sm font-medium text-foreground">Chưa có lượt nộp bài nào</div>
            <p className="text-xs max-w-[260px]">
              Hãy viết code và nhấn <strong>"Nộp bài"</strong> ở góc dưới bên phải để bắt đầu lưu lịch sử và chấm điểm!
            </p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/40 sticky top-0 border-b">
              <tr>
                <th className="px-4 py-2.5 font-medium">Trạng thái</th>
                <th className="px-4 py-2.5 font-medium text-center">Điểm</th>
                <th className="px-4 py-2.5 font-medium hidden sm:table-cell">Thời gian chạy</th>
                <th className="px-4 py-2.5 font-medium hidden md:table-cell">Ngôn ngữ</th>
                <th className="px-4 py-2.5 font-medium">Thời điểm nộp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 text-xs">
              {submissions.map((sub) => (
                <tr key={sub.id} className="hover:bg-muted/30 transition">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {getVerdictBadge(sub.verdict)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center font-mono font-bold">
                    <span className={sub.score === (sub.maxScore || 100) ? 'text-emerald-500' : 'text-foreground'}>
                      {sub.score ?? 0}/{sub.maxScore || 100}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap hidden sm:table-cell text-muted-foreground font-mono">
                    {sub.executionTimeMs ? `${(sub.executionTimeMs / 1000).toFixed(3)}s` : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell text-muted-foreground font-mono">
                    {sub.language === 'cpp' ? 'C++ 17' : sub.language}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {formatDate(sub.submittedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
