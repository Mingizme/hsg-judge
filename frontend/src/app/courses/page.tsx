'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Binary,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Code2,
  GraduationCap,
  Layers,
  Search,
  Sigma,
  Trophy,
  X,
} from 'lucide-react';
import { getAllChapters, type ChapterInfo } from '@/lib/courses-api';
import { useCourseProgress, useLastLesson } from '@/hooks/use-course-progress';
import { cn } from '@/lib/utils';

const CHAPTER_ICONS: Record<
  string,
  { icon: React.ReactNode; color: string; bg: string; border: string }
> = {
  'chuong-1': {
    icon: <Code2 className="h-6 w-6" />,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  'chuong-2': {
    icon: <Binary className="h-6 w-6" />,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  'chuong-3': {
    icon: <Sigma className="h-6 w-6" />,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
  'chuong-4': {
    icon: <Layers className="h-6 w-6" />,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
};

const CHAPTER_DESCRIPTIONS: Record<string, string> = {
  'chuong-1':
    'Làm quen với C++, môi trường thi đấu, kiểu dữ liệu, các lỗi kinh điển và kỹ năng phân tích độ phức tạp thuật toán Big O.',
  'chuong-2':
    'Nắm vững các cấu trúc điều khiển luồng: vòng lặp for/while, kỹ thuật lồng vòng lặp, in hình, đếm số và viết hàm chuẩn.',
  'chuong-3':
    'Toán học nền tảng cho HSG: GCD, LCM, Số học Modulo, Tổ hợp, Định lý Fermat, Euler, Tam giác Pascal, Lũy thừa nhị phân.',
  'chuong-4':
    'Cấu trúc mảng 1 chiều, kỹ thuật duyệt tối ưu, Sàng nguyên tố Eratosthenes, Mảng đánh dấu, Mảng cộng dồn Prefix Sum và Two Pointers.',
};

const FALLBACK_THEME = {
  icon: <BookOpen className="h-6 w-6" />,
  color: 'text-primary',
  bg: 'bg-primary/10',
  border: 'border-primary/20',
};

/** Bỏ dấu để "sang nguyen to" cũng tìm được "Sàng nguyên tố" */
function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

export default function CoursesPage() {
  const chapters = getAllChapters();
  const { completedCount, totalLessons, percent, isCompleted } = useCourseProgress();
  const lastLesson = useLastLesson();

  const [searchQuery, setSearchQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const query = fold(searchQuery);
  const isSearching = query.length > 0;

  /**
   * Tìm theo tiêu đề bài, các mục lớn trong bài và tên chương.
   * Bản cũ chỉ so tiêu đề bài, và khi chỉ tên chương khớp thì trả về TOÀN BỘ
   * bài của chương khác — ở đây chương khớp mới giữ trọn danh sách, còn lại
   * chỉ giữ đúng bài khớp.
   */
  const filteredChapters = useMemo<ChapterInfo[]>(() => {
    if (!isSearching) return chapters;

    const result: ChapterInfo[] = [];
    for (const chapter of chapters) {
      const chapterMatch =
        fold(chapter.title).includes(query) ||
        fold(`chuong ${chapter.chapterNumber}`).includes(query);

      const lessons = chapter.lessons.filter(
        (l) =>
          fold(l.title).includes(query) ||
          l.previewHeadings.some((h) => fold(h.text).includes(query)),
      );

      if (chapterMatch) result.push(chapter);
      else if (lessons.length > 0) result.push({ ...chapter, lessons });
    }
    return result;
  }, [chapters, isSearching, query]);

  const matchedLessons = filteredChapters.reduce((n, c) => n + c.lessons.length, 0);
  const totalMinutes = useMemo(
    () => chapters.reduce((n, c) => n + c.lessons.reduce((m, l) => m + l.estimatedMinutes, 0), 0),
    [chapters],
  );

  const firstLesson = chapters[0]?.lessons[0];
  const startHref = firstLesson
    ? `/courses/${firstLesson.chapterId}/${firstLesson.id}`
    : '/courses';

  return (
    <div className="min-h-screen bg-background pb-16">
      <section className="relative overflow-hidden border-b border-border/70 bg-gradient-to-b from-primary/5 via-background to-background py-10 md:py-14">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <GraduationCap className="h-3.5 w-3.5" />
                <span>Chương trình Huấn luyện HSG Tin học &amp; CP</span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl md:text-4xl">
                Khóa học <span className="text-gradient-brand">Thuật toán &amp; Lập trình C++</span>
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Hệ thống kiến thức chuẩn thi đấu từ Nhập môn C++, Điều khiển luồng, Toán học Number
                Theory đến Cấu trúc mảng &amp; Thuật toán nâng cao.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                  {chapters.length} chương · {totalLessons} bài học
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" />~{Math.round(totalMinutes / 60)} giờ
                  tự học
                </span>
              </div>
            </div>

            {/* Thẻ tiến độ — đọc từ store dùng chung nên khớp với trang bài học */}
            <div className="shrink-0 rounded-2xl border border-border bg-card/80 p-4 shadow-elevated backdrop-blur-sm sm:p-5 md:w-80">
              <div className="mb-2 flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-foreground">
                  <Trophy className="h-4 w-4 text-warning" /> Tiến độ học tập
                </span>
                <span className="text-primary">
                  {completedCount}/{totalLessons} bài
                </span>
              </div>
              <div
                role="progressbar"
                aria-label="Tiến độ hoàn thành khóa học"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                className="h-2 w-full overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full rounded-full bg-gradient-brand transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span>Hoàn thành {percent}%</span>
                {lastLesson ? (
                  <Link
                    href={`/courses/${lastLesson.chapterId}/${lastLesson.lessonId}`}
                    prefetch={false}
                    className="inline-flex min-w-0 items-center gap-1 font-semibold text-primary hover:underline"
                    title={lastLesson.title}
                  >
                    <span className="truncate">Học tiếp: {lastLesson.title}</span>
                    <ChevronRight className="h-3 w-3 shrink-0" />
                  </Link>
                ) : (
                  <Link
                    href={startHref}
                    prefetch={false}
                    className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                  >
                    Bắt đầu <ChevronRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="relative mt-8 max-w-xl">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <label htmlFor="course-search" className="sr-only">
              Tìm kiếm bài học
            </label>
            <input
              id="course-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm bài học (Prefix Sum, Two Pointers, vòng lặp, sàng nguyên tố...)"
              className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-10 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {isSearching && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Xóa từ khóa tìm kiếm"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {isSearching && (
              <p className="mt-2 text-xs text-muted-foreground" role="status">
                Tìm thấy <span className="font-semibold text-foreground">{matchedLessons}</span> bài
                trong {filteredChapters.length} chương
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-6xl px-4 py-8">
        {filteredChapters.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
            <Search className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm font-semibold text-foreground">
              Không có bài học nào khớp “{searchQuery.trim()}”
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Thử từ khóa ngắn hơn, ví dụ “mảng”, “modulo”, “for”.
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:bg-primary/90"
            >
              Xem lại toàn bộ khóa học
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredChapters.map((chapter, cIdx) => {
              // Khi đang tìm thì luôn mở, nếu không kết quả sẽ bị ẩn sau chương đã gập
              const isExpanded = isSearching || !collapsed[chapter.id];
              const theme = CHAPTER_ICONS[chapter.id] ?? FALLBACK_THEME;
              const desc = CHAPTER_DESCRIPTIONS[chapter.id] ?? '';
              const doneInChapter = chapter.lessons.filter((l) =>
                isCompleted(chapter.id, l.id),
              ).length;

              return (
                <motion.div
                  key={chapter.id}
                  id={chapter.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(cIdx * 0.08, 0.4) }}
                  className="scroll-mt-24 overflow-hidden rounded-2xl border border-border bg-card shadow-subtle"
                >
                  {/* Cả đầu chương là MỘT <button> thật: bàn phím và trình đọc
                      màn hình dùng được, thay cho <div onClick> + nút giả cũ */}
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsed((prev) => ({ ...prev, [chapter.id]: !prev[chapter.id] }))
                    }
                    aria-expanded={isExpanded}
                    aria-controls={`lessons-${chapter.id}`}
                    className="flex w-full items-start justify-between gap-4 border-b border-border/50 p-5 text-left transition hover:bg-muted/30 sm:p-6"
                  >
                    <div className="flex items-start gap-4">
                      <span
                        className={cn(
                          'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border font-bold',
                          theme.bg,
                          theme.border,
                          theme.color,
                        )}
                      >
                        {theme.icon}
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md border border-border bg-muted/60 px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                            CHƯƠNG {chapter.chapterNumber}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {chapter.lessons.length} bài học
                          </span>
                          {doneInChapter > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                              <Check className="h-2.5 w-2.5" /> {doneInChapter}/
                              {chapter.lessons.length} đã xong
                            </span>
                          )}
                        </div>
                        <h2 className="mt-1 text-lg font-bold text-foreground sm:text-xl">
                          {chapter.title}
                        </h2>
                        {desc && (
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                            {desc}
                          </p>
                        )}
                      </div>
                    </div>

                    <ChevronDown
                      aria-hidden="true"
                      className={cn(
                        'mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200',
                        !isExpanded && '-rotate-90',
                      )}
                    />
                  </button>

                  <div id={`lessons-${chapter.id}`} hidden={!isExpanded}>
                    <div className="divide-y divide-border/40">
                      {chapter.lessons.map((lesson, lIdx) => {
                        const done = isCompleted(chapter.id, lesson.id);
                        return (
                          <Link
                            key={lesson.id}
                            href={`/courses/${chapter.id}/${lesson.id}`}
                            prefetch={false}
                            className="group flex items-center justify-between gap-4 px-5 py-3.5 transition hover:bg-muted/40"
                          >
                            <div className="flex min-w-0 items-center gap-3.5">
                              <span
                                className={cn(
                                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition',
                                  done
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary',
                                )}
                              >
                                {done ? (
                                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                                ) : (
                                  lesson.order || lIdx + 1
                                )}
                              </span>
                              <div className="min-w-0">
                                <h3 className="truncate text-sm font-semibold text-foreground transition group-hover:text-primary">
                                  {lesson.title}
                                </h3>
                                {lesson.previewHeadings.length > 0 && (
                                  <p className="truncate text-[11px] text-muted-foreground">
                                    {lesson.previewHeadings.map((h) => h.text).join(' • ')}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-3">
                              <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                                <Clock className="h-3 w-3" />
                                {lesson.estimatedMinutes} phút
                              </span>
                              <span className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                                <span>Học ngay</span>
                                <ChevronRight className="h-3.5 w-3.5" />
                              </span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
