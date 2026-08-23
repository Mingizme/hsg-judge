'use client';

import * as React from 'react';
import { RotateCcw, Settings, Type } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditorToolbarProps {
  problemCode: string;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  onReset: () => void;
}

export function EditorToolbar({ problemCode, fontSize, onFontSizeChange, onReset }: EditorToolbarProps) {
  return (
    <div className="flex h-10 w-full shrink-0 items-center justify-between border-b bg-muted/50 px-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center rounded-sm bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
            C++ 17
          </span>
        </div>
        <div className="h-4 w-px bg-border" />
        <span className="text-sm text-muted-foreground font-mono">{problemCode.toLowerCase()}.cpp</span>
      </div>

      <div className="flex items-center gap-1 text-muted-foreground">
        <div className="flex items-center rounded-md border bg-background px-1 shadow-sm mr-2">
          <button 
            className="p-1 hover:text-foreground disabled:opacity-50" 
            onClick={() => onFontSizeChange(Math.max(10, fontSize - 1))}
            disabled={fontSize <= 10}
            title="Giảm cỡ chữ"
          >
            <Type className="h-3.5 w-3.5" />
          </button>
          <span className="text-xs font-medium w-6 text-center select-none">{fontSize}</span>
          <button 
            className="p-1 hover:text-foreground disabled:opacity-50"
            onClick={() => onFontSizeChange(Math.min(24, fontSize + 1))}
            disabled={fontSize >= 24}
            title="Tăng cỡ chữ"
          >
            <Type className="h-4 w-4" />
          </button>
        </div>

        <button 
          className="rounded p-1.5 hover:bg-muted hover:text-foreground transition-colors"
          onClick={onReset}
          title="Khôi phục code mặc định"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button 
          className="rounded p-1.5 hover:bg-muted hover:text-foreground transition-colors"
          title="Cài đặt trình biên dịch"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
