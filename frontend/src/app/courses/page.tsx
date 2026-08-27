'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  BookOpen,
  GraduationCap,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Clock,
  Code2,
  Sparkles,
  Search,
  Layers,
  Binary,
  Sigma,
  Zap,
  Check,
  PlayCircle,
  Trophy,
} from 'lucide-react';
import { getAllChapters, getAllLessons, type ChapterInfo, type LessonSummary } from '@/lib/courses-api';
import { cn } from '@/lib/utils';

const CHAPTER_ICONS: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
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
  'chuong-1': 'Làm quen với C++, môi trường thi đấu, kiểu dữ liệu, các lỗi kinh điển và kỹ năng phân tích độ phức tạp thuật toán Big O.',
  'chuong-2': 'Nắm vững các cấu trúc điều khiển luồng: vòng lặp for/while, kỹ thuật lồng vòng lặp, in hình, đếm số và viết hàm chuẩn.',
  'chuong-3': 'Toán học nền tảng cho HSG: GCD, LCM, Số học Modulo, Tổ hợp, Định lý Fermat, Euler, Tam giác Pascal, Lũy thừa nhị phân.',
  'chuong-4': 'Cấu trúc mảng 1 chiều, kỹ thuật duyệt tối ưu, Sàng nguyên tố Eratosthenes, Mảng đánh dấu, Mảng cộng dồn Prefix Sum và Two Pointers.',
};

export default function CoursesPage() {
  const chapters = getAllChapters();
  const allLessons = getAllLessons();
  const [searchQuery, setSearchQuery] = useState('');
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [lastLesson, setLastLesson] = useState<{ chapterId: string; lessonId: string; title: string } | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({
    'chuong-1': true,
    'chuong-2': true,
    'chuong-3': true,
    'chuong-4': true,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('hsg_completed_lessons');
      if (saved) setCompletedLessons(JSON.parse(saved));

      const last = localStorage.getItem('hsg_last_lesson');
      if (last) setLastLesson(JSON.parse(last));
    } catch {
      // ignore
    }
  }, []);

  const totalLessons = allLessons.length;
  const completedCount = completedLessons.length;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters((prev) => ({
      ...prev,
      [chapterId]: !prev[chapterId],
    }));
  };

  const filteredChapters = chapters
    .map((chapter) => {
      if (!searchQuery.trim()) return chapter;
      const q = searchQuery.toLowerCase().trim();
      const matchedLessons = chapter.lessons.filter((l) =>
        l.title.toLowerCase().includes(q),
      );
      if (matchedLessons.length > 0 || chapter.title.toLowerCase().includes(q)) {
        return {
          ...chapter,
          lessons: matchedLessons.length > 0 ? matchedLessons : chapter.lessons,
        };
      }
      return null;
    })
    .filter(Boolean) as ChapterInfo[];

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Header Hero */}
      <section className="relative overflow-hidden border-b border-border/70 bg-gradient-to-b from-primary/5 via-background to-background py-10 md:py-14">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-3">
                <GraduationCap className="h-3.5 w-3.5" />
                <span>Chương trình Huấn luyện HSG Tin học & CP</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                Khóa học <span className="text-gradient-brand">Thuật toán & Lập trình C++</span>
              </h1>
              <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
                Hệ thống kiến thức chuẩn thi đấu từ Nhập môn C++, Điều khiển luồng, Toán học Number Theory đến Cấu trúc mảng & Thuật toán nâng cao.
              </p>
            </div>

            {/* Progress Card */}
            <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-4 sm:p-5 shadow-elevated md:w-80 shrink-0">
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span className="flex items-center gap-1.5 text-foreground">
                  <Trophy className="h-4 w-4 text-warning" /> Tiến độ học tập
                </span>
                <span className="text-primary">{completedCount}/{totalLessons} bài</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-gradient-brand transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Hoàn thành {progressPercent}%</span>
                {lastLesson ? (
                  <Link
                    href={`/courses/${lastLesson.chapterId}/${lastLesson.lessonId}`}
                    className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                  >
                    Học tiếp <ChevronRight className="h-3 w-3" />
                  </Link>
                ) : (
                  <Link
                    href={`/courses/chuong-1/${chapters[0]?.lessons[0]?.id || ''}`}
                    className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                  >
                    Bắt đầu <ChevronRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-8 relative max-w-xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm bài học (ví dụ: Prefix Sum, Two Pointers, Vòng lặp, Sàng nguyên tố...)"
              className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
            />
          </div>
        </div>
      </section>

      {/* Chapters & Lessons Syllabus */}
      <section className="container mx-auto max-w-6xl px-4 py-8">
        <div className="space-y-6">
          {filteredChapters.map((chapter, cIdx) => {
            const isExpanded = expandedChapters[chapter.id] ?? true;
            const theme = CHAPTER_ICONS[chapter.id] || {
              icon: <BookOpen className="h-6 w-6" />,
              color: 'text-primary',
              bg: 'bg-primary/10',
              border: 'border-primary/20',
            };
            const desc = CHAPTER_DESCRIPTIONS[chapter.id] || '';
            const chapterCompletedCount = chapter.lessons.filter((l) =>
              completedLessons.includes(l.id),
            ).length;

            return (
              <motion.div
                key={chapter.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: cIdx * 0.08 }}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-subtle"
              >
                {/* Chapter Header */}
                <div
                  onClick={() => toggleChapter(chapter.id)}
                  className="flex cursor-pointer items-start justify-between gap-4 p-5 sm:p-6 transition hover:bg-muted/30 select-none border-b border-border/50"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border font-bold',
                        theme.bg,
                        theme.border,
                        theme.color,
                      )}
                    >
                      {theme.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md border border-border bg-muted/60 px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                          CHƯƠNG {chapter.chapterNumber}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {chapter.lessons.length} bài học
                        </span>
                        {chapterCompletedCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                            <Check className="h-2.5 w-2.5" /> {chapterCompletedCount}/{chapter.lessons.length} đã xong
                          </span>
                        )}
                      </div>
                      <h2 className="mt-1 text-lg sm:text-xl font-bold text-foreground">
                        {chapter.title}
                      </h2>
                      <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {desc}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition"
                  >
                    <ChevronDown
                      className={cn(
                        'h-5 w-5 transition-transform duration-200',
                        !isExpanded && '-rotate-90',
                      )}
                    />
                  </button>
                </div>

                {/* Lessons List */}
                {isExpanded && (
                  <div className="divide-y divide-border/40 bg-card">
                    {chapter.lessons.map((lesson, lIdx) => {
                      const isCompleted = completedLessons.includes(lesson.id);
                      return (
                        <Link
                          key={lesson.id}
                          href={`/courses/${chapter.id}/${lesson.id}`}
                          className="group flex items-center justify-between gap-4 px-5 py-3.5 transition hover:bg-muted/40"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <span
                              className={cn(
                                'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition',
                                isCompleted
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary',
                              )}
                            >
                              {isCompleted ? (
                                <Check className="h-3.5 w-3.5 stroke-[3]" />
                              ) : (
                                `${lIdx + 1}`
                              )}
                            </span>
                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition">
                                {lesson.title}
                              </h3>
                              {lesson.previewHeadings && lesson.previewHeadings.length > 0 && (
                                <p className="truncate text-[11px] text-muted-foreground">
                                  {lesson.previewHeadings.map((h) => h.text).join(' • ')}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {lesson.estimatedMinutes} phút
                            </span>
                            <div className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                              <span>Học ngay</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
