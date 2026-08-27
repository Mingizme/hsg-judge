'use client';

import * as React from 'react';
import { RotateCcw, Type, ShieldCheck, GraduationCap } from 'lucide-react';

interface EditorToolbarProps {
  problemCode: string;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  onReset: () => void;
  isTeacher?: boolean;
}

export function EditorToolbar({
  problemCode,
  fontSize,
  onFontSizeChange,
  onReset,
  isTeacher,
}: EditorToolbarProps) {
  return (
    <div className="flex h-10 w-full shrink-0 items-center justify-between border-b bg-muted/50 px-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center rounded-sm border border-info/20 bg-info/10 px-1.5 py-0.5 text-xs font-medium text-info">
            C++ 17
          </span>
          {isTeacher ? (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded border border-warning/20 bg-warning/10 text-warning">
              <ShieldCheck className="w-3 h-3" aria-hidden /> Lời giải mẫu Giáo viên
            </span>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              <GraduationCap className="w-3 h-3" aria-hidden /> Khung code làm bài
            </span>
          )}
        </div>
        <div className="h-4 w-px bg-border" />
        <span className="text-sm text-muted-foreground font-mono">{problemCode.toLowerCase()}.cpp</span>
      </div>

      <div className="flex items-center gap-1 text-muted-foreground">
        <div className="flex items-center rounded-md border bg-background px-1 shadow-sm mr-2">
          <button
            type="button"
            className="p-1 transition-colors hover:text-foreground disabled:opacity-50"
            onClick={() => onFontSizeChange(Math.max(10, fontSize - 1))}
            disabled={fontSize <= 10}
            aria-label="Giảm cỡ chữ"
            title="Giảm cỡ chữ"
          >
            <Type className="h-3.5 w-3.5" aria-hidden />
          </button>
          <span className="text-xs font-medium w-6 text-center select-none">{fontSize}</span>
          <button
            type="button"
            className="p-1 transition-colors hover:text-foreground disabled:opacity-50"
            onClick={() => onFontSizeChange(Math.min(24, fontSize + 1))}
            disabled={fontSize >= 24}
            aria-label="Tăng cỡ chữ"
            title="Tăng cỡ chữ"
          >
            <Type className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <button
          type="button"
          className="rounded p-1.5 hover:bg-muted hover:text-foreground transition-colors"
          onClick={onReset}
          aria-label="Khôi phục khung code ban đầu"
          title="Khôi phục khung code ban đầu"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
