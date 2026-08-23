'use client';

import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

interface SubmissionHistoryProps {
  problemCode: string;
}

// Mock data for initial rendering
const MOCK_SUBMISSIONS = [
  { id: '1', date: new Date().toISOString(), verdict: 'AC', score: 100, maxTime: 45, language: 'C++ 17' },
  { id: '2', date: new Date(Date.now() - 3600000).toISOString(), verdict: 'WA', score: 60, maxTime: 52, language: 'C++ 17' },
  { id: '3', date: new Date(Date.now() - 7200000).toISOString(), verdict: 'TLE', score: 20, maxTime: 1005, language: 'C++ 17' },
  { id: '4', date: new Date(Date.now() - 86400000).toISOString(), verdict: 'CE', score: 0, maxTime: 0, language: 'C++ 17' },
];

export function SubmissionHistory({ problemCode }: SubmissionHistoryProps) {
  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case 'AC': return <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Accepted</span>;
      case 'WA': return <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Wrong Answer</span>;
      case 'TLE': return <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">Time Limit</span>;
      case 'CE': return <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400">Compile Error</span>;
      default: return <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{verdict}</span>;
    }
  };

  return (
    <div className="w-full h-full overflow-auto p-0">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-muted-foreground bg-muted/50 sticky top-0">
          <tr>
            <th className="px-4 py-3 font-medium">Trạng thái</th>
            <th className="px-4 py-3 font-medium text-center">Điểm</th>
            <th className="px-4 py-3 font-medium hidden sm:table-cell">Thời gian chạy</th>
            <th className="px-4 py-3 font-medium hidden md:table-cell">Ngôn ngữ</th>
            <th className="px-4 py-3 font-medium">Thời điểm nộp</th>
            <th className="px-4 py-3 font-medium w-8"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {MOCK_SUBMISSIONS.map((sub) => (
            <tr key={sub.id} className="bg-background hover:bg-muted/30 cursor-pointer transition-colors">
              <td className="px-4 py-3 whitespace-nowrap">
                {getVerdictBadge(sub.verdict)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-center font-mono font-medium">
                <span className={sub.score === 100 ? "text-emerald-500" : "text-foreground"}>{sub.score}</span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap hidden sm:table-cell text-muted-foreground font-mono">
                {sub.maxTime}ms
              </td>
              <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell text-muted-foreground">
                {sub.language}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                {formatDate(sub.date)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-right">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
