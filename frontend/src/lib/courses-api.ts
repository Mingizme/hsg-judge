import coursesIndex from '@/data/courses-index.json';

export interface LessonSummary {
  id: string;
  chapterId: string;
  chapterNumber: number;
  lessonNumber: number;
  order: number;
  title: string;
  estimatedMinutes: number;
  headingsCount: number;
  previewHeadings: { level: number; text: string; id: string }[];
}

export interface ChapterInfo {
  id: string;
  chapterNumber: number;
  rawName: string;
  title: string;
  lessonCount: number;
  lessons: LessonSummary[];
}

export interface HeadingItem {
  level: number;
  text: string;
  id: string;
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

export function getCourseIndex(): CourseIndexData {
  return coursesIndex as CourseIndexData;
}

export function getAllChapters(): ChapterInfo[] {
  return coursesIndex.chapters as ChapterInfo[];
}

export function getChapterById(chapterId: string): ChapterInfo | undefined {
  return (coursesIndex.chapters as ChapterInfo[]).find((c) => c.id === chapterId);
}

export function getAllLessons(): LessonSummary[] {
  const all: LessonSummary[] = [];
  (coursesIndex.chapters as ChapterInfo[]).forEach((c) => {
    c.lessons.forEach((l) => all.push(l));
  });
  return all;
}

export async function getLessonDetail(
  chapterId: string,
  lessonId: string,
): Promise<LessonDetail | null> {
  try {
    const data = await import(`@/data/course-lessons/${chapterId}_${lessonId}.json`);
    return data.default as LessonDetail;
  } catch (err) {
    console.error(`Failed to load lesson: ${chapterId}/${lessonId}`, err);
    return null;
  }
}

export function getAdjacentLessons(chapterId: string, lessonId: string) {
  const all = getAllLessons();
  const currentIndex = all.findIndex(
    (l) => l.chapterId === chapterId && l.id === lessonId,
  );

  return {
    prevLesson: currentIndex > 0 ? all[currentIndex - 1] : null,
    nextLesson: currentIndex >= 0 && currentIndex < all.length - 1 ? all[currentIndex + 1] : null,
  };
}
