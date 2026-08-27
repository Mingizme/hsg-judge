'use client';

import { useEffect } from 'react';

/**
 * Gắn thanh tiêu đề + nút "Sao chép" THẬT cho mọi khối code của bài học.
 *
 * HTML gốc có sẵn một nút "Sao chép" nhưng là HTML tĩnh không handler (bấm
 * không làm gì); `normalize-course-lessons.mjs` đã bỏ nút chết đó và giữ lại
 * nhãn ngôn ngữ dưới dạng `data-lang`/`data-caption` trên `<pre>`. Component
 * này là client island duy nhất chạm vào nội dung — bài học vẫn được Server
 * Component render, nên 1,2 MB HTML không phải đi qua prop `children`.
 */

const ENHANCED = 'data-code-tools';

/** Lấy code sạch để copy: bỏ cột số dòng (`.ln`) do trang gốc chèn */
function plainCode(pre: HTMLElement): string {
  const code = pre.querySelector('code') ?? pre;
  const clone = code.cloneNode(true) as HTMLElement;
  for (const ln of clone.querySelectorAll('.ln')) ln.remove();
  return clone.textContent?.replace(/\s+$/, '') ?? '';
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Trình duyệt chặn Clipboard API (không phải HTTPS/localhost) → thử cách cũ
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

export function LessonCodeTools({ selector = '.lesson-prose' }: { selector?: string }) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(selector);
    if (!root) return;

    // 1. Bọc mỗi <pre> bằng thanh tiêu đề + nút copy (idempotent)
    for (const pre of root.querySelectorAll<HTMLElement>('pre')) {
      if (pre.parentElement?.hasAttribute(ENHANCED)) continue;

      const wrap = document.createElement('div');
      wrap.setAttribute(ENHANCED, '');
      wrap.className = 'lesson-code';

      const bar = document.createElement('div');
      bar.className = 'lesson-code-bar';

      const lang = document.createElement('span');
      lang.className = 'lesson-code-lang';
      lang.textContent = pre.dataset.lang || 'cpp';
      bar.appendChild(lang);

      if (pre.dataset.caption) {
        const caption = document.createElement('span');
        caption.className = 'lesson-code-caption';
        caption.textContent = pre.dataset.caption;
        bar.appendChild(caption);
      }

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'lesson-code-copy';
      button.dataset.copy = '';
      button.textContent = 'Sao chép';
      bar.appendChild(button);

      pre.parentNode?.insertBefore(wrap, pre);
      wrap.appendChild(bar);
      wrap.appendChild(pre);
    }

    // 2. Một listener uỷ quyền cho tất cả nút → không cần dọn từng nút
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onClick = async (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest<HTMLButtonElement>('button[data-copy]');
      const pre = button?.parentElement?.parentElement?.querySelector<HTMLElement>('pre');
      if (!button || !pre) return;

      const ok = await copyText(plainCode(pre));
      button.textContent = ok ? 'Đã sao chép' : 'Không sao chép được';
      button.dataset.state = ok ? 'ok' : 'error';
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        button.textContent = 'Sao chép';
        delete button.dataset.state;
      }, 1800);
    };

    root.addEventListener('click', onClick);
    return () => {
      root.removeEventListener('click', onClick);
      if (timer) clearTimeout(timer);
    };
  }, [selector]);

  return null;
}
