'use client';

import * as React from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PdfViewerProps {
  pdfUrl?: string;
}

export function PdfViewer({ pdfUrl }: PdfViewerProps) {
  const [zoom, setZoom] = React.useState(100);

  if (!pdfUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6 text-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <div className="rounded-full bg-muted p-4">
            <svg
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-foreground">Chưa có đề bài</h3>
          <p className="text-sm">Đề bài cho bài tập này hiện chưa khả dụng.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden relative group">
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-md border bg-background/80 px-2 py-1 shadow-sm backdrop-blur transition-opacity opacity-0 group-hover:opacity-100">
        <button
          onClick={() => setZoom(Math.max(50, zoom - 10))}
          className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground"
          aria-label="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="text-xs font-medium w-10 text-center">{zoom}%</span>
        <button
          onClick={() => setZoom(Math.min(200, zoom + 10))}
          className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground"
          aria-label="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        <button
          onClick={() => setZoom(100)}
          className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground"
          aria-label="Fit width"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
      
      <div className="flex-1 w-full h-full overflow-auto flex justify-center custom-scrollbar">
        <div 
          className="w-full h-full transition-transform origin-top"
          style={{ transform: `scale(${zoom / 100})`, width: `${100 * (100 / zoom)}%`, height: `${100 * (100 / zoom)}%` }}
        >
          {/* using iframe as standard cross-browser standard. CSS filter invert for dark mode */}
          <iframe 
            src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
            className="w-full h-full border-none dark:invert dark:hue-rotate-180" 
            title="Đề bài PDF"
          />
        </div>
      </div>
    </div>
  );
}
