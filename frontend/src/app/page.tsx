'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, CheckCircle2, Flame, Trophy, Sparkles } from 'lucide-react';
import { ProblemCard, type Problem } from '@/components/problems/problem-card';

export default function Home() {
  const [problems, setProblems] = useState<Problem[]>([]);

  useEffect(() => {
    const fetchRecentProblems = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://hsg-judge.onrender.com/api';
        const res = await fetch(`${apiUrl}/problems?limit=6`);
        if (res.ok) {
          const json = await res.json();
          const rawList = json.data?.problems || json.data?.items || json.data || json;
          if (Array.isArray(rawList)) {
            setProblems(
              rawList.map((p: any) => ({
                id: p.id || p.code,
                code: p.code,
                title: p.title || `Bài tập ${p.code}`,
                difficulty: p.difficulty || 'MEDIUM',
                timeLimit: (p.timeLimitMs || 1000) / 1000,
                memoryLimit: p.memoryLimitMb || 256,
                category: p.categories?.map((c: any) => c.name || c.nameVi) || ['Tin học HSG'],
                acRate: 50,
                totalTests: p.totalTests || 24,
              }))
            );
          }
        }
      } catch (err) {
        console.warn('Failed to fetch recent problems:', err);
      }
    };
    fetchRecentProblems();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 space-y-16">
      {/* Hero Section */}
      <motion.section 
        className="flex flex-col items-center text-center space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-primary/10 text-primary text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" /> Nền tảng Chấm Chuẩn HSG Quốc Gia
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
          Luyện thi{' '}
          <span className="bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
            HSG Tin học
          </span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-[600px]">
          Hệ thống luyện thi chuyên sâu C++ dành cho học sinh giỏi. Chấm bài tự động thời gian thực với sơ đồ thuật toán và lời giải chi tiết.
        </p>
        <Link 
          href="/problems"
          className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all hover:scale-105 shadow-lg shadow-primary/25"
        >
          Bắt đầu luyện tập
          <ArrowRight className="h-5 w-5" />
        </Link>
      </motion.section>

      {/* Stats Section */}
      <motion.section 
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {[
          { label: 'Số bài tập', value: problems.length > 0 ? `${problems.length}+` : 'Đang cập nhật', icon: BookOpen, color: 'text-blue-500' },
          { label: 'Hệ thống chấm', value: 'Judge0 CE', icon: CheckCircle2, color: 'text-green-500' },
          { label: 'Sơ đồ thuật toán', value: 'Interactive', icon: Flame, color: 'text-orange-500' },
          { label: 'Bảng xếp hạng', value: 'Realtime', icon: Trophy, color: 'text-yellow-500' },
        ].map((stat, i) => (
          <div key={i} className="flex flex-col items-center p-6 rounded-2xl border bg-card text-card-foreground shadow-sm">
            <stat.icon className={`h-8 w-8 mb-3 ${stat.color}`} />
            <span className="text-xl md:text-2xl font-bold">{stat.value}</span>
            <span className="text-xs text-muted-foreground">{stat.label}</span>
          </div>
        ))}
      </motion.section>

      {/* Recent Problems */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Bài tập mới nhất</h2>
          <Link href="/problems" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
            Xem tất cả ({problems.length} bài) <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {problems.map((problem) => (
            <ProblemCard key={problem.id} problem={problem} />
          ))}
        </div>
      </motion.section>
    </div>
  );
}
