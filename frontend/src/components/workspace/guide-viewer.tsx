'use client';

import React from 'react';
import { BookOpen, Download, Lightbulb, ListChecks, FileText } from 'lucide-react';
import { sanitizeHtml, hasRenderableHtml } from '@/lib/sanitize-html';
import { cn } from '@/lib/utils';

export interface GuideSubtask {
  id?: string;
  label?: string;
  description?: string | null;
  score?: number;
  testCases?: unknown[];
}

interface GuideViewerProps {
  problemCode: string;
  docxUrl?: string;
  guideHtml?: string;
  /** Thang điểm THẬT của bài, thay cho phần "phân tích subtask" viết cứng */
  subtasks?: GuideSubtask[];
}

/**
 * Tab ② Hướng dẫn giải (DOCX → HTML).
 *
 * Trước đây component này tự gọi lại `GET /problems/:code` (workspace đã gọi rồi)
 * và khi bài chưa có .docx thì hiển thị NGUYÊN VĂN lời giải của bài STRNUM
 * (greedy + monotonic stack) cho mọi bài — học sinh đọc phải hướng dẫn của một
 * bài khác. Nay chỉ hiển thị nội dung thật, thiếu thì nói rõ là thiếu.
 */
export function GuideViewer({
  problemCode,
  docxUrl,
  guideHtml,
  subtasks,
}: GuideViewerProps) {
  const safeGuide = sanitizeHtml(guideHtml);
  const hasGuide = hasRenderableHtml(safeGuide);
  const realSubtasks = (subtasks || []).filter((s) => s && (s.label || s.score));

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      {/* Thanh tiêu đề */}
      <div className="z-10 flex shrink-0 items-center justify-between gap-3 border-b bg-muted/40 px-4 py-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <BookOpen className="h-4 w-4 text-warning" aria-hidden />
          <span>Hướng dẫn giải của giáo viên</span>
        </div>

        {docxUrl && (
          <a
            href={docxUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-subtle transition hover:bg-muted"
            title="Tải file .docx gốc về máy"
          >
            <Download className="h-3.5 w-3.5 text-primary" aria-hidden />
            <span>Tải tài liệu gốc (.docx)</span>
          </a>
        )}
      </div>

      <div className="flex-1 overflow-auto p-6 scrollbar-thin-muted">
        <div className="mx-auto max-w-4xl space-y-6">
          {hasGuide ? (
            <>
              <div className="space-y-2 rounded-2xl border border-warning/20 bg-warning/5 p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-warning">
                  <Lightbulb className="h-4 w-4" aria-hidden />
                  Tài liệu hướng dẫn bài {problemCode}
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Nội dung được trích trực tiếp từ file Word trong gói đề của
                  giáo viên. Hãy tự làm trước khi đọc lời giải.
                </p>
              </div>

              {/* Bảng trong .docx (bảng subtask, bảng giới hạn dữ liệu) thường
                  rộng hơn khung trái; bọc `overflow-x-auto` để cuộn ngang thay
                  vì kéo giãn cả cột hướng dẫn. */}
              <div
                className={cn(
                  'prose prose-sm max-w-none overflow-x-auto dark:prose-invert',
                  'prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-foreground',
                  'prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-h3:text-primary',
                  'prose-p:text-xs prose-p:leading-relaxed prose-li:text-xs',
                  'prose-strong:text-foreground',
                  'prose-a:text-primary prose-a:underline-offset-2',
                  /* Công thức toán trong Word xuất ra dưới dạng chữ nghiêng +
                     chỉ số trên/dưới; phải giữ nguyên cỡ chữ để không bị mất. */
                  'prose-sub:text-[0.7em] prose-sup:text-[0.7em]',
                  'prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-primary prose-code:before:content-none prose-code:after:content-none',
                  'prose-pre:overflow-x-auto prose-pre:whitespace-pre-wrap prose-pre:break-words prose-pre:rounded-xl prose-pre:border prose-pre:bg-muted prose-pre:p-3 prose-pre:text-xs',
                  /* mammoth không sinh viền cho bảng .docx: tự kẻ viền, nếu không
                     bảng thang điểm chỉ còn là mấy dòng chữ dính nhau. */
                  'prose-table:my-4 prose-table:w-full prose-table:border-collapse prose-table:border',
                  'prose-th:border prose-th:bg-muted/70 prose-th:p-2 prose-th:text-left prose-th:text-[11px] prose-th:font-semibold prose-th:text-foreground',
                  'prose-td:border prose-td:p-2 prose-td:align-top prose-td:text-[11px]',
                  'prose-img:mx-auto prose-img:max-h-96 prose-img:rounded-xl prose-img:border',
                )}
                dangerouslySetInnerHTML={{ __html: safeGuide }}
              />
            </>
          ) : (
            <div className="space-y-2 rounded-2xl border bg-card p-12 text-center text-xs text-muted-foreground">
              <FileText
                className="mx-auto h-8 w-8 text-primary opacity-60"
                aria-hidden
              />
              <p className="font-semibold text-foreground">
                Bài {problemCode} chưa có hướng dẫn giải
              </p>
              <p>
                Hướng dẫn xuất hiện khi giáo viên nạp file{' '}
                <code className="font-mono">Doc/*.docx</code> trong gói đề. Hãy
                thử tab “Sơ đồ thuật toán” để xem lời giải mẫu được mô hình hoá.
              </p>
            </div>
          )}

          {/* Thang điểm subtask — số liệu thật từ cấu hình của giáo viên */}
          {realSubtasks.length > 0 && (
            <div className="space-y-3 rounded-2xl border bg-card p-5 shadow-subtle">
              <h3 className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <ListChecks className="h-4 w-4 text-success" aria-hidden />
                Thang điểm theo subtask
              </h3>
              <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                {realSubtasks.map((s, i) => (
                  <div
                    key={s.id || i}
                    className="space-y-1 rounded-xl border bg-background p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-primary">
                        {s.label || `Subtask ${i + 1}`}
                      </span>
                      <span className="font-mono text-[11px] font-bold tabular-nums text-success">
                        {s.score ?? 0} điểm
                      </span>
                    </div>
                    {s.description && (
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        {s.description}
                      </p>
                    )}
                    {Array.isArray(s.testCases) && (
                      <p className="font-mono text-[10px] text-muted-foreground/80">
                        {s.testCases.length} test
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
