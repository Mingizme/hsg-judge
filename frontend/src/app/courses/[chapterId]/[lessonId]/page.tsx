'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Clock,
  Code2,
  Share2,
  List,
  Menu,
  X,
  ArrowLeft,
  Sparkles,
  Check,
  RotateCcw,
  Copy,
  ExternalLink,
  Layers,
  Binary,
  Sigma,
  Zap,
} from 'lucide-react';
import {
  getAllChapters,
  getLessonDetail,
  getAdjacentLessons,
  type ChapterInfo,
  type LessonDetail,
  type LessonSummary,
} from '@/lib/courses-api';
import { cn } from '@/lib/utils';

export default function LessonDetailPage({
  params,
}: {
  params: Promise<{ chapterId: string; lessonId: string }>;
}) {
  const resolvedParams = use(params);
  const { chapterId, lessonId } = resolvedParams;
  const router = useRouter();

  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [fontSizeClass, setFontSizeClass] = useState<'normal' | 'large' | 'larger'>('normal');

  const chapters = getAllChapters();
  const { prevLesson, nextLesson } = getAdjacentLessons(chapterId, lessonId);

  // Load lesson details
  useEffect(() => {
    setLoading(true);
    getLessonDetail(chapterId, lessonId).then((data) => {
      setLesson(data);
      setLoading(false);
      // Save last accessed lesson in localStorage
      if (data) {
        try {
          localStorage.setItem(
            'hsg_last_lesson',
            JSON.stringify({
              chapterId,
              lessonId,
              title: data.title,
            }),
          );
        } catch {}
      }
    });
  }, [chapterId, lessonId]);

  // Load completed lessons
  useEffect(() => {
    try {
      const saved = localStorage.getItem('hsg_completed_lessons');
      if (saved) setCompletedLessons(JSON.parse(saved));
    } catch {}
  }, []);

  // Scroll spy for Table of Contents
  useEffect(() => {
    if (!lesson || lesson.headings.length === 0) return;

    const handleScroll = () => {
      const headings = document.querySelectorAll('.lesson-prose h2, .lesson-prose h3');
      const scrollY = window.scrollY;

      for (let i = headings.length - 1; i >= 0; i--) {
        const el = headings[i] as HTMLElement;
        if (el.offsetTop - 120 <= scrollY) {
          const text = el.innerText;
          const id = text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
          setActiveHeadingId(id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lesson]);

  const toggleCompleted = () => {
    if (!lesson) return;
    const isDone = completedLessons.includes(lesson.id);
    let updated: string[];
    if (isDone) {
      updated = completedLessons.filter((id) => id !== lesson.id);
    } else {
      updated = [...completedLessons, lesson.id];
    }
    setCompletedLessons(updated);
    try {
      localStorage.setItem('hsg_completed_lessons', JSON.stringify(updated));
    } catch {}
  };

  const isCompleted = lesson ? completedLessons.includes(lesson.id) : false;

  const scrollToHeading = (id: string) => {
    const headings = document.querySelectorAll('.lesson-prose h2, .lesson-prose h3');
    for (let i = 0; i < headings.length; i++) {
      const el = headings[i] as HTMLElement;
      const headingSlug = el.innerText
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      if (headingSlug === id || headingSlug.includes(id) || id.includes(headingSlug)) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Breadcrumb & Mobile Navigation bar */}
      <header className="sticky top-14 z-30 flex h-12 items-center justify-between border-b border-border bg-background/95 backdrop-blur px-4 lg:px-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-2.5 py-1 text-xs font-semibold text-foreground lg:hidden"
          >
            <Menu className="h-3.5 w-3.5" />
            <span>Mục lục</span>
          </button>

          <Link href="/courses" className="hover:text-foreground transition hidden sm:inline">
            Khóa học
          </Link>
          <span className="hidden sm:inline">/</span>
          <Link
            href="/courses"
            className="hover:text-foreground transition truncate font-medium max-w-[140px] sm:max-w-[200px]"
          >
            Chương {lesson?.chapterNumber}
          </Link>
          <span>/</span>
          <span className="text-foreground font-semibold truncate max-w-[180px] sm:max-w-[320px]">
            {lesson?.title || 'Đang tải...'}
          </span>
        </div>

        {/* Right quick actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleCompleted}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-semibold transition',
              isCompleted
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <CheckCircle2 className={cn('h-3.5 w-3.5', isCompleted && 'text-emerald-500')} />
            <span className="hidden sm:inline">{isCompleted ? 'Đã học xong' : 'Đánh dấu đã học'}</span>
          </button>

          <Link
            href="/problems"
            className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition"
          >
            <Code2 className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Luyện bài tập</span>
          </Link>
        </div>
      </header>

      {/* Main Grid: Left Sidebar + Content Area + Right TOC */}
      <div className="flex-1 flex max-w-[1600px] mx-auto w-full">
        {/* Left Sidebar - Course Navigation */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 w-72 lg:w-80 bg-card border-r border-border flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 lg:z-0 top-14 lg:top-0 h-[calc(100vh-3.5rem)] lg:h-[calc(100vh-6.5rem)] lg:sticky',
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2 font-bold text-sm text-foreground">
              <BookOpen className="h-4 w-4 text-primary" />
              <span>Chương trình học</span>
            </div>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Chapters & Lessons Tree */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {chapters.map((chapter) => {
              const isCurrentChapter = chapter.id === chapterId;
              return (
                <div key={chapter.id} className="space-y-1">
                  <div className="px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Chương {chapter.chapterNumber}: {chapter.title}
                  </div>
                  <div className="space-y-0.5">
                    {chapter.lessons.map((l) => {
                      const isCurrent = l.id === lessonId && chapter.id === chapterId;
                      const isDone = completedLessons.includes(l.id);
                      return (
                        <Link
                          key={l.id}
                          href={`/courses/${chapter.id}/${l.id}`}
                          onClick={() => setIsSidebarOpen(false)}
                          className={cn(
                            'group flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-medium transition',
                            isCurrent
                              ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={cn(
                                'flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold',
                                isCurrent
                                  ? 'bg-primary-foreground/20 text-primary-foreground'
                                  : isDone
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-muted text-muted-foreground',
                              )}
                            >
                              {isDone ? <Check className="h-3 w-3 stroke-[3]" /> : l.order}
                            </span>
                            <span className="truncate">{l.title}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Backdrop for mobile sidebar */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          />
        )}

        {/* Center: Article Reading Area */}
        <main className="flex-1 min-w-0 px-4 sm:px-8 md:px-12 py-8 max-w-4xl">
          {loading ? (
            <div className="space-y-6 animate-pulse py-8">
              <div className="h-8 w-3/4 rounded-xl bg-muted" />
              <div className="h-4 w-1/3 rounded-lg bg-muted" />
              <div className="space-y-3 pt-6">
                <div className="h-4 w-full rounded bg-muted" />
                <div className="h-4 w-full rounded bg-muted" />
                <div className="h-4 w-5/6 rounded bg-muted" />
              </div>
            </div>
          ) : !lesson ? (
            <div className="py-16 text-center">
              <p className="text-muted-foreground">Không tìm thấy nội dung bài học này.</p>
              <Link
                href="/courses"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Quay lại danh sách khóa học
              </Link>
            </div>
          ) : (
            <article>
              {/* Article Header */}
              <div className="mb-8 border-b border-border/70 pb-6">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                    CHƯƠNG {lesson.chapterNumber} • BÀI {lesson.lessonNumber}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    ~{lesson.estimatedMinutes} phút đọc
                  </span>
                  <span className="text-xs text-muted-foreground">
                    • {lesson.wordCount} từ
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
                  {lesson.title}
                </h1>
              </div>

              {/* Lesson Prose Body */}
              <div
                className={cn(
                  'lesson-prose select-text',
                  fontSizeClass === 'large' && 'text-[18px]',
                  fontSizeClass === 'larger' && 'text-[20px]',
                )}
                dangerouslySetInnerHTML={{ __html: lesson.contentHtml }}
              />

              {/* Bottom Practice CTA Banner */}
              <div className="my-10 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-background p-6 shadow-subtle">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Thực hành ngay trên HSG Judge
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Áp dụng kiến thức vừa học để giải các bài tập C++ thực tế với hệ thống chấm đa luồng tự động.
                    </p>
                  </div>
                  <Link
                    href="/problems"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow transition hover:bg-primary/90 shrink-0"
                  >
                    <span>Luyện tập ngay</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Next / Previous Lesson Navigation */}
              <div className="mt-10 pt-6 border-t border-border/70 flex flex-col sm:flex-row items-center justify-between gap-4">
                {prevLesson ? (
                  <Link
                    href={`/courses/${prevLesson.chapterId}/${prevLesson.id}`}
                    className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 transition hover:border-primary/40 hover:bg-muted/40 w-full sm:w-1/2"
                  >
                    <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary transition shrink-0" />
                    <div className="min-w-0 text-left">
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase">
                        Bài trước
                      </div>
                      <div className="truncate text-xs font-bold text-foreground group-hover:text-primary transition">
                        {prevLesson.title}
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="w-full sm:w-1/2" />
                )}

                {nextLesson ? (
                  <Link
                    href={`/courses/${nextLesson.chapterId}/${nextLesson.id}`}
                    className="group flex items-center justify-end gap-3 rounded-xl border border-border bg-card p-3.5 transition hover:border-primary/40 hover:bg-muted/40 w-full sm:w-1/2 text-right"
                  >
                    <div className="min-w-0 text-right">
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase">
                        Bài tiếp theo
                      </div>
                      <div className="truncate text-xs font-bold text-foreground group-hover:text-primary transition">
                        {nextLesson.title}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition shrink-0" />
                  </Link>
                ) : (
                  <div className="w-full sm:w-1/2" />
                )}
              </div>
            </article>
          )}
        </main>

        {/* Right Floating Table of Contents on Wide Screens */}
        {lesson && lesson.headings && lesson.headings.length > 0 && (
          <aside className="hidden xl:block w-72 shrink-0 border-l border-border p-6 sticky top-26 h-[calc(100vh-6.5rem)] overflow-y-auto">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <List className="h-3.5 w-3.5 text-primary" />
              <span>Mục lục bài học</span>
            </div>
            <nav className="space-y-1 text-xs border-l border-border/80 pl-2">
              {lesson.headings.map((h, idx) => {
                const isActive = activeHeadingId === h.id;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => scrollToHeading(h.id)}
                    className={cn(
                      'block w-full text-left py-1.5 transition truncate',
                      h.level === 3 && 'pl-3 text-[11px]',
                      isActive
                        ? 'font-bold text-primary border-l-2 -ml-[9px] pl-3 border-primary'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {h.text}
                  </button>
                );
              })}
            </nav>
          </aside>
        )}
      </div>
    </div>
  );
}
