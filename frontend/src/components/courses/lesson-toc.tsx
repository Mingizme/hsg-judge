'use client';

import { useEffect, useRef, useState } from 'react';
import { List } from 'lucide-react';
import type { HeadingItem } from '@/lib/courses-api';
import { cn } from '@/lib/utils';

/** Khoảng chừa cho navbar (3,5rem) + thanh bài học (3rem) + đệm đọc */
const OFFSET = 128;

/**
 * Mục lục bên phải, tự làm nổi bật mục đang đọc.
 *
 * Bản cũ nghe `scroll` không throttle rồi slugify lại `innerText` của TỪNG
 * heading ở mỗi frame để đoán id, so sánh bằng `offsetTop` (tính theo
 * offsetParent nên sai khi heading nằm trong bảng/div có position) và khi bấm
 * thì so khớp mờ `includes` — 13 mục "Ví dụ" cùng slug luôn nhảy về mục đầu.
 *
 * Nay HTML đã có `id` thật do `normalize-course-lessons.mjs` ghi vào, nên chỉ
 * cần `<a href="#id">` (deep-link được, không cần JS để nhảy) và một
 * IntersectionObserver chỉ chạy khi có heading vượt qua mốc đọc.
 */
export function LessonToc({ headings }: { headings: HeadingItem[] }) {
  const [activeId, setActiveId] = useState('');
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (headings.length === 0) return;

    const els = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    const pick = () => {
      let current = els[0];
      for (const el of els) {
        if (el.getBoundingClientRect().top - OFFSET <= 0) current = el;
        else break;
      }
      setActiveId(current.id);
    };

    // IO chỉ báo khi một heading đi qua mốc OFFSET → rẻ hơn nghe scroll
    const io = new IntersectionObserver(pick, {
      rootMargin: `-${OFFSET}px 0px 0px 0px`,
      threshold: 0,
    });
    for (const el of els) io.observe(el);

    /**
     * IO chỉ phát tín hiệu khi có heading VƯỢT QUA mốc. Bấm một mục mục lục thì
     * `scroll-margin-top: 7.5rem` (120px) dừng heading ngay sát dưới mốc 128px:
     * lần gọi IO cuối rơi vào lúc heading còn ở ~130px nên mục được tô vẫn là
     * mục trước đó, và không còn lần vượt mốc nào để sửa lại. Nghe thêm
     * `hashchange` (tô đúng ngay khi bấm) và `scrollend` (chốt lại khi trang
     * dừng hẳn) — cả hai chỉ chạy một lần mỗi thao tác, không phải mỗi frame.
     */
    const knownId = (id: string) => els.some((el) => el.id === id);
    const onHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (id && knownId(id)) setActiveId(id);
      else pick();
    };
    const supportsScrollEnd = 'onscrollend' in window;
    window.addEventListener('hashchange', onHash);
    if (supportsScrollEnd) window.addEventListener('scrollend', pick);

    // Mở trang bằng deep-link (#id) thì tô đúng mục đó ngay
    const fromHash = decodeURIComponent(window.location.hash.slice(1));
    if (fromHash && knownId(fromHash)) setActiveId(fromHash);
    else pick();

    return () => {
      io.disconnect();
      window.removeEventListener('hashchange', onHash);
      if (supportsScrollEnd) window.removeEventListener('scrollend', pick);
    };
  }, [headings]);

  // Kéo mục đang đọc vào giữa khung mục lục — chỉ cuộn khung, không cuộn trang
  useEffect(() => {
    const box = navRef.current;
    if (!box || !activeId) return;
    const item = box.querySelector<HTMLElement>('[data-active="true"]');
    if (!item) return;
    const target = item.offsetTop - box.clientHeight / 2 + item.clientHeight / 2;
    box.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
  }, [activeId]);

  if (headings.length === 0) return null;

  return (
    <aside className="sticky top-[6.5rem] hidden h-[calc(100vh-6.5rem)] w-72 shrink-0 flex-col self-start border-l border-border p-6 xl:flex">
      <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <List className="h-3.5 w-3.5 text-primary" />
        <span>Mục lục bài học</span>
      </div>

      <nav
        ref={navRef}
        aria-label="Mục lục bài học"
        className="relative flex-1 overflow-y-auto text-xs"
      >
        {headings.map((h) => {
          const isActive = activeId === h.id;
          return (
            <a
              key={h.id}
              href={`#${h.id}`}
              data-active={isActive}
              aria-current={isActive ? 'location' : undefined}
              className={cn(
                // Viền trái của từng mục ghép lại thành thanh dẫn liền mạch,
                // nên mục đang đọc chỉ cần đổi màu viền (không lệch thụt lề)
                'block truncate border-l-2 py-1.5 transition',
                h.level === 1 ? 'pl-3 font-semibold' : h.level === 2 ? 'pl-3' : 'text-[11px]',
                h.level === 3 && 'pl-6',
                h.level === 4 && 'pl-9',
                isActive
                  ? 'border-primary font-bold text-primary'
                  : 'border-border/70 text-muted-foreground hover:border-border hover:text-foreground',
              )}
              title={h.text}
            >
              {h.text}
            </a>
          );
        })}
      </nav>
    </aside>
  );
}
