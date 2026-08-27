'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, CheckCircle2, Code2, Menu } from 'lucide-react';
import { rememberLastLesson, useCourseProgress } from '@/hooks/use-course-progress';
import { cn } from '@/lib/utils';
import { toggleLessonNav, useLessonNavOpen } from './lesson-nav-store';

/**
 * Thanh công cụ dính phía trên bài học: breadcrumb, nút mở mục lục (mobile),
 * nút "đánh dấu đã học" và vạch tiến độ đọc.
 *
 * Là client island duy nhất ở đầu trang — nội dung bài vẫn do Server Component
 * render, nên 1,2 MB HTML không đi qua prop `children` của component này.
 */
export function LessonTopBar({
  chapterId,
  lessonId,
  chapterNumber,
  title,
}: {
  chapterId: string;
  lessonId: string;
  chapterNumber: number;
  title: string;
}) {
  const { isCompleted, toggle } = useCourseProgress();
  const navOpen = useLessonNavOpen();
  const [readPercent, setReadPercent] = useState(0);
  const done = isCompleted(chapterId, lessonId);

  // Ghi nhớ bài đang đọc cho nút "Học tiếp" ở trang danh sách
  useEffect(() => {
    rememberLastLesson({ chapterId, lessonId, title });
  }, [chapterId, lessonId, title]);

  // Vạch tiến độ đọc — gộp vào một frame để scroll không bị giật
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setReadPercent(scrollable > 0 ? Math.min(100, (window.scrollY / scrollable) * 100) : 0);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <header className="sticky top-14 z-30 h-12 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex h-full items-center justify-between gap-3 px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={toggleLessonNav}
            aria-expanded={navOpen}
            aria-controls="lesson-nav"
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-2.5 py-1 text-xs font-semibold text-foreground lg:hidden"
          >
            <Menu className="h-3.5 w-3.5" />
            <span>Mục lục</span>
          </button>

          <Link href="/courses" prefetch={false} className="hidden transition hover:text-foreground sm:inline">
            Khóa học
          </Link>
          <span className="hidden sm:inline">/</span>
          <Link
            href={`/courses#${chapterId}`}
            prefetch={false}
            className="shrink-0 font-medium transition hover:text-foreground"
          >
            Chương {chapterNumber}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="truncate font-semibold text-foreground">{title}</span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => toggle(chapterId, lessonId)}
            aria-pressed={done}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-semibold transition',
              done
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {done ? (
              <Check className="h-3.5 w-3.5 stroke-[3]" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">{done ? 'Đã học xong' : 'Đánh dấu đã học'}</span>
          </button>

          <Link
            href="/problems"
            className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary transition hover:bg-primary/20"
          >
            <Code2 className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Luyện bài tập</span>
          </Link>
        </div>
      </div>

      <div
        role="progressbar"
        aria-label="Tiến độ đọc bài"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(readPercent)}
        className="absolute inset-x-0 bottom-0 h-0.5 bg-transparent"
      >
        <div
          className="h-full bg-gradient-brand transition-[width] duration-150"
          style={{ width: `${readPercent}%` }}
        />
      </div>
    </header>
  );
}
