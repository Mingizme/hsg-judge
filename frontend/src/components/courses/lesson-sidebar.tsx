'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { BookOpen, Check, X } from 'lucide-react';
import { getAllChapters } from '@/lib/courses-api';
import { useCourseProgress } from '@/hooks/use-course-progress';
import { cn } from '@/lib/utils';
import { setLessonNavOpen, useLessonNavOpen } from './lesson-nav-store';

/**
 * Cây điều hướng toàn khoá học ở cột trái trang bài học.
 *
 * Chỉ nhận `chapterId`/`lessonId` làm prop rồi tự đọc index từ
 * `courses-api` (module client-safe, 21 KB, chia sẻ chung một chunk cho mọi
 * trang) — nếu truyền cả mảng `chapters` từ Server Component xuống thì 21 KB
 * đó sẽ bị nhân bản vào RSC payload của cả 20 trang bài học.
 */
export function LessonSidebar({
  chapterId,
  lessonId,
}: {
  chapterId: string;
  lessonId: string;
}) {
  const chapters = getAllChapters();
  const { isCompleted } = useCourseProgress();
  const isOpen = useLessonNavOpen();
  const currentRef = useRef<HTMLAnchorElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Cuộn bài đang đọc vào giữa cây (chỉ trong khung cuộn, không kéo cả trang)
  useEffect(() => {
    const box = scrollRef.current;
    const item = currentRef.current;
    if (!box || !item) return;
    const target = item.offsetTop - box.clientHeight / 2 + item.clientHeight / 2;
    box.scrollTop = Math.max(0, target);
  }, [chapterId, lessonId]);

  // Esc đóng ngăn; luôn nhả khoá cuộn khi rời trang
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLessonNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      setLessonNavOpen(false);
    };
  }, []);

  return (
    <>
      {/* Nền mờ của ngăn mobile */}
      <div
        aria-hidden="true"
        onClick={() => setLessonNavOpen(false)}
        className={cn(
          'fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <aside
        id="lesson-nav"
        aria-label="Chương trình học"
        className={cn(
          'fixed inset-y-0 left-0 top-14 z-40 flex h-[calc(100vh-3.5rem)] w-72 shrink-0 flex-col border-r border-border bg-card transition-transform duration-200',
          'lg:sticky lg:top-[6.5rem] lg:z-0 lg:h-[calc(100vh-6.5rem)] lg:w-80 lg:translate-x-0 lg:self-start',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <BookOpen className="h-4 w-4 text-primary" />
            <span>Chương trình học</span>
          </div>
          <button
            type="button"
            onClick={() => setLessonNavOpen(false)}
            aria-label="Đóng mục lục"
            className="rounded-lg p-1 text-muted-foreground transition hover:text-foreground lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div ref={scrollRef} className="relative flex-1 space-y-4 overflow-y-auto p-3">
          {chapters.map((chapter) => (
            <div key={chapter.id} className="space-y-1">
              <div className="px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Chương {chapter.chapterNumber}: {chapter.title}
              </div>
              <div className="space-y-0.5">
                {chapter.lessons.map((l) => {
                  const isCurrent = chapter.id === chapterId && l.id === lessonId;
                  const done = isCompleted(chapter.id, l.id);
                  return (
                    <Link
                      key={l.id}
                      ref={isCurrent ? currentRef : undefined}
                      href={`/courses/${chapter.id}/${l.id}`}
                      prefetch={false}
                      aria-current={isCurrent ? 'page' : undefined}
                      onClick={() => setLessonNavOpen(false)}
                      className={cn(
                        'flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition',
                        isCurrent
                          ? 'bg-primary font-semibold text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold',
                          isCurrent
                            ? 'bg-primary-foreground/20 text-primary-foreground'
                            : done
                              ? 'bg-emerald-500 text-white'
                              : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {done ? <Check className="h-3 w-3 stroke-[3]" /> : l.order}
                      </span>
                      <span className="truncate">{l.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
