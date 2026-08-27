import coursesIndex from '@/data/courses-index.json';

export interface HeadingItem {
  /** 1 = mốc "Phần", 2 = h2, 3 = h3, 4 = h4 */
  level: number;
  text: string;
  /** `id` thật đã được ghi vào HTML bởi `scripts/normalize-course-lessons.mjs` */
  id: string;
}

export interface LessonSummary {
  id: string;
  chapterId: string;
  chapterNumber: number;
  lessonNumber: number;
  order: number;
  title: string;
  estimatedMinutes: number;
  headingsCount: number;
  previewHeadings: HeadingItem[];
}

export interface ChapterInfo {
  id: string;
  chapterNumber: number;
  rawName: string;
  title: string;
  lessonCount: number;
  lessons: LessonSummary[];
}

export interface LessonDetail {
  id: string;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  order: number;
  lessonNumber: number;
  title: string;
  wordCount: number;
  estimatedMinutes: number;
  headings: HeadingItem[];
  contentHtml: string;
}

export interface CourseIndexData {
  chapters: ChapterInfo[];
  totalLessons: number;
}

/**
 * `courses-index.json` được sinh lại từ chính các file bài học nên luôn khớp
 * dữ liệu. File chỉ ~30 KB (metadata) — an toàn để import ở cả client.
 * Nội dung bài học 3,7 MB nằm ở `courses-server.ts`, KHÔNG bao giờ vào bundle
 * client.
 */
const index = coursesIndex as CourseIndexData;

export function getCourseIndex(): CourseIndexData {
  return index;
}

export function getAllChapters(): ChapterInfo[] {
  return index.chapters;
}

export function getChapterById(chapterId: string): ChapterInfo | undefined {
  return index.chapters.find((c) => c.id === chapterId);
}

/** Danh sách phẳng theo đúng thứ tự học: chương tăng dần, trong chương theo `order` */
const flatLessons: LessonSummary[] = index.chapters
  .slice()
  .sort((a, b) => a.chapterNumber - b.chapterNumber)
  .flatMap((c) => c.lessons.slice().sort((a, b) => a.order - b.order));

export function getAllLessons(): LessonSummary[] {
  return flatLessons;
}

export function getTotalLessons(): number {
  return flatLessons.length;
}

/** Khoá tra cứu duy nhất cho một bài: `chuong-3/bai-2` */
export function lessonKey(chapterId: string, lessonId: string): string {
  return `${chapterId}/${lessonId}`;
}

const byKey = new Map(flatLessons.map((l) => [lessonKey(l.chapterId, l.id), l]));

/** Trả về metadata bài học, hoặc `undefined` nếu id không tồn tại trong index */
export function getLessonSummary(
  chapterId: string,
  lessonId: string,
): LessonSummary | undefined {
  return byKey.get(lessonKey(chapterId, lessonId));
}

export function lessonExists(chapterId: string, lessonId: string): boolean {
  return byKey.has(lessonKey(chapterId, lessonId));
}

/** Tập id hợp lệ — dùng để lọc tiến độ cũ trong localStorage khi dữ liệu đổi */
export function getAllLessonKeys(): string[] {
  return [...byKey.keys()];
}

/**
 * Bài trước / bài sau theo lộ trình phẳng (cố ý cho phép nhảy sang chương kế
 * tiếp — đây là một khoá học tuyến tính, không phải 4 khoá rời rạc).
 */
export function getAdjacentLessons(chapterId: string, lessonId: string) {
  const at = flatLessons.findIndex(
    (l) => l.chapterId === chapterId && l.id === lessonId,
  );

  return {
    prevLesson: at > 0 ? flatLessons[at - 1] : null,
    nextLesson: at >= 0 && at < flatLessons.length - 1 ? flatLessons[at + 1] : null,
  };
}
