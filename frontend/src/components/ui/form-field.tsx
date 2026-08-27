import * as React from 'react';

/**
 * Ô nhập dùng chung cho các form xác thực.
 *
 * Trước đây `login`/`register` viết `<label>` rời không có `htmlFor`, nên bấm
 * vào nhãn không focus được ô nhập và trình đọc màn hình không biết nhãn thuộc
 * về ô nào.
 */
export function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold text-muted-foreground">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p>}
    </div>
  );
}

export const inputClass =
  'w-full rounded-xl border bg-background px-3.5 py-2 text-sm transition ' +
  'placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/70 ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

export const primaryButtonClass =
  'flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm ' +
  'font-semibold text-primary-foreground shadow-subtle transition hover:bg-primary/90 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

/** Khung thẻ trung tâm của trang Đăng nhập / Đăng ký */
export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-[calc(100vh-3.5rem)] items-center justify-center overflow-hidden p-4">
      {/* Vệt sáng gradient nền — thuần trang trí */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-gradient-brand opacity-[0.12] blur-3xl"
      />
      <div className="relative w-full max-w-md animate-fade-in space-y-6 rounded-2xl border bg-card p-8 shadow-elevated">
        {children}
      </div>
    </div>
  );
}
