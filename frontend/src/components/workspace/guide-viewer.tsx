'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, Download, FileText, Sparkles, Lightbulb, CheckCircle2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuideViewerProps {
  problemCode: string;
  docxUrl?: string;
  guideHtml?: string;
}

export function GuideViewer({ problemCode, docxUrl, guideHtml }: GuideViewerProps) {
  const [content, setContent] = useState<string | null>(guideHtml || null);
  const [loading, setLoading] = useState(!guideHtml);

  useEffect(() => {
    if (guideHtml) {
      setContent(guideHtml);
      setLoading(false);
      return;
    }

    const fetchGuide = async () => {
      setLoading(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://hsg-judge.onrender.com/api';
        const res = await fetch(`${apiUrl}/problems/${problemCode.toUpperCase()}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data?.guideHtml) {
            setContent(json.data.guideHtml);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch guide HTML:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGuide();
  }, [problemCode, guideHtml]);

  const defaultDocxDownloadUrl =
    docxUrl ||
    `https://ekjqhmosasziofldicwb.supabase.co/storage/v1/object/public/problem-pdfs/problems/${problemCode.toUpperCase()}/${problemCode.toLowerCase()}.docx`;

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      {/* Top Header Bar */}
      <div className="border-b bg-muted/40 px-4 py-2 flex items-center justify-between gap-3 shrink-0 z-10">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <BookOpen className="w-4 h-4 text-amber-500" />
          <span>Hướng dẫn giải chi tiết (Docx Editorial)</span>
        </div>

        <a
          href={defaultDocxDownloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-card hover:bg-muted text-xs font-semibold text-foreground transition shadow-sm"
          title="Tải file .docx gốc về máy"
        >
          <Download className="w-3.5 h-3.5 text-primary" />
          <span>Tải file .DOCX</span>
        </a>
      </div>

      {/* Guide Content Area */}
      <div className="flex-1 overflow-auto p-6 space-y-6 custom-scrollbar">
        {loading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground text-xs gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
            <span>Đang tải tài liệu hướng dẫn...</span>
          </div>
        ) : content ? (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Quick Algorithm Summary Box */}
            <div className="p-4 rounded-2xl border bg-amber-500/5 border-amber-500/20 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                <Lightbulb className="w-4 h-4" /> Tóm tắt tư duy giải thuật {problemCode}:
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tài liệu trích xuất trực tiếp từ file <strong>{problemCode.toLowerCase()}.docx</strong> trong gói đề thi chuẩn của Giáo viên.
              </p>
            </div>

            {/* Rendered HTML Content from DOCX */}
            <div
              className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-bold prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:leading-relaxed prose-p:text-xs prose-li:text-xs prose-pre:bg-muted prose-pre:p-3 prose-pre:rounded-xl prose-img:rounded-xl prose-img:border prose-img:mx-auto prose-img:max-h-96"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
        ) : (
          /* Fallback structured guide if DOCX not uploaded yet */
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="p-5 rounded-2xl border bg-card space-y-4 shadow-sm">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Phương Pháp Thuật Toán: Tham Lam (Greedy) + Ngăn Xếp (Stack)</span>
              </div>

              <div className="space-y-3 text-xs leading-relaxed text-muted-foreground">
                <p>
                  <strong>Ý tưởng bài toán:</strong> Để số tạo thành là lớn nhất có thể, các chữ số ở hàng cao (bên trái) phải càng lớn càng tốt.
                </p>
                <div className="p-3 rounded-xl border bg-muted/40 font-mono text-[11px] text-foreground space-y-1">
                  <div>1. Duyệt từng chữ số s[i] từ trái sang phải.</div>
                  <div>2. Trong khi k &gt; 0, stack không rỗng và s[i] &gt; st.top(): xóa st.top() và giảm k.</div>
                  <div>3. Đẩy s[i] vào stack.</div>
                  <div>4. Nếu duyệt xong mà k vẫn &gt; 0: xóa bớt k phần tử ở đỉnh stack.</div>
                </div>
              </div>
            </div>

            {/* Subtask Analysis */}
            <div className="p-5 rounded-2xl border bg-card space-y-3 shadow-sm">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Phân tích thang điểm Subtask:
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl border bg-background space-y-1">
                  <div className="font-semibold text-emerald-500">Subtask 1 (30% số điểm)</div>
                  <p className="text-muted-foreground text-[11px]">N ≤ 100, K ≤ 10: Duyệt tham lam tìm vị trí lớn nhất mỗi bước O(N × K).</p>
                </div>
                <div className="p-3 rounded-xl border bg-background space-y-1">
                  <div className="font-semibold text-blue-500">Subtask 2 (70% số điểm)</div>
                  <p className="text-muted-foreground text-[11px]">N ≤ 10^5, K &lt; N: Dùng Monotonic Stack duyệt 1 lượt đạt độ phức tạp tối ưu O(N).</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
