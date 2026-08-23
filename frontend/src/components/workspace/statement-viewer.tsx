'use client';

import React, { useState } from 'react';
import {
  FileText,
  Clock,
  Database,
  ExternalLink,
  Download,
  Copy,
  Check,
  Code2,
  FileCode,
  Layers,
  Sparkles,
} from 'lucide-react';
import { DifficultyBadge } from '@/components/problems/difficulty-badge';
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
  ioType = 'FILE',
  ioFileName,
  pdfUrl,
  docxUrl,
  guideHtml,
  description,
}: StatementViewerProps) {
  const [copied, setCopied] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);

  const displayTitle = title || `Bài tập ${problemCode}`;
  const timeLimitSec = (timeLimitMs / 1000).toFixed(1);
  const ioDisplay =
    ioType === 'FILE'
      ? `${ioFileName || problemCode.toLowerCase()}.inp / ${ioFileName || problemCode.toLowerCase()}.out`
      : 'cin / cout (Standard I/O)';

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden relative">
      {/* Top Toolbar */}
      <div className="border-b bg-muted/40 px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0 z-10 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-sm text-primary">{problemCode}</span>
          <span className="text-muted-foreground">•</span>
          <DifficultyBadge difficulty={difficulty} />
        </div>

        <div className="flex items-center gap-2">
          {pdfUrl && (
            <button
              onClick={() => setShowPdfModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-card hover:bg-muted text-xs font-semibold text-foreground transition shadow-sm"
              title="Xem bản in PDF gốc của đề thi"
            >
              <FileText className="w-3.5 h-3.5 text-primary" />
              <span>Xem file PDF gốc</span>
            </button>
          )}

          {docxUrl && (
            <a
              href={docxUrl}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-card hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition shadow-sm"
              title="Tải tài liệu Word hướng dẫn"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải .DOCX</span>
            </a>
          )}
        </div>
      </div>

      {/* Main Statement Content Scroll Container */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
        {/* Problem Header Info Card */}
        <div className="p-5 rounded-2xl border bg-card/60 shadow-sm space-y-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{displayTitle}</h1>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-medium pt-1 border-t border-border/50">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Giới hạn thời gian: <strong className="text-foreground">{timeLimitSec}s</strong>
            </span>

            <span className="text-border">•</span>

            <span className="flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-blue-500" />
              Giới hạn bộ nhớ: <strong className="text-foreground">{memoryLimitMb}MB</strong>
            </span>

            <span className="text-border">•</span>

            <span className="flex items-center gap-1 font-mono">
              <FileCode className="w-3.5 h-3.5 text-emerald-500" />
              File I/O: <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-bold">{ioDisplay}</code>
            </span>
          </div>
        </div>

        {/* Formatted Statement HTML */}
        {guideHtml ? (
          <div className="p-6 rounded-2xl border bg-card shadow-sm">
            <div
              className={cn(
                'prose prose-sm dark:prose-invert max-w-none',
                'prose-headings:text-foreground prose-headings:font-bold prose-headings:tracking-tight prose-headings:mt-6 prose-headings:mb-3',
                'prose-h3:text-base prose-h3:text-primary prose-h3:border-b prose-h3:border-border/60 prose-h3:pb-1.5',
                'prose-p:leading-relaxed prose-p:text-muted-foreground prose-p:my-2.5',
                'prose-strong:text-foreground',
                'prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-code:font-mono',
                'prose-table:border prose-table:border-collapse prose-table:my-4 prose-table:w-full',
                'prose-th:border prose-th:p-2.5 prose-th:bg-muted/70 prose-th:text-foreground prose-th:font-semibold prose-th:text-left prose-th:text-xs',
                'prose-td:border prose-td:p-2.5 prose-td:text-xs prose-td:font-mono',
                'prose-ul:list-disc prose-ul:pl-5 prose-ul:space-y-1.5 prose-ul:my-2.5 prose-ul:text-muted-foreground'
              )}
              dangerouslySetInnerHTML={{ __html: guideHtml }}
            />
          </div>
        ) : description ? (
          <div className="p-6 rounded-2xl border bg-card shadow-sm leading-relaxed text-sm text-foreground whitespace-pre-wrap">
            {description}
          </div>
        ) : (
          <div className="p-12 text-center text-muted-foreground text-xs border rounded-2xl bg-card space-y-2">
            <FileText className="w-8 h-8 mx-auto text-primary opacity-60" />
            <p className="font-semibold text-foreground">Đang cập nhật nội dung đề bài</p>
            <p>Giáo viên có thể nạp file Word (.docx) hoặc PDF để cập nhật đề bài tự động.</p>
          </div>
        )}
      </div>

      {/* PDF Modal if user clicks "Xem file PDF gốc" */}
      {showPdfModal && pdfUrl && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl max-w-4xl w-full h-[85vh] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
            <div className="p-4 border-b flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span className="font-bold text-sm text-foreground">Bản in PDF gốc — {problemCode}</span>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg border bg-background hover:bg-muted text-xs font-semibold text-foreground transition inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Mở tab mới
                </a>
                <button
                  onClick={() => setShowPdfModal(false)}
                  className="px-3 py-1 rounded-lg border bg-background hover:bg-muted text-xs font-semibold text-foreground transition"
                >
                  Đóng
                </button>
              </div>
            </div>

            <div className="flex-1 w-full h-full bg-zinc-950">
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`}
                className="w-full h-full border-none"
                title={`Đề bài PDF ${problemCode}`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
