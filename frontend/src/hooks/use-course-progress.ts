'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { getAllLessonKeys, getTotalLessons, lessonKey } from '@/lib/courses-api';

/**
 * Tiến độ khoá học (localStorage) dùng CHUNG cho mọi component.
 *
 * Trước đây trang danh sách và trang bài học mỗi bên tự `useState` +
 * `localStorage.getItem` trong `useEffect`, nên:
 *   · đánh dấu "đã học" ở trang bài học không cập nhật trang danh sách,
 *   · mở hai tab thì tab cũ ghi đè tiến độ của tab mới,
 *   · id cũ (đã đổi dữ liệu) nằm mãi trong mảng và làm `completedCount`
 *     vượt quá tổng số bài → thanh tiến độ hiện > 100%.
 *
 * Ở đây dùng một module store + `useSyncExternalStore`: đọc localStorage LẦN
 * ĐẦU trong `subscribe` (chạy ở effect) nên không lệch hydration, mọi
 * component cùng nhìn một snapshot, và `storage` event đồng bộ giữa các tab.
 */

const PROGRESS_KEY = 'hsg_completed_lessons';
const LAST_KEY = 'hsg_last_lesson';

export interface LastLesson {
  chapterId: string;
  lessonId: string;
  title: string;
}

/** Snapshot rỗng dùng chung — giữ nguyên tham chiếu để không loop re-render */
const EMPTY: readonly string[] = Object.freeze([]);

let completed: readonly string[] = EMPTY;
let lastLesson: LastLesson | null = null;
let hydrated = false;

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** `chapterId/lessonId` → khoá hợp lệ; dùng để loại bỏ tiến độ của bài đã xoá */
let validKeys: Set<string> | null = null;
/** `lessonId` → khoá đầy đủ; dùng để nâng cấp dữ liệu lưu theo định dạng cũ */
let legacyKeys: Map<string, string> | null = null;

function ensureMaps() {
  if (validKeys && legacyKeys) return { valid: validKeys, legacy: legacyKeys };
  const valid = new Set(getAllLessonKeys());
  const legacy = new Map<string, string>();
  for (const key of valid) {
    const lessonId = key.slice(key.indexOf('/') + 1);
    // Chỉ nhận khi lessonId là duy nhất toàn khoá học, tránh gán sai chương
    if (legacy.has(lessonId)) legacy.set(lessonId, '');
    else legacy.set(lessonId, key);
  }
  validKeys = valid;
  legacyKeys = legacy;
  return { valid, legacy };
}

/**
 * Đọc mảng tiến độ đã lưu. Chấp nhận cả định dạng cũ (chỉ `lessonId`) và mới
 * (`chapterId/lessonId`), loại bỏ mọi id không còn tồn tại trong index.
 */
function parseCompleted(raw: string | null): readonly string[] {
  if (!raw) return EMPTY;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return EMPTY;
  }
  if (!Array.isArray(parsed)) return EMPTY;

  const { valid, legacy } = ensureMaps();
  const out = new Set<string>();
  for (const item of parsed) {
    if (typeof item !== 'string') continue;
    if (valid.has(item)) {
      out.add(item);
      continue;
    }
    const upgraded = legacy.get(item);
    if (upgraded) out.add(upgraded);
  }
  return out.size ? [...out] : EMPTY;
}

function parseLast(raw: string | null): LastLesson | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const { chapterId, lessonId, title } = parsed as Record<string, unknown>;
  if (typeof chapterId !== 'string' || typeof lessonId !== 'string') return null;
  // Bài đã bị xoá/đổi id thì không hiện nút "Học tiếp" trỏ vào trang 404
  if (!ensureMaps().valid.has(lessonKey(chapterId, lessonId))) return null;
  return { chapterId, lessonId, title: typeof title === 'string' ? title : lessonId };
}

function readStorage() {
  try {
    completed = parseCompleted(localStorage.getItem(PROGRESS_KEY));
    lastLesson = parseLast(localStorage.getItem(LAST_KEY));
  } catch {
    completed = EMPTY;
    lastLesson = null;
  }
}

function persistCompleted() {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(completed));
  } catch {
    // localStorage bị chặn (private mode/quota) → tiến độ chỉ sống trong phiên
  }
}

function onStorage(event: StorageEvent) {
  if (event.key !== null && event.key !== PROGRESS_KEY && event.key !== LAST_KEY) return;
  readStorage();
  emit();
}

function subscribe(listener: () => void): () => void {
  if (!hydrated) {
    hydrated = true;
    readStorage();
    // Thông báo sau khi commit để snapshot đầu tiên (rỗng) khớp với SSR
    queueMicrotask(emit);
  }
  if (listeners.size === 0) window.addEventListener('storage', onStorage);
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('storage', onStorage);
  };
}

const getCompletedSnapshot = () => completed;
const getLastSnapshot = () => lastLesson;
const getServerCompleted = () => EMPTY;
const getServerLast = () => null;

/** Bật/tắt trạng thái "đã học" của một bài — dùng được ngoài React */
export function toggleLessonCompleted(chapterId: string, lessonId: string): void {
  const key = lessonKey(chapterId, lessonId);
  if (!ensureMaps().valid.has(key)) return;
  completed = completed.includes(key)
    ? completed.filter((k) => k !== key)
    : [...completed, key];
  persistCompleted();
  emit();
}

/** Ghi nhớ bài đang đọc để trang danh sách hiện nút "Học tiếp" */
export function rememberLastLesson(next: LastLesson): void {
  if (!ensureMaps().valid.has(lessonKey(next.chapterId, next.lessonId))) return;
  if (
    lastLesson &&
    lastLesson.chapterId === next.chapterId &&
    lastLesson.lessonId === next.lessonId
  ) {
    return;
  }
  lastLesson = next;
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify(next));
  } catch {
    // như trên: không có localStorage thì bỏ qua
  }
  emit();
}

export interface CourseProgress {
  /** Danh sách khoá `chapterId/lessonId` đã hoàn thành */
  completedKeys: readonly string[];
  completedCount: number;
  totalLessons: number;
  /** 0–100, đã kẹp trần nên không bao giờ vượt 100% */
  percent: number;
  isCompleted: (chapterId: string, lessonId: string) => boolean;
  toggle: (chapterId: string, lessonId: string) => void;
}

export function useCourseProgress(): CourseProgress {
  const completedKeys = useSyncExternalStore(
    subscribe,
    getCompletedSnapshot,
    getServerCompleted,
  );

  return useMemo(() => {
    const set = new Set(completedKeys);
    const totalLessons = getTotalLessons();
    const completedCount = Math.min(set.size, totalLessons);
    return {
      completedKeys,
      completedCount,
      totalLessons,
      percent: totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0,
      isCompleted: (chapterId: string, lessonId: string) =>
        set.has(lessonKey(chapterId, lessonId)),
      toggle: toggleLessonCompleted,
    };
  }, [completedKeys]);
}

export function useLastLesson(): LastLesson | null {
  return useSyncExternalStore(subscribe, getLastSnapshot, getServerLast);
}
