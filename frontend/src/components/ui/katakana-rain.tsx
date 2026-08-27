'use client';

/**
 * Nền "mưa chữ Nhật" cho trang chủ (katakana + hiragana rơi dọc từ trên xuống).
 *
 * Vẽ trên <canvas> thay vì hàng trăm phần tử DOM: mỗi cột là một dòng chữ rơi,
 * đầu dòng sáng nhất rồi mờ dần thành vệt — đúng chất màn hình terminal của
 * coder. Vệt mờ tạo bằng `globalCompositeOperation = 'destination-out'` chứ
 * không tô lại màu nền, nhờ vậy canvas LUÔN TRONG SUỐT và dùng chung được cho
 * cả giao diện Sáng và Tối mà không cần biết màu nền là gì.
 *
 * Màu đọc trực tiếp từ token `--brand-from / --brand-via / --brand-to` trong
 * `globals.css` rồi nội suy theo vị trí cột + độ sâu, nên cả màn hình là một
 * dải gradient chuyển động khớp đúng bộ màu thương hiệu; đổi theme là màu mưa
 * đổi theo (effect chạy lại khi `resolvedTheme` thay đổi).
 *
 * Tôn trọng `prefers-reduced-motion`: chỉ vẽ MỘT khung tĩnh rồi dừng, không
 * `requestAnimationFrame`. Tự dừng khi tab bị ẩn để không đốt CPU/pin.
 */

import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

/** Katakana — bộ chữ kinh điển của hiệu ứng mưa số */
const KATAKANA =
  'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポヴ';
/** Hiragana — nét mềm hơn, xen vào cho dải chữ đỡ đơn điệu */
const HIRAGANA =
  'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ';
/** Một ít ký tự code để ra chất "coder", cố ý để tần suất thấp */
const CODE_GLYPHS = '01{}[]<>=+*/;#&|!%';

/** Katakana lặp 2 lần → chiếm ~55% số ký tự, giữ đúng tinh thần Matrix */
const GLYPHS = (KATAKANA + KATAKANA + HIRAGANA + CODE_GLYPHS).split('');

interface Hsl {
  h: number;
  s: number;
  l: number;
}

/** Đọc biến CSS dạng `221.2 83.2% 53.3%` (quy ước token của shadcn) */
function readHsl(
  styles: CSSStyleDeclaration,
  name: string,
  fallback: Hsl,
): Hsl {
  const parts = styles
    .getPropertyValue(name)
    .trim()
    .split(/\s+/)
    .map((p) => parseFloat(p));

  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) {
    return fallback;
  }
  return { h: parts[0], s: parts[1], l: parts[2] };
}

function mixHsl(a: Hsl, b: Hsl, t: number): Hsl {
  return {
    h: a.h + (b.h - a.h) * t,
    s: a.s + (b.s - a.s) * t,
    l: a.l + (b.l - a.l) * t,
  };
}

/** `t ∈ [0,1]` → màu trên dải gradient 3 chặng from → via → to */
function brandAt(stops: readonly [Hsl, Hsl, Hsl], t: number): Hsl {
  const c = Math.min(1, Math.max(0, t));
  return c < 0.5
    ? mixHsl(stops[0], stops[1], c * 2)
    : mixHsl(stops[1], stops[2], (c - 0.5) * 2);
}

function hsla(c: Hsl, alpha: number): string {
  // Dùng cú pháp dấu phẩy: `hsl(h s% l% / a)` không được mọi engine canvas nhận
  return `hsla(${c.h.toFixed(1)}, ${c.s.toFixed(1)}%, ${c.l.toFixed(1)}%, ${alpha.toFixed(3)})`;
}

interface RainColumn {
  /** tâm cột theo px */
  x: number;
  /** vị trí đầu dòng (float, px) */
  y: number;
  /** y của ký tự vừa vẽ — mốc để biết khi nào rơi thêm một ô */
  rowY: number;
  /** px/giây */
  speed: number;
}

