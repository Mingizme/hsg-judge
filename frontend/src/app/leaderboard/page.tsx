'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Flame, Search, RefreshCw, ShieldCheck, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LeaderboardUser {
  rank: number;
  id: string;
  name: string;
  email: string;
  role: 'TEACHER' | 'STUDENT';
  isTeacher: boolean;
  school: string;
  solvedCount: number;
  totalScore: number;
  totalSubmissions: number;
  streakDays: number;
  tier: 'Grandmaster' | 'Master' | 'Candidate Master' | 'Expert' | 'Specialist';
  tierColor: string;
}

export default function LeaderboardPage() {
  const [students, setStudents] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://hsg-judge.onrender.com/api';
      const res = await fetch(`${apiUrl}/auth/leaderboard`);
      if (res.ok) {
        const json = await res.json();
        setStudents(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.school.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const top1 = students[0];
  const top2 = students[1];
  const top3 = students[2];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-1">
            <Trophy className="w-4 h-4 text-amber-500" /> Bảng Vinh Danh Tuyển Thủ
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Bảng Xếp Hạng Thực Tế</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Dữ liệu xếp hạng thời gian thực dựa trên số bài AC và tổng điểm chấm tự động.
          </p>
        </div>

        <button
          onClick={fetchLeaderboard}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl border bg-card hover:bg-muted text-xs font-semibold transition shadow-sm"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          <span>Làm mới bảng điểm</span>
        </button>
      </div>

      {/* Podium Cards (Real Top Users) */}
      {students.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {/* Rank 2 */}
          {top2 ? (
            <div className="order-2 md:order-1 flex flex-col items-center p-6 rounded-2xl border bg-card/60 relative overflow-hidden shadow-sm hover:shadow-md transition">
              <div className="absolute top-3 right-3 text-slate-400 font-black text-3xl opacity-30">#2</div>
              <div className="w-16 h-16 rounded-full border-4 border-slate-300 dark:border-slate-600 bg-muted flex items-center justify-center text-xl font-bold mb-3 shadow-inner relative">
                <Medal className="w-8 h-8 text-slate-400" />
                <span className="absolute -bottom-2 bg-slate-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Hạng 2
                </span>
              </div>
              <h3 className="font-bold text-base text-foreground text-center">{top2.name}</h3>
              <p className="text-xs text-muted-foreground text-center mt-1 line-clamp-1">{top2.school}</p>
              <div className="mt-4 flex items-center gap-3 text-xs font-mono">
                <span className="text-emerald-500 font-bold">{top2.solvedCount} bài AC</span>
                <span className="text-muted-foreground">•</span>
                <span className="font-semibold text-primary">{top2.totalScore} pts</span>
              </div>
            </div>
          ) : (
            <div className="order-2 md:order-1 hidden md:flex items-center justify-center p-6 rounded-2xl border border-dashed text-muted-foreground text-xs text-center">
              Đang chờ vị trí #2
            </div>
          )}

          {/* Rank 1 - Gold (Top 1 Highlighted) */}
          {top1 && (
            <div className="order-1 md:order-2 flex flex-col items-center p-6 rounded-2xl border-2 border-amber-500/50 bg-amber-500/5 relative overflow-hidden shadow-lg hover:shadow-xl transition scale-105 z-10">
              <div className="absolute top-3 right-3 text-amber-500 font-black text-3xl opacity-40">#1</div>
              <div className="w-20 h-20 rounded-full border-4 border-amber-400 bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-2xl font-bold mb-3 shadow-md relative">
                <Trophy className="w-10 h-10 text-amber-500" />
                <span className="absolute -bottom-2.5 bg-amber-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full shadow">
                  👑 Quán Quân
                </span>
              </div>
              <h3 className="font-extrabold text-lg text-foreground text-center mt-1 flex items-center gap-1.5">
                {top1.name}
                {top1.isTeacher && <ShieldCheck className="w-4 h-4 text-amber-500 inline" />}
              </h3>
              <p className="text-xs text-muted-foreground text-center mt-1">{top1.school}</p>
              <div className="mt-4 flex items-center gap-4 text-xs font-mono">
                <span className="text-emerald-500 font-bold">{top1.solvedCount} bài AC</span>
                <span className="text-muted-foreground">•</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">{top1.totalScore} điểm</span>
              </div>
              <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-500/10 px-2.5 py-0.5 rounded-full">
                <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> {top1.totalSubmissions} lần nộp bài
              </div>
            </div>
          )}

          {/* Rank 3 */}
          {top3 ? (
            <div className="order-3 md:order-3 flex flex-col items-center p-6 rounded-2xl border bg-card/60 relative overflow-hidden shadow-sm hover:shadow-md transition">
              <div className="absolute top-3 right-3 text-amber-700 font-black text-3xl opacity-30">#3</div>
              <div className="w-16 h-16 rounded-full border-4 border-amber-700/60 bg-muted flex items-center justify-center text-xl font-bold mb-3 shadow-inner relative">
                <Medal className="w-8 h-8 text-amber-700" />
                <span className="absolute -bottom-2 bg-amber-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Hạng 3
                </span>
              </div>
              <h3 className="font-bold text-base text-foreground text-center">{top3.name}</h3>
              <p className="text-xs text-muted-foreground text-center mt-1 line-clamp-1">{top3.school}</p>
              <div className="mt-4 flex items-center gap-3 text-xs font-mono">
                <span className="text-emerald-500 font-bold">{top3.solvedCount} AC</span>
                <span className="text-muted-foreground">•</span>
                <span className="font-semibold text-primary">{top3.totalScore} pts</span>
              </div>
            </div>
          ) : (
            <div className="order-3 md:order-3 hidden md:flex items-center justify-center p-6 rounded-2xl border border-dashed text-muted-foreground text-xs text-center">
              Đang chờ vị trí #3
            </div>
          )}
        </div>
      )}

      {/* Real Table Section */}
      <div className="p-6 rounded-2xl border bg-card/60 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-bold">Danh Sách Xếp Hạng ({students.length} thí sinh)</h2>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên hoặc email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-lg border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Đang tải dữ liệu xếp hạng thực tế...</span>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs">
              Chưa có dữ liệu thí sinh nào phù hợp.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground border-b bg-muted/20">
                <tr>
                  <th className="py-3 px-4 w-16 text-center">Hạng</th>
                  <th className="py-3 px-4">Tài khoản thí sinh</th>
                  <th className="py-3 px-4 hidden md:table-cell">Vai trò</th>
                  <th className="py-3 px-4 text-center">Rank Tier</th>
                  <th className="py-3 px-4 text-center">Bài AC (100đ)</th>
                  <th className="py-3 px-4 text-center">Tổng lần nộp</th>
                  <th className="py-3 px-4 text-right">Tổng điểm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 text-xs">
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30 transition">
                    <td className="py-3.5 px-4 text-center font-bold">
                      {s.rank === 1 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white text-xs">1</span>
                      ) : s.rank === 2 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-400 text-white text-xs">2</span>
                      ) : s.rank === 3 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-white text-xs">3</span>
                      ) : (
                        <span className="text-muted-foreground font-mono">#{s.rank}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-medium">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-1">
                            {s.name}
                            {s.isTeacher && <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 hidden md:table-cell">
                      <span className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-bold border inline-flex items-center gap-1',
                        s.isTeacher
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                      )}>
                        {s.isTeacher ? <ShieldCheck className="w-2.5 h-2.5" /> : <GraduationCap className="w-2.5 h-2.5" />}
                        {s.isTeacher ? 'Giáo viên' : 'Học sinh'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                        style={{
                          backgroundColor: `${s.tierColor}15`,
                          borderColor: `${s.tierColor}40`,
                          color: s.tierColor,
                        }}
                      >
                        {s.tier}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-500">
                      {s.solvedCount} AC
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-muted-foreground">
                      {s.totalSubmissions}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-foreground text-sm">
                      {s.totalScore}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
