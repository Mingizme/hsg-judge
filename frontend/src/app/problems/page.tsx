'use client'

import { Search, SlidersHorizontal } from 'lucide-react'
import { ProblemCard, type Problem } from '@/components/problems/problem-card'

const mockProblems: Problem[] = [
  { id: 'strnum', code: 'STRNUM', title: 'Xóa chữ số tạo số lớn nhất', difficulty: 'MEDIUM', timeLimit: 1, memoryLimit: 256, category: ['Tham lam', 'Monotonic Stack'], acRate: 48, totalTests: 24 },
  { id: '1', code: 'SUM2', title: 'Tổng 2 số', difficulty: 'EASY', timeLimit: 1, memoryLimit: 256, category: ['Cơ bản'], acRate: 85, totalTests: 10 },
  { id: '2', code: 'FIBO', title: 'Dãy Fibonacci', difficulty: 'EASY', timeLimit: 1, memoryLimit: 256, category: ['Quy hoạch động'], acRate: 70, totalTests: 20 },
  { id: '3', code: 'KNAPSACK', title: 'Cái Túi', difficulty: 'MEDIUM', timeLimit: 2, memoryLimit: 256, category: ['Quy hoạch động'], acRate: 45, totalTests: 30 },
  { id: '4', code: 'DIJKSTRA', title: 'Đường đi ngắn nhất', difficulty: 'MEDIUM', timeLimit: 2, memoryLimit: 256, category: ['Đồ thị'], acRate: 40, totalTests: 25 },
  { id: '5', code: 'SEGMENT', title: 'Segment Tree', difficulty: 'HARD', timeLimit: 2, memoryLimit: 512, category: ['Cấu trúc dữ liệu'], acRate: 20, totalTests: 40 },
  { id: '6', code: 'FLOW', title: 'Luồng cực đại', difficulty: 'HARD', timeLimit: 3, memoryLimit: 512, category: ['Đồ thị'], acRate: 15, totalTests: 50 },
  { id: '7', code: 'PALIN', title: 'Xâu đối xứng', difficulty: 'EASY', timeLimit: 1, memoryLimit: 256, category: ['Xâu'], acRate: 60, totalTests: 15 },
];

export default function ProblemsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Danh sách bài tập</h1>
          <p className="text-muted-foreground">Khám phá và giải quyết các bài toán từ cơ bản đến nâng cao.</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 p-4 bg-card border rounded-xl shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Tìm kiếm theo mã hoặc tên bài..." 
            className="w-full pl-10 pr-4 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <select className="px-4 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm appearance-none">
            <option value="">Độ khó (Tất cả)</option>
            <option value="EASY">Dễ</option>
            <option value="MEDIUM">Trung bình</option>
            <option value="HARD">Khó</option>
          </select>
          <select className="px-4 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm appearance-none">
            <option value="">Chủ đề (Tất cả)</option>
            <option value="dp">Quy hoạch động</option>
            <option value="graph">Đồ thị</option>
            <option value="ds">Cấu trúc dữ liệu</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 text-sm font-medium">
            <SlidersHorizontal className="h-4 w-4" />
            Lọc thêm
          </button>
        </div>
      </div>

      {/* Problems Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {mockProblems.map((problem) => (
          <ProblemCard key={problem.id} problem={problem} />
        ))}
      </div>

      {/* Pagination (Mock) */}
      <div className="flex justify-center items-center gap-2">
        <button className="px-4 py-2 border rounded-md text-sm hover:bg-accent disabled:opacity-50" disabled>Trước</button>
        <button className="w-10 h-10 border rounded-md text-sm bg-primary text-primary-foreground font-medium">1</button>
        <button className="w-10 h-10 border rounded-md text-sm hover:bg-accent font-medium">2</button>
        <button className="w-10 h-10 border rounded-md text-sm hover:bg-accent font-medium">3</button>
        <span className="text-muted-foreground">...</span>
        <button className="px-4 py-2 border rounded-md text-sm hover:bg-accent">Sau</button>
      </div>
    </div>
  )
}
