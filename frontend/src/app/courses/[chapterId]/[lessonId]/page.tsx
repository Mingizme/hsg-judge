import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, ChevronRight, Clock, FileText, Sparkles } from 'lucide-react';
import {
  getAdjacentLessons,
  getChapterById,
  getLessonSummary,
  type LessonSummary,
} from '@/lib/courses-api';
import { getAllLessonParams, getLessonDetail } from '@/lib/courses-server';
import { LessonCodeTools } from '@/components/courses/lesson-code-tools';
import { LessonSidebar } from '@/components/courses/lesson-sidebar';
import { LessonToc } from '@/components/courses/lesson-toc';
import { LessonTopBar } from '@/components/courses/lesson-top-bar';

/**
 * Trang bài học — Server Component.
 *
 * Bản trước là `'use client'` và gọi `getLessonDetail` (một `import()` động
 * dựng từ tham số URL) ngay trong `useEffect`, nên webpack phải đưa CẢ 20 file
 * bài học (3,7 MB JSON) vào bundle trình duyệt và người đọc thấy skeleton
 * trước mỗi bài. Nay nội dung được đọc ở server, prerender sẵn lúc build, và
 * chỉ 4 client island nhỏ chịu phần tương tác.
 */

type Params = { chapterId: string; lessonId: string };

/** Prerender toàn bộ 20 bài lúc build */
export function generateStaticParams() {
  return getAllLessonParams();
}

/** Ngoài 20 tổ hợp trên thì 404 ngay, không render động */
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { chapterId, lessonId } = await params;
  const summary = getLessonSummary(chapterId, lessonId);
  if (!summary) return { title: 'Không tìm thấy bài học' };

  const chapter = getChapterById(chapterId);
  const outline = summary.previewHeadings.map((h) => h.text).join(' · ');

  return {
    title: summary.title,
    description: [
      `Chương ${summary.chapterNumber}${chapter ? `: ${chapter.title}` : ''}.`,
      outline,
      `Thời lượng ~${summary.estimatedMinutes} phút.`,
    ]
      .filter(Boolean)
      .join(' ')
      .slice(0, 300),
    alternates: { canonical: `/courses/${chapterId}/${lessonId}` },
  };
}

function LessonLink({
  lesson,
  direction,
}: {
  lesson: LessonSummary;
  direction: 'prev' | 'next';
}) {
  const isPrev = direction === 'prev';
  return (
    <Link
      href={`/courses/${lesson.chapterId}/${lesson.id}`}
      prefetch={false}
      className={`group flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3.5 transition hover:border-primary/40 hover:bg-muted/40 sm:w-1/2 ${
        isPrev ? '' : 'justify-end text-right'
      }`}
    >
      {isPrev && (
        <ChevronLeft className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:text-primary" />
      )}
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase text-muted-foreground">
          {isPrev ? 'Bài trước' : 'Bài tiếp theo'}
        </div>
        <div className="truncate text-xs font-bold text-foreground transition group-hover:text-primary">
          {lesson.title}
        </div>
      </div>
      {!isPrev && (
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:text-primary" />
      )}
    </Link>
  );
}

export default async function LessonPage({ params }: { params: Promise<Params> }) {
  const { chapterId, lessonId } = await params;
  const lesson = await getLessonDetail(chapterId, lessonId);
  if (!lesson) notFound();

  const chapter = getChapterById(chapterId);
  const { prevLesson, nextLesson } = getAdjacentLessons(chapterId, lessonId);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LessonTopBar
        chapterId={chapterId}
        lessonId={lessonId}
        chapterNumber={lesson.chapterNumber}
        title={lesson.title}
      />

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 items-start">
        <LessonSidebar chapterId={chapterId} lessonId={lessonId} />

        {/* Layout gốc đã bọc children trong <main>, nên ở đây chỉ là <div>:
            hai thẻ <main> lồng nhau là hai landmark "main" trong một trang. */}
        <div className="min-w-0 flex-1">
          <article className="mx-auto max-w-4xl px-4 py-8 sm:px-8 md:px-12">
            <header className="mb-8 border-b border-border/70 pb-6">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                  CHƯƠNG {lesson.chapterNumber} • BÀI {lesson.lessonNumber}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />~{lesson.estimatedMinutes} phút đọc
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  {lesson.wordCount.toLocaleString('vi-VN')} từ
                </span>
              </div>

              <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-foreground sm:text-3xl md:text-4xl">
                {lesson.title}
              </h1>

              {chapter && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {chapter.title} — bài {lesson.order}/{chapter.lessonCount}
                </p>
              )}
            </header>

            {/* Nội dung đã được chuẩn hoá & prerender KaTeX ở bước build */}
            <div
              className="lesson-prose"
              dangerouslySetInnerHTML={{ __html: lesson.contentHtml }}
            />

            <aside className="my-10 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-background p-6 shadow-subtle">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Thực hành ngay trên HSG Judge
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Áp dụng kiến thức vừa học để giải bài tập C++ thực tế với hệ thống chấm đa
                    luồng tự động.
                  </p>
                </div>
                <Link
                  href="/problems"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow transition hover:bg-primary/90"
                >
                  <span>Luyện tập ngay</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </aside>

            <nav
              aria-label="Điều hướng bài học"
              className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border/70 pt-6 sm:flex-row"
            >
              {prevLesson ? (
                <LessonLink lesson={prevLesson} direction="prev" />
              ) : (
                <div className="w-full sm:w-1/2" />
              )}
              {nextLesson ? (
                <LessonLink lesson={nextLesson} direction="next" />
              ) : (
                <div className="w-full sm:w-1/2" />
              )}
            </nav>
          </article>
        </div>

        <LessonToc headings={lesson.headings} />
      </div>

      <LessonCodeTools />
    </div>
  );
}
