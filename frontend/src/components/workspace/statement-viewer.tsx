'use client';

import React, { useState } from 'react';
import {
  FileText,
  Clock,
  Database,
  FileCode,
  Sparkles,
  BookOpen,
  Download,
} from 'lucide-react';
import { DifficultyBadge } from '@/components/problems/difficulty-badge';
import { PdfViewer } from './pdf-viewer';
import { sanitizeHtml, hasRenderableHtml } from '@/lib/sanitize-html';
import { cn } from '@/lib/utils';

interface StatementViewerProps {
  problemCode: string;
  title?: string;
  difficulty?: string;
  timeLimitMs?: number;
  memoryLimitMb?: number;
  ioType?: 'FILE' | 'STANDARD';
  ioFileName?: string;
  pdfUrl?: string;
  docxUrl?: string;
  guideHtml?: string;
  description?: string;
}

export function StatementViewer({
  problemCode,
  title,
  difficulty = 'MEDIUM',
  timeLimitMs = 1000,
  memoryLimitMb = 256,
  ioType = 'STANDARD',
  ioFileName,
  pdfUrl,
  docxUrl,
  guideHtml,
  description,
}: StatementViewerProps) {
  /**
   * Mặc định mở bản PDF khi bài có PDF: đó là đề GỐC của giáo viên, còn bản chữ
   * chỉ là văn bản trích tự động nên có thể lệch bảng biểu/công thức.
   *
   * `pdfUrl` tới sau khi tải dữ liệu bài nên phải chuyển chế độ trong `effect` —
   * nhưng chỉ chuyển khi người dùng chưa tự bấm, tránh việc vừa chọn "Đề bài
   * (Text)" thì bị kéo về PDF.
   */
  const [viewMode, setViewMode] = useState<'text' | 'pdf'>(
    pdfUrl ? 'pdf' : 'text',
  );
  const userPickedRef = React.useRef(false);

  const pickView = (mode: 'text' | 'pdf') => {
    userPickedRef.current = true;
    setViewMode(mode);
  };

  React.useEffect(() => {
    if (userPickedRef.current) return;
    setViewMode(pdfUrl ? 'pdf' : 'text');
  }, [pdfUrl]);

  // Đổi bài thì quay lại chế độ mặc định của bài mới
  React.useEffect(() => {
    userPickedRef.current = false;
  }, [problemCode]);

  const displayTitle = title || `Bài tập ${problemCode}`;
  const timeLimitSec = (timeLimitMs / 1000).toFixed(1);
  const baseName = (ioFileName || problemCode).toLowerCase();
  const isFileIo = ioType === 'FILE';
  const ioDisplay = isFileIo
    ? `${baseName}.inp / ${baseName}.out`
    : 'cin / cout (bàn phím & màn hình)';

  /**
   * Đề bài dạng chữ. `description` do backend trích từ PDF/DOCX nên có thể là
   * HTML — PHẢI lọc trước khi nhúng vào DOM (xem `lib/sanitize-html.ts`).
   */
  const rawStatement = description || guideHtml || '';
  const isHtml = /<(p|h[1-6]|div|table|ul|ol|br|pre)\b/i.test(rawStatement);
  const safeStatement = isHtml ? sanitizeHtml(rawStatement) : rawStatement;
  const hasStatement = isHtml
    ? hasRenderableHtml(safeStatement)
    : rawStatement.trim().length > 0;

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-background">
      {/* Thanh công cụ */}
      <div className="z-10 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center rounded-xl border bg-muted/80 p-0.5 shadow-inner"
            role="group"
            aria-label="Chế độ xem đề bài"
          >
            <button
              type="button"
              onClick={() => pickView('text')}
              aria-pressed={viewMode === 'text'}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                viewMode === 'text'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <BookOpen className="h-3.5 w-3.5" aria-hidden />
              <span>Đề bài (Text)</span>
            </button>
            <button
              type="button"
              onClick={() => pickView('pdf')}
              disabled={!pdfUrl}
              aria-pressed={viewMode === 'pdf'}
              title={
                pdfUrl
                  ? 'Xem đề gốc dạng PDF'
                  : 'Bài này chưa có tệp PDF đề bài'
              }
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                viewMode === 'pdf'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
                !pdfUrl && 'cursor-not-allowed opacity-50 hover:text-muted-foreground',
              )}
            >
              <FileText className="h-3.5 w-3.5" aria-hidden />
              <span>Bản in PDF</span>
              {!pdfUrl && (
                <span className="text-[10px] font-normal opacity-70">
                  (chưa có)
                </span>
              )}
            </button>
          </div>

          <div className="hidden items-center gap-2 border-l border-border/60 pl-2 sm:flex">
            <span className="font-mono text-xs font-bold text-primary">
              {problemCode}
            </span>
            <DifficultyBadge difficulty={difficulty} />
          </div>
        </div>

        {/* Chỉ hiện link tải khi backend THẬT SỰ có file — trước đây luôn hiện
            và trỏ tới một URL Supabase tự bịa nên bấm vào là lỗi 404. */}
        {docxUrl && (
          <a
            href={docxUrl}
            download
            className="flex items-center gap-1 rounded-lg border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm transition hover:bg-muted hover:text-foreground"
            title="Tải tài liệu hướng dẫn (.docx)"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden md:inline">Tải .DOCX</span>
          </a>
        )}
      </div>

      {/* Nội dung */}
      <div className="relative h-full w-full flex-1 overflow-hidden">
        {viewMode === 'text' ? (
          <div className="h-full space-y-6 overflow-y-auto p-5 scrollbar-thin-muted sm:p-7">
            {/* Thẻ thông tin bài */}
            <div className="space-y-3 rounded-2xl border bg-card/60 p-5 shadow-subtle">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <Sparkles className="h-4 w-4" aria-hidden /> Đề thi Học sinh giỏi
                Tin học
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {displayTitle}
              </h1>

              <dl className="flex flex-wrap items-center gap-3 border-t border-border/50 pt-2 text-xs font-medium text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-warning" aria-hidden />
                  <dt>Thời gian:</dt>
                  <dd className="font-semibold text-foreground tabular-nums">
                    {timeLimitSec}s
                  </dd>
                </div>
                <span className="text-border" aria-hidden>
                  •
                </span>
                <div className="flex items-center gap-1">
                  <Database className="h-3.5 w-3.5 text-info" aria-hidden />
                  <dt>Bộ nhớ:</dt>
                  <dd className="font-semibold text-foreground tabular-nums">
                    {memoryLimitMb}MB
                  </dd>
                </div>
                <span className="text-border" aria-hidden>
                  •
                </span>
                <div className="flex items-center gap-1">
                  <FileCode className="h-3.5 w-3.5 text-success" aria-hidden />
                  <dt>{isFileIo ? 'Đọc/ghi file:' : 'Nhập/xuất chuẩn:'}</dt>
                  <dd>
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono font-bold text-foreground">
                      {ioDisplay}
                    </code>
                  </dd>
                </div>
              </dl>
            </div>

            {hasStatement ? (
              <div className="rounded-2xl border bg-card p-6 shadow-subtle">
                {isHtml ? (
                  <div
                    className={cn(
                      'prose prose-sm max-w-none dark:prose-invert',
                      'prose-headings:mb-3 prose-headings:mt-6 prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-foreground',
                      'prose-h3:border-b prose-h3:border-border/60 prose-h3:pb-1.5 prose-h3:text-base prose-h3:text-primary',
                      'prose-p:my-2.5 prose-p:leading-relaxed prose-p:text-muted-foreground',
                      'prose-strong:text-foreground',
                      'prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-primary prose-code:before:content-none prose-code:after:content-none',
                      'prose-table:my-4 prose-table:w-full prose-table:border-collapse prose-table:border',
                      'prose-th:border prose-th:bg-muted/70 prose-th:p-2.5 prose-th:text-left prose-th:text-xs prose-th:font-semibold prose-th:text-foreground',
                      'prose-td:border prose-td:p-2.5 prose-td:font-mono prose-td:text-xs',
                      'prose-ul:my-2.5 prose-ul:list-disc prose-ul:space-y-1.5 prose-ul:pl-5 prose-ul:text-muted-foreground',
                      /* Khối "Ví dụ mẫu" được backend giữ nguyên văn trong `<pre>`:
                         phải là chữ đơn cách và cho xuống dòng, nếu không dữ liệu
                         vào/ra dài sẽ tràn ngang khỏi khung đề. */
                      'prose-pre:my-3 prose-pre:overflow-x-auto prose-pre:whitespace-pre-wrap prose-pre:break-words prose-pre:rounded-xl prose-pre:border prose-pre:bg-muted/60 prose-pre:p-3.5 prose-pre:font-mono prose-pre:text-xs prose-pre:leading-relaxed prose-pre:text-foreground',
                    )}
                    dangerouslySetInnerHTML={{ __html: safeStatement }}
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {rawStatement}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 rounded-2xl border bg-card p-12 text-center text-xs text-muted-foreground">
                <FileText
                  className="mx-auto h-8 w-8 text-primary opacity-60"
                  aria-hidden
                />
                <p className="font-semibold text-foreground">
                  Chưa có nội dung đề bài dạng chữ
                </p>
                <p>
                  {pdfUrl
                    ? 'Hãy chuyển sang “Bản in PDF” để đọc đề gốc của giáo viên.'
                    : 'Nội dung sẽ xuất hiện khi giáo viên nạp gói đề (PDF/DOCX).'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <PdfViewer pdfUrl={pdfUrl} problemCode={problemCode} />
        )}
      </div>
    </div>
  );
}
