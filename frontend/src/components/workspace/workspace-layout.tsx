'use client';

import * as React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProblemTabs } from './problem-tabs';
import { ConsolePanel } from './console-panel';
import { useAuth } from '@/contexts/auth-context';
import { API_BASE } from '@/lib/problems-api';

/**
 * Monaco chỉ chạy được ở client và kéo theo một wrapper khá nặng. Tách khỏi
 * bundle của route để nội dung đề bài hiện ra trước, editor nạp sau.
 */
const CodeEditor = dynamic(
  () => import('./code-editor').then((m) => m.CodeEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center gap-2 bg-surface/40 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        <span>Đang tải trình soạn code…</span>
      </div>
    ),
  },
);

interface WorkspaceLayoutProps {
  problemCode: string;
  pdfUrl?: string;
  docxUrl?: string;
  guideHtml?: string;
}

// Khung code khởi đầu cho Học sinh (chưa có thuật toán)
const STUDENT_STARTER_TEMPLATE = (probCode: string) => `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    // Đọc ghi file theo chuẩn thi HSG nếu cần
    // if (fopen("${probCode.toLowerCase()}.inp", "r")) {
    //     freopen("${probCode.toLowerCase()}.inp", "r", stdin);
    //     freopen("${probCode.toLowerCase()}.out", "w", stdout);
    // }
    
    // Viết thuật toán của bạn tại đây...
    
    return 0;
}`;

export function WorkspaceLayout({
  problemCode,
  pdfUrl: propPdfUrl,
  docxUrl: propDocxUrl,
  guideHtml: propGuideHtml,
}: WorkspaceLayoutProps) {
  const { isTeacher, isLoading } = useAuth();
  const hasUserEdited = React.useRef(false);

  const [problemData, setProblemData] = React.useState<any>(null);
  const [modelSolution, setModelSolution] = React.useState<string>('');
  const [code, setCode] = React.useState<string>(() =>
    STUDENT_STARTER_TEMPLATE(problemCode),
  );

  // Tải chi tiết bài tập từ Backend (Lời giải mẫu, HTML hướng dẫn, PDF...).
  // Reset trạng thái ngay trong cùng effect để tránh 2 effect tranh nhau setCode.
  React.useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    hasUserEdited.current = false;
    setModelSolution('');
    setProblemData(null);
    setCode(STUDENT_STARTER_TEMPLATE(problemCode));

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/problems/${problemCode}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;

        const p = json.data || json;
        setProblemData(p);

        if (Array.isArray(p.solutions) && p.solutions.length > 0) {
          const primary =
            p.solutions.find((s: any) => s.isPrimary) || p.solutions[0];
          setModelSolution(primary?.sourceCode || '');
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.warn('Failed to fetch problem detail:', err);
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [problemCode]);

  // Giáo viên được nạp sẵn lời giải mẫu; học sinh luôn bắt đầu từ khung trống.
  React.useEffect(() => {
    if (isLoading || hasUserEdited.current) return;
    setCode(
      isTeacher && modelSolution
        ? modelSolution
        : STUDENT_STARTER_TEMPLATE(problemCode),
    );
  }, [isTeacher, isLoading, modelSolution, problemCode]);

  const handleCodeChange = React.useCallback((val: string | undefined) => {
    hasUserEdited.current = true;
    setCode(val || '');
  }, []);

  const handleApplyCode = React.useCallback((newCode: string) => {
    hasUserEdited.current = true;
    setCode(newCode);
  }, []);

  const finalPdfUrl = problemData?.pdfUrl || propPdfUrl;
  const finalDocxUrl = problemData?.docxUrl || propDocxUrl;
  const finalGuideHtml = problemData?.guideHtml || propGuideHtml;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden bg-background">
      <PanelGroup direction="horizontal" autoSaveId="hsg-workspace-h">
        <Panel defaultSize={45} minSize={25} className="min-w-0">
          <div className="h-full border-r bg-card">
            <ProblemTabs
              problemCode={problemCode}
              title={problemData?.title}
              difficulty={problemData?.difficulty}
              timeLimitMs={problemData?.timeLimitMs}
              memoryLimitMb={problemData?.memoryLimitMb}
              ioType={problemData?.ioType}
              ioFileName={problemData?.ioFileName}
              pdfUrl={finalPdfUrl}
              docxUrl={finalDocxUrl}
              guideHtml={finalGuideHtml}
              description={problemData?.description}
              subtasks={problemData?.subtasks}
              // CHỈ truyền lời giải mẫu của giáo viên. Trước đây fallback về
              // `code` khiến Sơ đồ thuật toán / Code khuyết phân tích chính
              // khung trống của học sinh khi bài chưa có code mẫu.
              modelSolution={modelSolution}
              onApplyCode={handleApplyCode}
            />
          </div>
        </Panel>

        <ResizeHandle />

        <Panel defaultSize={55} minSize={30} className="min-w-0">
          <PanelGroup direction="vertical" autoSaveId="hsg-workspace-v">
            <Panel defaultSize={70} minSize={20}>
              <div className="relative flex h-full flex-col">
                <CodeEditor
                  value={code}
                  onChange={handleCodeChange}
                  problemCode={problemCode}
                  isTeacher={isTeacher}
                />
              </div>
            </Panel>

            <ResizeHandle vertical />

            <Panel defaultSize={30} minSize={10} className="min-h-[80px]">
              <ConsolePanel code={code} problemCode={problemCode} />
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
  );
}

function ResizeHandle({ vertical = false }: { vertical?: boolean }) {
  return (
    <PanelResizeHandle
      className={cn(
        'group relative flex items-center justify-center bg-border/80 transition-colors duration-200',
        'hover:bg-primary/50 data-[resize-handle-active]:bg-primary',
        vertical ? 'h-px w-full cursor-row-resize' : 'h-full w-px cursor-col-resize',
      )}
    >
      {/* Vùng bắt chuột rộng hơn 1px để kéo dãn dễ dàng */}
      <span
        aria-hidden
        className={cn(
          'absolute',
          vertical ? '-inset-y-1.5 inset-x-0' : '-inset-x-1.5 inset-y-0',
        )}
      />
      {/* Chấm nắm kéo hiện khi hover */}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute rounded-full bg-primary/70 opacity-0 transition-opacity duration-200 group-hover:opacity-100',
          vertical ? 'h-1 w-8' : 'h-8 w-1',
        )}
      />
    </PanelResizeHandle>
  );
}
