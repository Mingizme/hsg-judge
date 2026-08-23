'use client';

import * as React from 'react';
import {
  ZoomIn,
  ZoomOut,
  ExternalLink,
  Download,
  FileText,
  RefreshCw,
  Eye,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PdfViewerProps {
  pdfUrl?: string;
  guideHtml?: string;
  problemCode?: string;
}

export function PdfViewer({ pdfUrl, guideHtml, problemCode }: PdfViewerProps) {
  const [zoom, setZoom] = React.useState(100);
  const [viewerMode, setViewerMode] = React.useState<'embed' | 'google' | 'text'>(
    guideHtml ? 'text' : 'google'
  );
  const [key, setKey] = React.useState(0);

  const cleanPdfUrl = pdfUrl || '';

  // Google Docs Embedded Viewer URL (hoạt động 100% không bị chặn bởi IDM/extensions)
  const googleViewerUrl = React.useMemo(() => {
    if (!cleanPdfUrl) return '';
    return `https://docs.google.com/viewer?url=${encodeURIComponent(cleanPdfUrl)}&embedded=true`;
  }, [cleanPdfUrl]);

  if (!cleanPdfUrl && !guideHtml) {
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
      <div className="border-b bg-muted/40 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 shrink-0 z-10 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-muted rounded-lg p-0.5 border text-xs">
            {guideHtml && (
              <button
                onClick={() => setViewerMode('text')}
                className={cn(
                  'px-2.5 py-1 rounded-md font-semibold transition text-[11px]',
                  viewerMode === 'text'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Đề bài Text
              </button>
            )}
            <button
              onClick={() => setViewerMode('google')}
              className={cn(
                'px-2.5 py-1 rounded-md font-semibold transition text-[11px]',
                viewerMode === 'google'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              PDF Online
            </button>
            <button
              onClick={() => setViewerMode('embed')}
              className={cn(
                'px-2.5 py-1 rounded-md font-semibold transition text-[11px]',
                viewerMode === 'embed'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              PDF Gốc
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          {viewerMode !== 'text' && (
            <>
              <button
                onClick={() => setZoom(Math.max(50, zoom - 10))}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                title="Thu nhỏ"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono font-medium px-1 text-center">{zoom}%</span>
              <button
                onClick={() => setZoom(Math.min(200, zoom + 10))}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                title="Phóng to"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setKey((prev) => prev + 1)}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                title="Tải lại PDF"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              <div className="w-px h-3.5 bg-border mx-1" />
            </>
          )}

          {cleanPdfUrl && (
            <>
              <a
                href={cleanPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-semibold transition shadow-sm text-[11px]"
                title="Mở toàn màn hình trong tab mới"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Mở tab mới</span>
              </a>

              <a
                href={cleanPdfUrl}
                download
                className="flex items-center gap-1 px-2 py-1 rounded-lg border bg-background hover:bg-muted text-muted-foreground hover:text-foreground font-medium transition text-[11px]"
                title="Tải file PDF về máy"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tải về</span>
              </a>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full h-full overflow-auto bg-slate-900/5 dark:bg-zinc-950 flex justify-center relative">
        {viewerMode === 'text' && guideHtml ? (
          <div className="w-full max-w-4xl p-6 overflow-y-auto space-y-4 text-foreground">
            <div className="p-6 rounded-2xl border bg-card shadow-sm space-y-4 leading-relaxed text-sm">
              <div
                className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-primary prose-table:border prose-td:border prose-td:p-2 prose-th:border prose-th:p-2 prose-th:bg-muted/50"
                dangerouslySetInnerHTML={{ __html: guideHtml }}
              />
            </div>
          </div>
        ) : viewerMode === 'google' && cleanPdfUrl ? (
          <iframe
            key={`google-${key}`}
            src={googleViewerUrl}
            className="w-full h-full border-none"
            title="Đề bài PDF (Google Engine)"
          />
        ) : (
          <div
            className="w-full h-full transition-transform origin-top flex flex-col"
            style={{
              transform: `scale(${zoom / 100})`,
              width: `${100 * (100 / zoom)}%`,
              height: `${100 * (100 / zoom)}%`,
            }}
          >
            <object
              key={`embed-${key}`}
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
                  <p className="text-sm text-foreground font-medium">
                    Trình duyệt chặn nhúng PDF trực tiếp do tiện ích mở rộng (IDM).
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewerMode('google')}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold text-xs inline-flex items-center gap-1.5"
                    >
                      <Eye className="w-4 h-4" /> Xem qua Google PDF
                    </button>
                    <a
                      href={cleanPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 border bg-background rounded-xl font-semibold text-xs inline-flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-4 h-4" /> Mở tab mới
                    </a>
                  </div>
                </div>
              </iframe>
            </object>
          </div>
        )}
      </div>
    </div>
  );
}
