'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, BookOpen, CheckCircle2, Flame, Trophy } from 'lucide-react'
import { ProblemCard, type Problem } from '@/components/problems/problem-card'

const mockProblems: Problem[] = [
  { id: '1', code: 'SUM2', title: 'Tổng 2 số', difficulty: 'EASY', timeLimit: 1, memoryLimit: 256, category: ['Cơ bản'], acRate: 85, totalTests: 10 },
  { id: '2', code: 'FIBO', title: 'Dãy Fibonacci', difficulty: 'EASY', timeLimit: 1, memoryLimit: 256, category: ['Quy hoạch động'], acRate: 70, totalTests: 20 },
  { id: '3', code: 'KNAPSACK', title: 'Cái Túi', difficulty: 'MEDIUM', timeLimit: 2, memoryLimit: 256, category: ['Quy hoạch động'], acRate: 45, totalTests: 30 },
  { id: '4', code: 'DIJKSTRA', title: 'Đường đi ngắn nhất', difficulty: 'MEDIUM', timeLimit: 2, memoryLimit: 256, category: ['Đồ thị'], acRate: 40, totalTests: 25 },
  { id: '5', code: 'SEGMENT', title: 'Segment Tree', difficulty: 'HARD', timeLimit: 2, memoryLimit: 512, category: ['Cấu trúc dữ liệu'], acRate: 20, totalTests: 40 },
  { id: '6', code: 'FLOW', title: 'Luồng cực đại', difficulty: 'HARD', timeLimit: 3, memoryLimit: 512, category: ['Đồ thị'], acRate: 15, totalTests: 50 },
]

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12 space-y-16">
      {/* Hero Section */}
      <motion.section 
        className="flex flex-col items-center text-center space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
          Luyện thi{' '}
          <span className="bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
            HSG Tin học
          </span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-[600px]">
          Nền tảng thực hành và thi đấu C++ chuyên biệt dành cho học sinh giỏi Tin học THPT. Chinh phục các kỳ thi với hệ thống chấm bài tự động.
        </p>
        <Link 
          href="/problems"
          className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all hover:scale-105"
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
          { label: 'Số bài tập', value: '150+', icon: BookOpen, color: 'text-blue-500' },
          { label: 'Bài đã giải', value: '42', icon: CheckCircle2, color: 'text-green-500' },
          { label: 'Streak', value: '7 ngày', icon: Flame, color: 'text-orange-500' },
          { label: 'Xếp hạng', value: '#15', icon: Trophy, color: 'text-yellow-500' },
        ].map((stat, i) => (
          <div key={i} className="flex flex-col items-center p-6 rounded-2xl border bg-card text-card-foreground shadow-sm">
            <stat.icon className={`h-8 w-8 mb-3 ${stat.color}`} />
            <span className="text-2xl font-bold">{stat.value}</span>
            <span className="text-sm text-muted-foreground">{stat.label}</span>
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
            Xem tất cả <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockProblems.map((problem) => (
            <ProblemCard key={problem.id} problem={problem} />
          ))}
        </div>
      </motion.section>
    </div>
  )
}
