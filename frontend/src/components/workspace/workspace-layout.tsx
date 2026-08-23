'use client';

import * as React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { cn } from '@/lib/utils';
import { ProblemTabs } from './problem-tabs';
import { CodeEditor } from './code-editor';
import { ConsolePanel } from './console-panel';
import { useAuth } from '@/contexts/auth-context';

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

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || 'https://hsg-judge.onrender.com/api';

  // Tải chi tiết bài tập từ Backend (Lời giải mẫu, HTML hướng dẫn, PDF...)
  React.useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await fetch(`${API_URL}/problems/${problemCode}`);
        if (res.ok) {
          const json = await res.json();
          const p = json.data || json;
          setProblemData(p);
          if (p.solutions && p.solutions.length > 0) {
            const primary = p.solutions.find((s: any) => s.isPrimary) || p.solutions[0];
            setModelSolution(primary.sourceCode || '');
          }
        }
      } catch (err) {
        console.warn('Failed to fetch problem detail:', err);
      }
    };
    fetchDetail();
  }, [problemCode, API_URL]);

  const getTemplate = React.useCallback(() => {
    if (isTeacher && modelSolution) {
      return modelSolution;
    }
    return STUDENT_STARTER_TEMPLATE(problemCode);
  }, [isTeacher, modelSolution, problemCode]);

  const [code, setCode] = React.useState<string>(STUDENT_STARTER_TEMPLATE(problemCode));

  // Khi Auth hoặc Lời giải mẫu tải xong, cập nhật code tương ứng
  React.useEffect(() => {
    if (!hasUserEdited.current && !isLoading) {
      setCode(getTemplate());
    }
  }, [isTeacher, isLoading, modelSolution, getTemplate]);

  const handleCodeChange = (val: string | undefined) => {
    hasUserEdited.current = true;
    setCode(val || '');
  };

  const finalPdfUrl = problemData?.pdfUrl || propPdfUrl;
  const finalDocxUrl = problemData?.docxUrl || propDocxUrl;
  const finalGuideHtml = problemData?.guideHtml || propGuideHtml;
  const activeSolution = modelSolution || code;

  return (
    <div className="flex w-full h-[calc(100vh-3.5rem)] overflow-hidden bg-background">
      <PanelGroup direction="horizontal">
        <Panel defaultSize={45} minSize={30}>
          <div className="h-full border-r">
            <ProblemTabs
              pdfUrl={finalPdfUrl}
              docxUrl={finalDocxUrl}
              guideHtml={finalGuideHtml}
              problemCode={problemCode}
              initialCode={activeSolution}
              onApplyCode={(newCode) => {
                hasUserEdited.current = true;
                setCode(newCode);
              }}
            />
          </div>
        </Panel>
        
        <ResizeHandle />
        
        <Panel defaultSize={55} minSize={30}>
          <PanelGroup direction="vertical">
            <Panel defaultSize={70} minSize={20}>
              <div className="h-full flex flex-col relative">
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
        "relative flex w-px items-center justify-center bg-border transition-colors hover:bg-slate-400 dark:hover:bg-slate-600 data-[resize-handle-active]:bg-primary",
        vertical ? "h-px w-full" : "w-px h-full"
      )}
    />
  );
}
