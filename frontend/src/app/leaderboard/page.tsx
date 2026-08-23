'use client';

import React, { useState } from 'react';
import { Trophy, Medal, Flame, Search, Award, Star, TrendingUp, User, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface StudentRank {
  rank: number;
  id: string;
  name: string;
  avatar?: string;
  school: string;
  solvedCount: number;
  totalScore: number;
  streakDays: number;
  tier: 'Grandmaster' | 'Master' | 'Candidate Master' | 'Expert' | 'Specialist';
  tierColor: string;
}

const MOCK_LEADERBOARD: StudentRank[] = [
  {
    rank: 1,
    id: 'hs-1',
    name: 'Nguyễn Hoàng Long',
    school: 'THPT Chuyên Hà Nội - Amsterdam',
    solvedCount: 142,
    totalScore: 13850,
    streakDays: 28,
    tier: 'Grandmaster',
    tierColor: '#ef4444',
  },
  {
    rank: 2,
    id: 'hs-2',
    name: 'Trần Minh Đức',
    school: 'THPT Chuyên Lê Hồng Phong (TP.HCM)',
    solvedCount: 135,
    totalScore: 13200,
    streakDays: 21,
    tier: 'Grandmaster',
    tierColor: '#ef4444',
  },
  {
    rank: 3,
    id: 'hs-3',
    name: 'Lê Bảo Châu',
    school: 'THPT Chuyên Khoa học Tự nhiên',
    solvedCount: 128,
    totalScore: 12450,
    streakDays: 19,
    tier: 'Master',
    tierColor: '#f59e0b',
  },
  {
    rank: 4,
    id: 'hs-4',
    name: 'Phạm Quốc An',
    school: 'THPT Chuyên Lam Sơn (Thanh Hóa)',
    solvedCount: 115,
    totalScore: 11200,
    streakDays: 14,
    tier: 'Master',
    tierColor: '#f59e0b',
  },
  {
    rank: 5,
    id: 'hs-5',
    name: 'Vũ Hải Đăng',
    school: 'THPT Chuyên Quốc Học Huế',
    solvedCount: 102,
    totalScore: 9800,
    streakDays: 12,
    tier: 'Candidate Master',
    tierColor: '#8b5cf6',
  },
  {
    rank: 6,
    id: 'hs-6',
    name: 'Đặng Thảo My',
    school: 'THPT Chuyên Phan Bội Châu (Nghệ An)',
    solvedCount: 94,
    totalScore: 9150,
    streakDays: 9,
    tier: 'Candidate Master',
    tierColor: '#8b5cf6',
  },
  {
    rank: 7,
    id: 'hs-7',
    name: 'Bùi Anh Tuấn',
    school: 'THPT Chuyên Bắc Ninh',
    solvedCount: 88,
    totalScore: 8400,
    streakDays: 7,
    tier: 'Expert',
    tierColor: '#3b82f6',
  },
  {
    rank: 8,
    id: 'hs-8',
    name: 'Hoàng Gia Bảo',
    school: 'THPT Chuyên Trần Phú (Hải Phòng)',
    solvedCount: 76,
    totalScore: 7350,
    streakDays: 5,
    tier: 'Specialist',
    tierColor: '#10b981',
  },
];

export default function LeaderboardPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStudents = MOCK_LEADERBOARD.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.school.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const top3 = MOCK_LEADERBOARD.slice(0, 3);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-1">
            <Trophy className="w-4 h-4" /> Bảng Vinh Danh Học Sinh Giỏi
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Bảng Xếp Hạng Toàn Quốc</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Theo dõi tiến độ, số bài AC và chuỗi ngày rèn luyện liên tục của các tuyển thủ.
          </p>
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {/* Rank 2 - Silver */}
        <div className="order-2 md:order-1 flex flex-col items-center p-6 rounded-2xl border bg-card/60 relative overflow-hidden shadow-sm hover:shadow-md transition">
          <div className="absolute top-3 right-3 text-slate-400 font-black text-3xl opacity-30">#2</div>
          <div className="w-20 h-20 rounded-full border-4 border-slate-300 dark:border-slate-600 bg-muted flex items-center justify-center text-xl font-bold mb-3 shadow-inner relative">
            <Medal className="w-8 h-8 text-slate-400" />
            <span className="absolute -bottom-2 bg-slate-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              Hạng 2
            </span>
          </div>
          <h3 className="font-bold text-base text-foreground text-center">{top3[1].name}</h3>
          <p className="text-xs text-muted-foreground text-center mt-1 line-clamp-1">{top3[1].school}</p>
          <div className="mt-4 flex items-center gap-4 text-xs font-mono">
            <span className="text-emerald-500 font-bold">{top3[1].solvedCount} AC</span>
            <span className="text-muted-foreground">•</span>
            <span className="font-semibold text-primary">{top3[1].totalScore.toLocaleString()} pts</span>
          </div>
        </div>

        {/* Rank 1 - Gold (Centered & Highlighted) */}
        <div className="order-1 md:order-2 flex flex-col items-center p-6 rounded-2xl border-2 border-amber-500/50 bg-amber-500/5 relative overflow-hidden shadow-lg hover:shadow-xl transition scale-105 z-10">
          <div className="absolute top-3 right-3 text-amber-500 font-black text-3xl opacity-40">#1</div>
          <div className="w-24 h-24 rounded-full border-4 border-amber-400 bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-2xl font-bold mb-3 shadow-md relative">
            <Trophy className="w-10 h-10 text-amber-500 animate-bounce" />
            <span className="absolute -bottom-2.5 bg-amber-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full shadow">
              👑 Quán Quân
            </span>
          </div>
          <h3 className="font-extrabold text-lg text-foreground text-center mt-1">{top3[0].name}</h3>
          <p className="text-xs text-muted-foreground text-center mt-1 line-clamp-1">{top3[0].school}</p>
          <div className="mt-4 flex items-center gap-4 text-xs font-mono">
            <span className="text-emerald-500 font-bold">{top3[0].solvedCount} bài AC</span>
            <span className="text-muted-foreground">•</span>
            <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">{top3[0].totalScore.toLocaleString()} pts</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-500/10 px-2.5 py-0.5 rounded-full">
            <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Chuỗi {top3[0].streakDays} ngày liên tiếp
          </div>
        </div>

        {/* Rank 3 - Bronze */}
        <div className="order-3 md:order-3 flex flex-col items-center p-6 rounded-2xl border bg-card/60 relative overflow-hidden shadow-sm hover:shadow-md transition">
          <div className="absolute top-3 right-3 text-amber-700 font-black text-3xl opacity-30">#3</div>
          <div className="w-20 h-20 rounded-full border-4 border-amber-700/60 bg-muted flex items-center justify-center text-xl font-bold mb-3 shadow-inner relative">
            <Medal className="w-8 h-8 text-amber-700" />
            <span className="absolute -bottom-2 bg-amber-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              Hạng 3
            </span>
          </div>
          <h3 className="font-bold text-base text-foreground text-center">{top3[2].name}</h3>
          <p className="text-xs text-muted-foreground text-center mt-1 line-clamp-1">{top3[2].school}</p>
          <div className="mt-4 flex items-center gap-4 text-xs font-mono">
            <span className="text-emerald-500 font-bold">{top3[2].solvedCount} AC</span>
            <span className="text-muted-foreground">•</span>
            <span className="font-semibold text-primary">{top3[2].totalScore.toLocaleString()} pts</span>
          </div>
        </div>
      </div>

      {/* Table Section with Search */}
      <div className="p-6 rounded-2xl border bg-card/60 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-bold">Danh Sách Xếp Hạng Tuyển Thủ</h2>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên hoặc trường..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted-foreground border-b bg-muted/20">
              <tr>
                <th className="py-3 px-4 w-16 text-center">Hạng</th>
                <th className="py-3 px-4">Tuyển thủ</th>
                <th className="py-3 px-4 hidden md:table-cell">Trường / Đơn vị</th>
                <th className="py-3 px-4 text-center">Rank Tier</th>
                <th className="py-3 px-4 text-center">Bài đã giải</th>
                <th className="py-3 px-4 text-center">Chuỗi Streak</th>
                <th className="py-3 px-4 text-right">Tổng điểm</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredStudents.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30 transition">
                  <td className="py-3.5 px-4 text-center font-bold">
                    {s.rank === 1 ? (
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 text-white text-xs">1</span>
                    ) : s.rank === 2 ? (
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-400 text-white text-xs">2</span>
                    ) : s.rank === 3 ? (
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700 text-white text-xs">3</span>
                    ) : (
                      <span className="text-muted-foreground font-mono">#{s.rank}</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-medium">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{s.name}</div>
                        <div className="text-xs text-muted-foreground md:hidden">{s.school}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-muted-foreground text-xs hidden md:table-cell">{s.school}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border"
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
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">
                      <Flame className="w-3.5 h-3.5 fill-amber-500" /> {s.streakDays}d
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-foreground">
                    {s.totalScore.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
