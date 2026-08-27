'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, BookOpen, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { ProblemCard } from '@/components/problems/problem-card';
import { fetchProblemList, getCachedProblemList, type ProblemListResult } from '@/lib/problems-api';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 12;

export default function ProblemsPage() {
  // Đọc ngay từ cache (nếu có) để người dùng không phải chờ màn hình trắng
  const initialCached = typeof window !== 'undefined'
    ? getCachedProblemList({ page: 1, limit: PAGE_SIZE, difficulty: '', search: '' })
    : null;

  const [result, setResult] = useState<ProblemListResult | null>(initialCached);
  const [loading, setLoading] = useState(!initialCached);
  const [isWakingServer, setIsWakingServer] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  // Gõ tới đâu chờ 350ms tới đó rồi mới gọi API, tránh spam backend mỗi ký tự
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  /**
   * Lọc / phân trang do BACKEND làm.
   */
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const wakingTimer = setTimeout(() => {
      setIsWakingServer(true);
    }, 3500);

    fetchProblemList(
      { page, limit: PAGE_SIZE, difficulty, search },
      controller.signal,
    )
      .then((data) => {
        clearTimeout(wakingTimer);
        setResult(data);
        setLoading(false);
        setIsWakingServer(false);
      })
      .catch((err: unknown) => {
        clearTimeout(wakingTimer);
        if (controller.signal.aborted) return;
        setError(
          err instanceof Error
            ? err.message
            : 'Không kết nối được tới máy chủ chấm bài.',
        );
        setLoading(false);
        setIsWakingServer(false);
      });

    return () => {
      clearTimeout(wakingTimer);
      controller.abort();
    };
  }, [page, difficulty, search, reloadKey]);

  const problems = result?.problems ?? [];
  const total = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 1;
  const firstIndex = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastIndex = Math.min(page * PAGE_SIZE, total);

  const handleDifficulty = useCallback((value: string) => {
    setDifficulty(value);
    setPage(1);
  }, []);

  return (
    <div className="container mx-auto max-w-7xl space-y-8 px-4 py-8">
      {/* Tiêu đề trang */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-primary">
            <BookOpen className="h-4 w-4" aria-hidden /> Kho đề thi HSG Tin học
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Danh sách bài tập thực hành
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bài tập C++ chuẩn hoá kèm đề thi PDF, sơ đồ thuật toán và chấm điểm
            tự động theo bộ test của giáo viên.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-subtle transition hover:bg-muted disabled:opacity-60"
        >
          <RefreshCw
            className={cn('h-3.5 w-3.5', loading && 'animate-spin')}
            aria-hidden
          />
          <span>Làm mới danh sách</span>
        </button>
      </div>

      {/* Thanh lọc */}
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-subtle md:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo mã hoặc tên bài (STRNUM, TAOXAU…)"
            aria-label="Tìm kiếm bài tập"
            className="w-full rounded-xl border bg-background py-2 pl-10 pr-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <select
          value={difficulty}
          onChange={(e) => handleDifficulty(e.target.value)}
          aria-label="Lọc theo độ khó"
          className="rounded-xl border bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Tất cả độ khó</option>
          <option value="EASY">Dễ</option>
          <option value="MEDIUM">Trung bình</option>
          <option value="HARD">Khó</option>
        </select>
      </div>

      {/* Thông báo khởi động máy chủ (khi Render Free Tier đang cold-start) */}
      {isWakingServer && (
        <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-warning flex flex-col sm:flex-row items-center justify-between gap-3 shadow-subtle">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 animate-spin shrink-0 text-warning" />
            <div className="text-xs sm:text-sm">
              <span className="font-bold">Máy chủ chấm bài đang khởi động (Cold-start ~30s)...</span>
              <p className="text-muted-foreground text-[11px] sm:text-xs mt-0.5">
                Máy chủ miễn phí trên Render tự ngủ khi không có lượt truy cập. Dữ liệu sẽ tự động tải sau giây lát!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsWakingServer(false);
              setReloadKey((k) => k + 1);
            }}
            className="shrink-0 rounded-xl bg-warning/20 hover:bg-warning/30 px-3 py-1.5 text-xs font-semibold text-warning transition flex items-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Tải lại</span>
          </button>
        </div>
      )}

      {/* Danh sách */}
      {error ? (
        <div
          role="alert"
          className="flex flex-col items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-10 text-center text-xs text-destructive"
        >
          <AlertTriangle className="h-6 w-6" aria-hidden />
          <p className="font-semibold">{error}</p>
          <p className="text-destructive/80">
            Máy chủ miễn phí có thể đang “ngủ”, hãy thử Làm mới sau vài giây.
          </p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[188px] animate-pulse rounded-2xl border bg-muted/40"
              aria-hidden
            />
          ))}
          <span className="sr-only">Đang tải danh sách bài tập…</span>
        </div>
      ) : problems.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center text-xs text-muted-foreground">
          {search || difficulty
            ? 'Không có bài tập nào khớp điều kiện lọc. Hãy thử từ khoá khác.'
            : 'Kho đề còn trống. Giáo viên có thể tải lên gói bài tập ở Bảng quản trị.'}
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Hiển thị{' '}
            <span className="font-semibold text-foreground tabular-nums">
              {firstIndex}–{lastIndex}
            </span>{' '}
            trong{' '}
            <span className="font-semibold text-foreground tabular-nums">
              {total}
            </span>{' '}
            bài tập
          </p>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {problems.map((problem) => (
              <ProblemCard key={problem.id} problem={problem} />
            ))}
          </div>

          {totalPages > 1 && (
            <nav
              className="flex items-center justify-center gap-3 pt-2"
              aria-label="Phân trang danh sách bài tập"
            >
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 rounded-xl border bg-card px-3 py-1.5 text-xs font-semibold transition hover:bg-muted disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Trước
              </button>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                Trang {page}/{totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 rounded-xl border bg-card px-3 py-1.5 text-xs font-semibold transition hover:bg-muted disabled:opacity-40"
              >
                Sau <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
