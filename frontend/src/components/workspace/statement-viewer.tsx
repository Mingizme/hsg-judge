'use client';

import React, { useState } from 'react';
import {
  FileText,
  Clock,
  Database,
  ExternalLink,
  Download,
  FileCode,
  Layers,
  Sparkles,
  BookOpen,
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
  // Mode toggle: 'text' (mặc định) hoặc 'pdf'
  const [viewMode, setViewMode] = useState<'text' | 'pdf'>('text');

  const displayTitle = title || `Bài tập ${problemCode}`;
  const timeLimitSec = (timeLimitMs / 1000).toFixed(1);
  const ioDisplay =
    ioType === 'FILE'
      ? `${ioFileName || problemCode.toLowerCase()}.inp / ${ioFileName || problemCode.toLowerCase()}.out`
      : 'cin / cout (Standard I/O)';

  const activePdfUrl =
    pdfUrl ||
    `https://ekjqhmosasziofldicwb.supabase.co/storage/v1/object/public/problem-pdfs/problems/${problemCode.toUpperCase()}/${problemCode.toLowerCase()}.pdf`;

  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(activePdfUrl)}&embedded=true`;

  const statementContent = description || guideHtml || '';
  const isHtml =
    statementContent.includes('<p') ||
    statementContent.includes('<h') ||
    statementContent.includes('<div') ||
    statementContent.includes('<table');

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden relative">
      {/* Top Toolbar with Inline Toggle */}
      <div className="border-b bg-muted/40 px-3 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0 z-10 backdrop-blur-sm">
        {/* Left: Inline Toggle Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted/80 p-0.5 rounded-xl border shadow-inner">
            <button
              onClick={() => setViewMode('text')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                viewMode === 'text'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Đề bài (Text)</span>
            </button>

            <button
              onClick={() => setViewMode('pdf')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                viewMode === 'pdf'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Bản in PDF</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border/60">
            <span className="font-mono font-bold text-xs text-primary">{problemCode}</span>
            <DifficultyBadge difficulty={difficulty} />
          </div>
        </div>

        {/* Right: Quick Action Links */}
        <div className="flex items-center gap-1.5">
          <a
            href={activePdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border bg-background hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition shadow-sm"
            title="Mở toàn màn hình trong tab mới"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Mở tab mới</span>
          </a>

          <a
            href={activePdfUrl}
            download
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border bg-background hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition shadow-sm"
            title="Tải file PDF về máy"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Tải PDF</span>
          </a>

          {docxUrl && (
            <a
              href={docxUrl}
              download
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border bg-background hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition shadow-sm"
              title="Tải tài liệu Word hướng dẫn (.docx)"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Tải .DOCX</span>
            </a>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full h-full overflow-hidden relative">
        {viewMode === 'text' ? (
          /* 1. Rich Text Statement View */
          <div className="h-full overflow-y-auto p-5 sm:p-7 space-y-6">
            {/* Problem Header Info Card */}
            <div className="p-5 rounded-2xl border bg-card/60 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <Sparkles className="w-4 h-4" /> Đề Thi Học Sinh Giỏi Tin Học
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{displayTitle}</h1>

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-medium pt-2 border-t border-border/50">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  Thời gian: <strong className="text-foreground">{timeLimitSec}s</strong>
                </span>

                <span className="text-border">•</span>

                <span className="flex items-center gap-1">
                  <Database className="w-3.5 h-3.5 text-blue-500" />
                  Bộ nhớ: <strong className="text-foreground">{memoryLimitMb}MB</strong>
                </span>

                <span className="text-border">•</span>

                <span className="flex items-center gap-1 font-mono">
                  <FileCode className="w-3.5 h-3.5 text-emerald-500" />
                  File I/O: <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-bold">{ioDisplay}</code>
                </span>
              </div>
            </div>

            {/* Formatted Statement HTML or Text */}
            {statementContent ? (
              <div className="p-6 rounded-2xl border bg-card shadow-sm">
                {isHtml ? (
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
                    dangerouslySetInnerHTML={{ __html: statementContent }}
                  />
                ) : (
                  <div className="leading-relaxed text-sm text-foreground whitespace-pre-wrap">
                    {statementContent}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-muted-foreground text-xs border rounded-2xl bg-card space-y-2">
                <FileText className="w-8 h-8 mx-auto text-primary opacity-60" />
                <p className="font-semibold text-foreground">Đang cập nhật nội dung đề bài</p>
                <p>Nội dung đề bài sẽ được cập nhật tự động khi nạp file Word (.docx) hoặc PDF.</p>
              </div>
            )}
          </div>
        ) : (
          /* 2. Full-frame Inline PDF Viewer (KHÔNG BẬT POPUP) */
          <div className="w-full h-full bg-zinc-950 flex flex-col">
            <iframe
              src={googleViewerUrl}
              className="w-full h-full border-none flex-1"
              title={`Đề bài PDF ${problemCode}`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