export function KatakanaRain({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isDark = resolvedTheme !== 'light';
    const rootStyles = getComputedStyle(document.documentElement);

    const stops: readonly [Hsl, Hsl, Hsl] = [
      readHsl(rootStyles, '--brand-from', { h: 217, s: 91, l: 60 }),
      readHsl(rootStyles, '--brand-via', { h: 255, s: 91, l: 68 }),
      readHsl(rootStyles, '--brand-to', { h: 187, s: 92, l: 55 }),
    ];

    /**
     * `ctx.font` KHÔNG hiểu `var(--font-mono)`, nên phải lấy giá trị đã resolve
     * của biến do `next/font` sinh ra (tên họ font kiểu `__JetBrains_Mono_xxx`).
     * Chữ Nhật không có trong JetBrains Mono → trình duyệt tự fallback sang font
     * Nhật của hệ thống, đó là hành vi mong muốn.
     */
    const monoVar = rootStyles.getPropertyValue('--font-mono').trim();
    const fontStack = `${monoVar ? `${monoVar}, ` : ''}ui-monospace, SFMono-Regular, Menlo, monospace`;

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    let width = 0;
    let height = 0;
    let cell = 0;
    let fontSize = 0;
    let columns: RainColumn[] = [];
    let raf = 0;
    let resizeTimer = 0;
    let last = 0;

    const randomSpeed = () => (24 + Math.random() * 86) * (fontSize / 16);

    const resetColumn = (col: RainColumn) => {
      // Lùi đầu dòng lên trên mép màn hình một khoảng ngẫu nhiên → các cột
      // không bao giờ rơi thành hàng thẳng, và có những quãng trống tự nhiên.
      col.rowY = -cell * (2 + Math.random() * 26);
      col.y = col.rowY;
      col.speed = randomSpeed();
    };

    const makeColumn = (index: number): RainColumn => {
      const col: RainColumn = {
        x: index * cell + cell / 2,
        y: 0,
        rowY: 0,
        speed: 0,
      };
      resetColumn(col);
      // Rải đầu dòng RA KHẮP chiều cao (một phần ở trên mép) để vừa vào trang là
      // đã thấy mưa kín màn hình, thay vì phải đợi vài giây cho chữ rơi xuống.
      col.rowY = Math.random() * (height + cell * 8) - cell * 8;
      col.y = col.rowY;
      return col;
    };

    const drawGlyph = (
      col: RainColumn,
      y: number,
      head: boolean,
      alphaScale = 1,
    ) => {
      // Gradient theo CẢ trục ngang (đổi màu dọc màn hình) lẫn độ sâu rơi
      const t =
        (col.x / Math.max(1, width)) * 0.72 +
        (Math.max(0, y) / Math.max(1, height)) * 0.28;
      const base = brandAt(stops, t);

      const color: Hsl = head
        ? {
            h: base.h,
            s: isDark ? Math.min(100, base.s + 6) : base.s,
            l: isDark ? Math.min(94, base.l + 32) : Math.max(30, base.l - 12),
          }
        : {
            h: base.h,
            s: base.s,
            l: isDark ? Math.min(80, base.l + 6) : Math.max(38, base.l - 4),
          };

      const alpha =
        (head ? (isDark ? 0.95 : 0.85) : isDark ? 0.68 : 0.6) * alphaScale;

      ctx.font = `${head ? 600 : 400} ${fontSize}px ${fontStack}`;
      ctx.fillStyle = hsla(color, alpha);

      if (head) {
        ctx.shadowColor = hsla(base, isDark ? 0.9 : 0.45);
        ctx.shadowBlur = fontSize * 0.9;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], col.x, y);
      ctx.shadowBlur = 0;
    };

    const setup = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      width = canvas.clientWidth || window.innerWidth;
      height = canvas.clientHeight || window.innerHeight;

      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      fontSize = width < 640 ? 13 : width < 1280 ? 15 : 17;
      cell = Math.round(fontSize * 1.45);

      columns = Array.from({ length: Math.max(1, Math.ceil(width / cell)) }, (_, i) =>
        makeColumn(i),
      );

      ctx.clearRect(0, 0, width, height);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
    };

    /** Khung tĩnh cho người bật "giảm chuyển động": vẫn ra chất, nhưng bất động */
    const drawStatic = () => {
      for (const col of columns) {
        const rows = 5 + Math.floor(Math.random() * 12);
        const startY = Math.random() * height * 0.85;
        for (let r = 0; r < rows; r++) {
          const y = startY + r * cell;
          if (y > height) break;
          drawGlyph(col, y, r === rows - 1, 0.35 + (0.65 * r) / rows);
        }
      }
    };

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;

      // Mờ dần khung cũ NHƯNG giữ canvas trong suốt: `destination-out` chỉ trừ
      // alpha của pixel đã vẽ, không thêm màu nền nào vào.
      // Hệ số 1.7 cho vệt dài ~6–8 ký tự — đủ để đọc ra "dòng chữ đang rơi"
      // thay vì những ký tự rời rạc.
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(0.4, dt * 1.7).toFixed(3)})`;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';

      for (const col of columns) {
        col.y += col.speed * dt;

        // Chặn trần vòng lặp: tab bị treo lâu có thể cho `dt` rất lớn
        let guard = 0;
        while (col.y >= col.rowY + cell && guard < 8) {
          col.rowY += cell;
          drawGlyph(col, col.rowY, true);
          guard++;
        }

        if (col.rowY > height + cell) resetColumn(col);
      }

      raf = requestAnimationFrame(step);
    };

    setup();
    if (reduceMotion) {
      drawStatic();
    } else {
      last = performance.now();
      raf = requestAnimationFrame(step);
    }

    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        setup();
        if (reduceMotion) drawStatic();
      }, 160);
    };

    /** Tab ẩn thì dừng hẳn vòng vẽ — không có lý do gì để chạy nền */
    const onVisibility = () => {
      if (reduceMotion) return;
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(step);
      }
    };

    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [resolvedTheme]);

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none fixed inset-0 -z-10 overflow-hidden',
        className,
      )}
    >
      {/* Hai quầng sáng gradient thương hiệu — cho nền có chiều sâu */}
      <div className="absolute -top-1/3 left-1/2 h-[70vh] w-[80vw] -translate-x-1/2 rounded-full bg-gradient-brand opacity-[0.09] blur-[130px] dark:opacity-[0.18]" />
      <div className="absolute -bottom-1/4 -right-[10%] h-[55vh] w-[55vw] rounded-full bg-brand-to opacity-[0.07] blur-[130px] dark:opacity-[0.14]" />

      {/* Lưới mảnh kiểu editor */}
      <div className="grid-overlay absolute inset-0 opacity-40 dark:opacity-25" />

      {/* Mưa chữ */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full opacity-[0.38] dark:opacity-[0.72]"
      />

      {/* Màn che dịu ở giữa: chữ nội dung luôn đọc rõ, mưa chỉ còn ở viền */}
      <div className="rain-veil absolute inset-0" />
    </div>
  );
}

export default KatakanaRain;
