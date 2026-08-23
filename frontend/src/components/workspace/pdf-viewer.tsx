'use client';

import * as React from 'react';
import { ZoomIn, ZoomOut, Maximize2, ExternalLink, Download, FileText } from 'lucide-react';
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
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground">Chưa có đề bài</h3>
          <p className="text-sm">Đề bài cho bài tập này hiện chưa khả dụng.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background overflow-hidden relative group">
      {/* Top PDF Control Bar */}
      <div className="border-b bg-muted/40 px-3 py-1.5 flex items-center justify-between gap-2 shrink-0 z-10">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
          <FileText className="w-3.5 h-3.5 text-primary" />
          <span>Đề bài chính thức (.PDF)</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoom(Math.max(50, zoom - 10))}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground text-xs"
            title="Thu nhỏ"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="text-[11px] font-mono font-medium px-1 text-center">{zoom}%</span>
          <button
            onClick={() => setZoom(Math.min(200, zoom + 10))}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground text-xs"
            title="Phóng to"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          
          <div className="w-px h-3.5 bg-border mx-1" />

          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-medium transition"
            title="Mở toàn màn hình trong tab mới"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Mở tab mới</span>
          </a>
        </div>
      </div>
      
      {/* PDF Container */}
      <div className="flex-1 w-full h-full overflow-auto bg-slate-900/5 dark:bg-zinc-950 flex justify-center">
        <div 
          className="w-full h-full transition-transform origin-top"
          style={{ transform: `scale(${zoom / 100})`, width: `${100 * (100 / zoom)}%`, height: `${100 * (100 / zoom)}%` }}
        >
          <iframe 
            src={`${pdfUrl}#toolbar=0&navpanes=0`} 
            className="w-full h-full border-none" 
            title="Đề bài PDF"
          />
        </div>
      </div>
    </div>
  );
}
