'use client';

import * as React from 'react';
import { ZoomIn, ZoomOut, ExternalLink, Download, FileText, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PdfViewerProps {
  pdfUrl?: string;
}

export function PdfViewer({ pdfUrl }: PdfViewerProps) {
  const [zoom, setZoom] = React.useState(100);
  const [key, setKey] = React.useState(0);

  // Stable URL avoiding URL flipping
  const cleanPdfUrl = React.useMemo(() => {
    if (!pdfUrl) return '';
    return pdfUrl;
  }, [pdfUrl]);

  if (!cleanPdfUrl) {
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
      <div className="border-b bg-muted/40 px-3 py-1.5 flex items-center justify-between gap-2 shrink-0 z-10 backdrop-blur-sm">
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

          <button
            onClick={() => setKey((prev) => prev + 1)}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground text-xs"
            title="Tải lại PDF"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          
          <div className="w-px h-3.5 bg-border mx-1" />

          <a
            href={cleanPdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition shadow-sm"
            title="Mở trong tab mới"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Mở tab mới</span>
          </a>

          <a
            href={cleanPdfUrl}
            download
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border bg-background hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-medium transition"
            title="Tải file PDF về máy"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Tải về</span>
          </a>
        </div>
      </div>
      
      {/* PDF Viewer Container */}
      <div className="flex-1 w-full h-full overflow-auto bg-slate-900/5 dark:bg-zinc-950 flex justify-center relative">
        <div 
          className="w-full h-full transition-transform origin-top flex flex-col"
          style={{ transform: `scale(${zoom / 100})`, width: `${100 * (100 / zoom)}%`, height: `${100 * (100 / zoom)}%` }}
        >
          <object
            key={key}
            data={`${cleanPdfUrl}#view=FitH&toolbar=0`}
            type="application/pdf"
            className="w-full h-full border-none flex-1"
          >
            <iframe 
              src={`${cleanPdfUrl}#toolbar=0&navpanes=0`} 
              className="w-full h-full border-none" 
              title="Đề bài PDF"
            >
              <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
                <FileText className="w-12 h-12 text-primary" />
                <p className="text-sm text-foreground font-medium">Trình duyệt không tự động nhúng PDF</p>
                <a
                  href={cleanPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold text-xs inline-flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" /> Mở đề bài trong tab mới
                </a>
              </div>
            </iframe>
          </object>
        </div>
      </div>
    </div>
  );
}
