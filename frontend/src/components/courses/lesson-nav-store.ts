'use client';

import { useSyncExternalStore } from 'react';

/**
 * Trạng thái mở/đóng của ngăn "Mục lục" trên mobile.
 *
 * Nút bật nằm ở thanh trên (`LessonTopBar`) còn ngăn nằm ở `LessonSidebar` —
 * hai client component tách biệt, cha là Server Component nên không thể nâng
 * state lên. Một module store nhỏ giữ chúng đồng bộ mà không cần Context
 * provider bọc cả trang (Context sẽ bắt trang phải là client component).
 */

let open = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => open;
const getServerSnapshot = () => false;

export function setLessonNavOpen(next: boolean): void {
  if (open === next) return;
  open = next;
  // Khoá cuộn nền khi ngăn đang mở (chỉ ảnh hưởng mobile vì ngăn ẩn ở ≥ lg)
  if (typeof document !== 'undefined') {
    document.body.style.overflow = next ? 'hidden' : '';
  }
  emit();
}

export function toggleLessonNav(): void {
  setLessonNavOpen(!open);
}

export function useLessonNavOpen(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
