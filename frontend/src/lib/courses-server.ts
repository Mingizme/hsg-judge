import 'server-only';
import { cache } from 'react';
import { getAllLessons, getLessonSummary, type LessonDetail } from './courses-api';

/**
 * Nội dung bài học (3,7 MB HTML cho 20 bài) CHỈ được đọc ở phía server.
 *
 * Trước đây `getLessonDetail` nằm trong `courses-api.ts` và được gọi từ một
 * client component, nên webpack kéo cả 20 file JSON vào bundle trình duyệt và
 * `chapterId`/`lessonId` lấy thẳng từ URL được nhét vào đường dẫn `import()`.
 * Ở đây id luôn được đối chiếu với index trước khi dùng, và `import 'server-only'`
 * khiến build vỡ ngay nếu có ai lỡ import file này từ client.
 */
export const getLessonDetail = cache(
  async (chapterId: string, lessonId: string): Promise<LessonDetail | null> => {
    // Chỉ nhận đúng id có trong index → không thể tạo đường dẫn lạ từ URL
    if (!getLessonSummary(chapterId, lessonId)) return null;

    const mod = await import(`@/data/course-lessons/${chapterId}_${lessonId}.json`);
    return mod.default as LessonDetail;
  },
);

/** Tham số cho `generateStaticParams` — prerender toàn bộ 20 bài lúc build */
export function getAllLessonParams(): { chapterId: string; lessonId: string }[] {
  return getAllLessons().map((l) => ({ chapterId: l.chapterId, lessonId: l.id }));
}
