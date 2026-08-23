'use client';

import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, RefreshCw, BookOpen } from 'lucide-react';
import { ProblemCard, type Problem } from '@/components/problems/problem-card';

export default function ProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');

  const fetchProblems = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://hsg-judge.onrender.com/api';
      const res = await fetch(`${apiUrl}/problems`);
      if (res.ok) {
        const json = await res.json();
        const rawList = json.data?.problems || json.data?.items || json.data || json;
        if (Array.isArray(rawList)) {
          const mapped: Problem[] = rawList.map((p: any) => ({
            id: p.id || p.code,
            code: p.code,
            title: p.title || `Bài tập ${p.code}`,
            difficulty: p.difficulty || 'MEDIUM',
            timeLimit: (p.timeLimitMs || 1000) / 1000,
            memoryLimit: p.memoryLimitMb || 256,
            category: p.categories?.map((c: any) => c.name || c.nameVi) || ['Tin học HSG'],
            acRate: p.totalSubmissions > 0 ? Math.round((p.totalSolved || 1) / p.totalSubmissions * 100) : 50,
            totalTests: p.totalTests || 24,
          }));
          setProblems(mapped);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch problems list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProblems();
  }, []);

  const filteredProblems = problems.filter((p) => {
    const matchSearch =
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDiff = !selectedDifficulty || p.difficulty === selectedDifficulty;
    return matchSearch && matchDiff;
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-1">
            <BookOpen className="w-4 h-4" /> Kho Đề Thi HSG Tin Học
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Danh Sách Bài Tập Thực Hành</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Hệ thống bài tập C++ chuẩn hóa kèm đề thi PDF, sơ đồ thuật toán và chấm điểm tự động.
          </p>
        </div>

        <button
          onClick={fetchProblems}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl border bg-card hover:bg-muted text-xs font-semibold transition shadow-sm"
        >
          <RefreshCw className={loading ? 'w-3.5 h-3.5 animate-spin' : 'w-3.5 h-3.5'} />
          <span>Làm mới danh sách</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 p-4 bg-card border rounded-2xl shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm kiếm theo mã hoặc tên bài (STRNUM, TAOXAU...)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-xs sm:text-sm"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="px-3 py-2 bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-xs sm:text-sm"
          >
            <option value="">Tất cả độ khó</option>
            <option value="EASY">Dễ</option>
            <option value="MEDIUM">Trung bình</option>
            <option value="HARD">Khó</option>
          </select>
        </div>
      </div>

      {/* Problems Grid */}
      {loading ? (
        <div className="p-12 text-center text-muted-foreground text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-primary" />
          <span>Đang tải danh sách bài tập từ máy chủ...</span>
        </div>
      ) : filteredProblems.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground text-xs border rounded-2xl bg-card">
          Chưa tìm thấy bài tập nào phù hợp. Giáo viên có thể tải lên gói bài tập tại Bảng Quản Trị.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProblems.map((problem) => (
            <ProblemCard key={problem.id} problem={problem} />
          ))}
        </div>
      )}
    </div>
  );
}
