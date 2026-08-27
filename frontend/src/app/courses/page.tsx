'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  BookOpen,
  ChevronRight,
  ChevronDown,
  Code2,
  GraduationCap,
  Layers,
  Binary,
  GitBranch,
  Database,
  Network,
  Braces,
  Sigma,
  ArrowDownUp,
  BarChart3,
  Lightbulb,
  CheckCircle2,
  Clock,
  Star,
  Zap,
  Target,
  Trophy,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─────────────────── Dữ liệu Khóa học ─────────────────── */

interface Lesson {
  title: string;
  slug: string;
  duration?: string;
  isFree?: boolean;
}

interface Chapter {
  title: string;
  icon: React.ReactNode;
  lessons: Lesson[];
  color: string;
}

interface Course {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  difficulty: 'Cơ bản' | 'Trung bình' | 'Nâng cao' | 'Chuyên sâu';
  difficultyColor: string;
  totalLessons: number;
  estimatedHours: number;
  chapters: Chapter[];
  tags: string[];
}

const COURSES: Course[] = [
  {
    id: 'cpp-fundamentals',
    title: 'Nền tảng C++ cho HSG Tin học',
    subtitle: 'Từ Zero đến Hero — Làm chủ C++ chuẩn thi đấu',
    description:
      'Khóa học xây dựng nền tảng vững chắc về ngôn ngữ C++ dành riêng cho Competitive Programming. Bao gồm cú pháp, thư viện chuẩn STL, kỹ thuật xử lý Input/Output hiệu quả và các mẫu code thi đấu thường gặp.',
    icon: <Code2 className="h-6 w-6" />,
    difficulty: 'Cơ bản',
    difficultyColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
    totalLessons: 24,
    estimatedHours: 30,
    tags: ['C++', 'STL', 'I/O', 'Cơ bản'],
    chapters: [
      {
        title: 'Giới thiệu & Cài đặt môi trường',
        icon: <Lightbulb className="h-4 w-4" />,
        color: 'text-yellow-500',
        lessons: [
          { title: 'Tổng quan về lập trình thi đấu (CP)', slug: 'intro-cp', duration: '15 phút', isFree: true },
          { title: 'Cài đặt Dev-C++, VS Code & cấu hình g++', slug: 'setup-env', duration: '20 phút', isFree: true },
          { title: 'Chương trình C++ đầu tiên: Hello World!', slug: 'hello-world', duration: '10 phút', isFree: true },
        ],
      },
      {
        title: 'Kiểu dữ liệu & Biến',
        icon: <Binary className="h-4 w-4" />,
        color: 'text-blue-500',
        lessons: [
          { title: 'int, long long, double — Khi nào dùng gì?', slug: 'data-types', duration: '25 phút' },
          { title: 'char, string và xử lý xâu ký tự', slug: 'strings', duration: '30 phút' },
          { title: 'Mảng 1 chiều & 2 chiều', slug: 'arrays', duration: '35 phút' },
          { title: 'Bài tập: Xử lý biến & kiểu dữ liệu', slug: 'practice-types', duration: '40 phút' },
        ],
      },
      {
        title: 'Cấu trúc điều khiển & Vòng lặp',
        icon: <GitBranch className="h-4 w-4" />,
        color: 'text-purple-500',
        lessons: [
          { title: 'Câu lệnh if / else if / else', slug: 'if-else', duration: '20 phút' },
          { title: 'Vòng lặp for, while, do-while', slug: 'loops', duration: '30 phút' },
          { title: 'Lồng vòng lặp & Kỹ thuật Break/Continue', slug: 'nested-loops', duration: '25 phút' },
          { title: 'Bài tập: Vẽ hình tam giác sao (*)', slug: 'practice-loops', duration: '35 phút' },
        ],
      },
      {
        title: 'Hàm & Đệ quy cơ bản',
        icon: <Braces className="h-4 w-4" />,
        color: 'text-orange-500',
        lessons: [
          { title: 'Khai báo hàm, tham số & giá trị trả về', slug: 'functions', duration: '25 phút' },
          { title: 'Truyền tham chiếu vs Truyền giá trị', slug: 'pass-by-ref', duration: '20 phút' },
          { title: 'Đệ quy cơ bản: Giai thừa, Fibonacci', slug: 'recursion-basic', duration: '35 phút' },
          { title: 'Bài tập: Hàm & Đệ quy', slug: 'practice-functions', duration: '40 phút' },
        ],
      },
      {
        title: 'Thư viện chuẩn STL',
        icon: <Database className="h-4 w-4" />,
        color: 'text-cyan-500',
        lessons: [
          { title: 'vector, pair, tuple', slug: 'stl-vector', duration: '30 phút' },
          { title: 'set, map, unordered_map', slug: 'stl-set-map', duration: '35 phút' },
          { title: 'stack, queue, priority_queue', slug: 'stl-stack-queue', duration: '30 phút' },
          { title: 'sort(), lower_bound(), upper_bound()', slug: 'stl-algorithms', duration: '25 phút' },
          { title: 'Bài tập tổng hợp STL', slug: 'practice-stl', duration: '45 phút' },
        ],
      },
      {
        title: 'I/O & Kỹ thuật thi đấu',
        icon: <Zap className="h-4 w-4" />,
        color: 'text-amber-500',
        lessons: [
          { title: 'freopen() — File I/O chuẩn HSG', slug: 'file-io', duration: '20 phút' },
          { title: 'ios_base::sync_with_stdio(false) & cin.tie(NULL)', slug: 'fast-io', duration: '15 phút' },
          { title: 'Template code thi đấu & Mẹo debug nhanh', slug: 'cp-template', duration: '25 phút' },
          { title: 'Đề thi mẫu HSG Tin học cấp Tỉnh', slug: 'sample-exam', duration: '60 phút' },
        ],
      },
    ],
  },
  {
    id: 'algorithmic-general',
    title: 'Thuật toán Tổng quát',
    subtitle: 'Nắm vững các thuật toán kinh điển cho HSG & CP',
    description:
      'Khóa học hệ thống hóa toàn bộ thuật toán kinh điển trong lập trình thi đấu: Sắp xếp, Tìm kiếm, Tham lam, Chia để trị, Quay lui, Nhánh cận. Mỗi thuật toán đi kèm phân tích độ phức tạp, code mẫu C++ chuẩn và bài tập thực hành trên HSG Judge.',
    icon: <Layers className="h-6 w-6" />,
    difficulty: 'Trung bình',
    difficultyColor: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
    totalLessons: 32,
    estimatedHours: 45,
    tags: ['Sắp xếp', 'Tìm kiếm', 'Tham lam', 'Quay lui'],
    chapters: [
      {
        title: 'Độ phức tạp thuật toán',
        icon: <BarChart3 className="h-4 w-4" />,
        color: 'text-indigo-500',
        lessons: [
          { title: 'Big O — Ký hiệu & Ý nghĩa', slug: 'big-o', duration: '25 phút', isFree: true },
          { title: 'Phân tích O(n), O(n log n), O(n²)', slug: 'complexity-analysis', duration: '30 phút', isFree: true },
          { title: 'Ước lượng thời gian chạy từ giới hạn bài', slug: 'time-estimation', duration: '20 phút' },
        ],
      },
      {
        title: 'Thuật toán Sắp xếp',
        icon: <ArrowDownUp className="h-4 w-4" />,
        color: 'text-blue-500',
        lessons: [
          { title: 'Bubble Sort, Selection Sort, Insertion Sort', slug: 'basic-sort', duration: '35 phút' },
          { title: 'Merge Sort — Chia để trị', slug: 'merge-sort', duration: '30 phút' },
          { title: 'Quick Sort & Randomized Pivot', slug: 'quick-sort', duration: '30 phút' },
          { title: 'Counting Sort, Radix Sort', slug: 'counting-sort', duration: '25 phút' },
          { title: 'std::sort() và Comparator tùy chỉnh', slug: 'custom-sort', duration: '20 phút' },
        ],
      },
      {
        title: 'Thuật toán Tìm kiếm',
        icon: <Target className="h-4 w-4" />,
        color: 'text-green-500',
        lessons: [
          { title: 'Tìm kiếm tuyến tính O(n)', slug: 'linear-search', duration: '15 phút' },
          { title: 'Tìm kiếm nhị phân O(log n)', slug: 'binary-search', duration: '35 phút' },
          { title: 'Chặt nhị phân trên kết quả (Binary Search on Answer)', slug: 'bs-on-answer', duration: '40 phút' },
          { title: 'Kỹ thuật Hai con trỏ (Two Pointers)', slug: 'two-pointers', duration: '35 phút' },
        ],
      },
      {
        title: 'Thuật toán Tham lam (Greedy)',
        icon: <Star className="h-4 w-4" />,
        color: 'text-yellow-500',
        lessons: [
          { title: 'Nguyên lý Tham lam & Chứng minh', slug: 'greedy-principle', duration: '25 phút' },
          { title: 'Bài toán chọn hoạt động (Activity Selection)', slug: 'activity-selection', duration: '30 phút' },
          { title: 'Bài toán Ba lô Tham lam (Fractional Knapsack)', slug: 'fractional-knapsack', duration: '30 phút' },
          { title: 'Bài tập Tham lam kinh điển', slug: 'greedy-practice', duration: '45 phút' },
        ],
      },
      {
        title: 'Đệ quy & Quay lui (Backtracking)',
        icon: <GitBranch className="h-4 w-4" />,
        color: 'text-purple-500',
        lessons: [
          { title: 'Đệ quy nâng cao: Sinh hoán vị, tổ hợp', slug: 'permutations', duration: '35 phút' },
          { title: 'Quay lui: Bài toán N-Queens', slug: 'n-queens', duration: '30 phút' },
          { title: 'Quay lui: Tìm đường trong mê cung', slug: 'maze-backtrack', duration: '30 phút' },
          { title: 'Nhánh cận (Branch and Bound)', slug: 'branch-bound', duration: '35 phút' },
        ],
      },
      {
        title: 'Chia để trị (Divide & Conquer)',
        icon: <Sigma className="h-4 w-4" />,
        color: 'text-red-500',
        lessons: [
          { title: 'Nguyên lý Chia để trị', slug: 'dnc-principle', duration: '20 phút' },
          { title: 'Tìm cặp điểm gần nhất (Closest Pair)', slug: 'closest-pair', duration: '35 phút' },
          { title: 'Nhân ma trận nhanh (Strassen)', slug: 'strassen', duration: '30 phút' },
          { title: 'Bài tập Chia để trị', slug: 'dnc-practice', duration: '40 phút' },
        ],
      },
    ],
  },
  {
    id: 'dynamic-programming',
    title: 'Quy hoạch Động (DP)',
    subtitle: 'Kỹ thuật then chốt chinh phục HSG Tin học',
    description:
      'Khóa học đặc biệt chuyên sâu về Quy hoạch Động — kỹ thuật thuật toán quan trọng nhất trong các kỳ thi HSG và ICPC. Từ DP cơ bản 1 chiều đến DP Bitmask, DP trên cây, DP trạng thái và tối ưu bằng Convex Hull Trick.',
    icon: <Sigma className="h-6 w-6" />,
    difficulty: 'Nâng cao',
    difficultyColor: 'text-rose-500 bg-rose-500/10 border-rose-500/30',
    totalLessons: 28,
    estimatedHours: 50,
    tags: ['DP', 'Bitmask', 'DP Cây', 'Tối ưu hóa'],
    chapters: [
      {
        title: 'DP Cơ bản (1 chiều)',
        icon: <Layers className="h-4 w-4" />,
        color: 'text-blue-500',
        lessons: [
          { title: 'Tư duy Quy hoạch Động & Công thức truy hồi', slug: 'dp-intro', duration: '30 phút', isFree: true },
          { title: 'Bài toán Fibonacci & Dãy con tăng dài nhất (LIS)', slug: 'dp-lis', duration: '35 phút' },
          { title: 'Bài toán Ba lô 0/1 (Knapsack)', slug: 'dp-knapsack', duration: '40 phút' },
          { title: 'Bài toán đổi tiền (Coin Change)', slug: 'dp-coin', duration: '30 phút' },
        ],
      },
      {
        title: 'DP 2 chiều & Xâu ký tự',
        icon: <Binary className="h-4 w-4" />,
        color: 'text-green-500',
        lessons: [
          { title: 'DP trên lưới (Grid DP)', slug: 'dp-grid', duration: '35 phút' },
          { title: 'Xâu con chung dài nhất (LCS)', slug: 'dp-lcs', duration: '35 phút' },
          { title: 'Khoảng cách chỉnh sửa (Edit Distance)', slug: 'dp-edit', duration: '30 phút' },
          { title: 'DP Palindrome & Xâu đối xứng', slug: 'dp-palindrome', duration: '30 phút' },
        ],
      },
      {
        title: 'DP Bitmask',
        icon: <Braces className="h-4 w-4" />,
        color: 'text-purple-500',
        lessons: [
          { title: 'Biểu diễn tập hợp bằng Bitmask', slug: 'bitmask-intro', duration: '25 phút' },
          { title: 'Bài toán Người bán hàng (TSP)', slug: 'dp-tsp', duration: '40 phút' },
          { title: 'DP Profile & Bitmask nâng cao', slug: 'dp-profile', duration: '45 phút' },
        ],
      },
      {
        title: 'DP trên Cây & Đồ thị',
        icon: <Network className="h-4 w-4" />,
        color: 'text-orange-500',
        lessons: [
          { title: 'DP trên cây cơ bản', slug: 'dp-tree-basic', duration: '35 phút' },
          { title: 'Bài toán Independent Set trên cây', slug: 'dp-tree-is', duration: '30 phút' },
          { title: 'DP Rerooting (Đổi gốc)', slug: 'dp-rerooting', duration: '45 phút' },
        ],
      },
      {
        title: 'Tối ưu hóa DP',
        icon: <Zap className="h-4 w-4" />,
        color: 'text-red-500',
        lessons: [
          { title: 'DP Chia đoạn (Knuth Optimization)', slug: 'dp-knuth', duration: '40 phút' },
          { title: 'Convex Hull Trick (CHT)', slug: 'dp-cht', duration: '50 phút' },
          { title: 'Divide and Conquer Optimization', slug: 'dp-dnc-opt', duration: '45 phút' },
          { title: 'Li Chao Tree', slug: 'dp-lichao', duration: '40 phút' },
          { title: 'Tổng hợp bài tập DP nâng cao', slug: 'dp-advanced-practice', duration: '60 phút' },
        ],
      },
    ],
  },
  {
    id: 'graph-theory',
    title: 'Lý thuyết Đồ thị',
    subtitle: 'BFS, DFS, Dijkstra, Kruskal & nhiều hơn nữa',
    description:
      'Khóa học toàn diện về Lý thuyết Đồ thị cho HSG Tin học: Biểu diễn đồ thị, duyệt BFS/DFS, tìm đường đi ngắn nhất (Dijkstra, Bellman-Ford, Floyd), cây khung nhỏ nhất (MST), luồng cực đại và các bài toán đồ thị nâng cao.',
    icon: <Network className="h-6 w-6" />,
    difficulty: 'Nâng cao',
    difficultyColor: 'text-rose-500 bg-rose-500/10 border-rose-500/30',
    totalLessons: 30,
    estimatedHours: 55,
    tags: ['BFS', 'DFS', 'Dijkstra', 'MST', 'Luồng'],
    chapters: [
      {
        title: 'Biểu diễn & Duyệt Đồ thị',
        icon: <Network className="h-4 w-4" />,
        color: 'text-blue-500',
        lessons: [
          { title: 'Ma trận kề, Danh sách kề, Danh sách cạnh', slug: 'graph-representation', duration: '25 phút', isFree: true },
          { title: 'BFS — Duyệt theo chiều rộng', slug: 'bfs', duration: '30 phút', isFree: true },
          { title: 'DFS — Duyệt theo chiều sâu', slug: 'dfs', duration: '30 phút' },
          { title: 'Thành phần liên thông & Đếm vùng', slug: 'connected-components', duration: '25 phút' },
        ],
      },
      {
        title: 'Đường đi Ngắn nhất',
        icon: <Target className="h-4 w-4" />,
        color: 'text-green-500',
        lessons: [
          { title: 'Dijkstra — Đường đi ngắn nhất từ 1 đỉnh', slug: 'dijkstra', duration: '40 phút' },
          { title: 'Bellman-Ford & Phát hiện chu trình âm', slug: 'bellman-ford', duration: '35 phút' },
          { title: 'Floyd-Warshall — Mọi cặp đỉnh', slug: 'floyd', duration: '30 phút' },
          { title: 'BFS 0-1 & Deque', slug: 'bfs-01', duration: '25 phút' },
        ],
      },
      {
        title: 'Cây khung Nhỏ nhất (MST)',
        icon: <GitBranch className="h-4 w-4" />,
        color: 'text-yellow-500',
        lessons: [
          { title: 'Thuật toán Kruskal + DSU', slug: 'kruskal', duration: '35 phút' },
          { title: 'Thuật toán Prim', slug: 'prim', duration: '30 phút' },
          { title: 'Disjoint Set Union (DSU) nâng cao', slug: 'dsu-advanced', duration: '35 phút' },
        ],
      },
      {
        title: 'Đồ thị Nâng cao',
        icon: <Layers className="h-4 w-4" />,
        color: 'text-purple-500',
        lessons: [
          { title: 'Sắp xếp Topo (Topological Sort)', slug: 'topo-sort', duration: '25 phút' },
          { title: 'Thành phần liên thông mạnh (SCC - Tarjan)', slug: 'scc-tarjan', duration: '40 phút' },
          { title: 'Cầu & Khớp (Bridges & Articulation Points)', slug: 'bridges', duration: '35 phút' },
          { title: 'LCA — Tổ tiên chung gần nhất', slug: 'lca', duration: '40 phút' },
          { title: 'Euler Tour & HLD cơ bản', slug: 'euler-tour', duration: '45 phút' },
        ],
      },
    ],
  },
  {
    id: 'data-structures',
    title: 'Cấu trúc Dữ liệu Nâng cao',
    subtitle: 'Segment Tree, BIT, Trie, DSU & nhiều hơn nữa',
    description:
      'Khóa học chuyên sâu về Cấu trúc Dữ liệu nâng cao phục vụ thi HSG Tin học Quốc gia và khu vực: Segment Tree (cây phân đoạn), Binary Indexed Tree (BIT/Fenwick), Trie, Sparse Table, DSU, Sqrt Decomposition.',
    icon: <Database className="h-6 w-6" />,
    difficulty: 'Chuyên sâu',
    difficultyColor: 'text-violet-500 bg-violet-500/10 border-violet-500/30',
    totalLessons: 22,
    estimatedHours: 40,
    tags: ['Segment Tree', 'BIT', 'Trie', 'DSU'],
    chapters: [
      {
        title: 'Segment Tree (Cây phân đoạn)',
        icon: <Layers className="h-4 w-4" />,
        color: 'text-blue-500',
        lessons: [
          { title: 'Segment Tree cơ bản: Build, Query, Update', slug: 'segtree-basic', duration: '40 phút', isFree: true },
          { title: 'Lazy Propagation', slug: 'segtree-lazy', duration: '45 phút' },
          { title: 'Segment Tree Persistent', slug: 'segtree-persistent', duration: '50 phút' },
          { title: 'Merge Sort Tree', slug: 'merge-sort-tree', duration: '40 phút' },
        ],
      },
      {
        title: 'Binary Indexed Tree (BIT / Fenwick)',
        icon: <BarChart3 className="h-4 w-4" />,
        color: 'text-green-500',
        lessons: [
          { title: 'BIT 1 chiều: Tổng đoạn & Cập nhật điểm', slug: 'bit-1d', duration: '30 phút' },
          { title: 'BIT 2 chiều', slug: 'bit-2d', duration: '35 phút' },
          { title: 'Ứng dụng BIT: Đếm nghịch thế', slug: 'bit-inversions', duration: '25 phút' },
        ],
      },
      {
        title: 'Trie & Cấu trúc Xâu',
        icon: <Braces className="h-4 w-4" />,
        color: 'text-orange-500',
        lessons: [
          { title: 'Trie — Cây tiền tố', slug: 'trie', duration: '30 phút' },
          { title: 'Thuật toán KMP & Z-function', slug: 'kmp-z', duration: '40 phút' },
          { title: 'Hashing xâu & Rabin-Karp', slug: 'string-hash', duration: '35 phút' },
          { title: 'Suffix Array cơ bản', slug: 'suffix-array', duration: '45 phút' },
        ],
      },
      {
        title: 'Cấu trúc Dữ liệu khác',
        icon: <Database className="h-4 w-4" />,
        color: 'text-purple-500',
        lessons: [
          { title: 'Sparse Table — Truy vấn tĩnh O(1)', slug: 'sparse-table', duration: '25 phút' },
          { title: 'Sqrt Decomposition (Chia căn)', slug: 'sqrt-decomp', duration: '35 phút' },
          { title: 'Deque Monotonic & Sliding Window', slug: 'monotonic-deque', duration: '30 phút' },
          { title: 'Bài tập Tổng hợp CTDL nâng cao', slug: 'ds-advanced-practice', duration: '60 phút' },
        ],
      },
    ],
  },
];

/* ─────────────────── Accordion Chapter ─────────────────── */

function ChapterAccordion({ chapter, courseId, chapterIndex }: { chapter: Chapter; courseId: string; chapterIndex: number }) {
  const [open, setOpen] = useState(chapterIndex === 0);

  return (
    <div className="rounded-xl border bg-card/50 overflow-hidden transition-shadow hover:shadow-md">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-muted/50"
      >
        <div className="flex items-center gap-3">
          <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg bg-muted', chapter.color)}>
            {chapter.icon}
          </span>
          <div>
            <div className="text-sm font-semibold text-foreground">{chapter.title}</div>
            <div className="text-[11px] text-muted-foreground">{chapter.lessons.length} bài học</div>
          </div>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="border-t divide-y divide-border/50">
          {chapter.lessons.map((lesson, idx) => (
            <div
              key={lesson.slug}
              className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs transition hover:bg-muted/30"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                  {idx + 1}
                </span>
                <span className="font-medium text-foreground">{lesson.title}</span>
                {lesson.isFree && (
                  <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-500">
                    Miễn phí
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                {lesson.duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {lesson.duration}
                  </span>
                )}
                {!lesson.isFree && <Lock className="h-3 w-3 opacity-40" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────── Course Card ─────────────────── */

function CourseCard({ course, index }: { course: Course; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
    >
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden transition-shadow hover:shadow-lg">
        {/* Course Header */}
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {course.icon}
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-foreground">{course.title}</h2>
                <p className="text-xs text-muted-foreground">{course.subtitle}</p>
              </div>
            </div>
            <span className={cn('shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-bold', course.difficultyColor)}>
              {course.difficulty}
            </span>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{course.description}</p>

          {/* Stats */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              <strong className="text-foreground">{course.totalLessons}</strong> bài học
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" />
              ~<strong className="text-foreground">{course.estimatedHours}</strong> giờ học
            </span>
            <span className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-primary" />
              <strong className="text-foreground">{course.chapters.length}</strong> chương
            </span>
          </div>

          {/* Tags */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {course.tags.map((tag) => (
              <span key={tag} className="rounded-md border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>

          {/* Toggle */}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="mt-4 flex items-center gap-1.5 rounded-lg bg-primary/10 px-3.5 py-2 text-xs font-semibold text-primary transition hover:bg-primary/20"
          >
            {expanded ? 'Thu gọn nội dung' : 'Xem chi tiết nội dung'}
            <ChevronRight className={cn('h-3.5 w-3.5 transition-transform duration-200', expanded && 'rotate-90')} />
          </button>
        </div>

        {/* Chapters (Expandable) */}
        {expanded && (
          <div className="border-t bg-muted/20 p-4 sm:p-5 space-y-3">
            {course.chapters.map((chapter, cIdx) => (
              <ChapterAccordion key={cIdx} chapter={chapter} courseId={course.id} chapterIndex={cIdx} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ─────────────────── TRANG CHÍNH ─────────────────── */

export default function CoursesPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="border-b bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto max-w-5xl px-4 py-12 sm:py-16 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <GraduationCap className="h-7 w-7" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              Khóa học{' '}
              <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                Thuật toán & Lập trình C++
              </span>
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Lộ trình bài bản từ cơ bản đến chuyên sâu, thiết kế dành riêng cho Học sinh Giỏi Tin học & Lập trình thi đấu.
              Mỗi bài học đi kèm code mẫu C++ chuẩn và bài tập thực hành ngay trên HSG Judge.
            </p>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mx-auto mt-8 grid max-w-lg grid-cols-4 gap-4"
          >
            {[
              { label: 'Khóa học', value: COURSES.length, icon: <BookOpen className="h-4 w-4" /> },
              { label: 'Bài học', value: COURSES.reduce((s, c) => s + c.totalLessons, 0), icon: <CheckCircle2 className="h-4 w-4" /> },
              { label: 'Giờ học', value: `${COURSES.reduce((s, c) => s + c.estimatedHours, 0)}+`, icon: <Clock className="h-4 w-4" /> },
              { label: 'Cấp độ', value: '4', icon: <Trophy className="h-4 w-4" /> },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-1 rounded-xl border bg-card p-3">
                <span className="text-primary">{stat.icon}</span>
                <span className="text-lg font-extrabold text-foreground">{stat.value}</span>
                <span className="text-[10px] font-medium text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Course List */}
      <section className="container mx-auto max-w-5xl px-4 py-8 sm:py-12 space-y-6">
        {COURSES.map((course, idx) => (
          <CourseCard key={course.id} course={course} index={idx} />
        ))}
      </section>

      {/* CTA */}
      <section className="border-t bg-muted/20">
        <div className="container mx-auto max-w-3xl px-4 py-10 text-center">
          <h3 className="text-lg font-bold text-foreground">Sẵn sàng bắt đầu luyện tập?</h3>
          <p className="mt-2 text-xs text-muted-foreground">
            Kết hợp lý thuyết từ Khóa học với việc giải bài tập trực tiếp trên HSG Judge để nâng cao kỹ năng nhanh nhất.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link
              href="/problems"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              <Code2 className="h-4 w-4" />
              Luyện tập ngay
            </Link>
            <Link
              href="/leaderboard"
              className="inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              <Trophy className="h-4 w-4" />
              Bảng xếp hạng
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
