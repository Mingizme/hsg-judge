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

// Lời giải mẫu hoàn chỉnh cho Giáo viên (sẵn sàng test & giảng bài)
const TEACHER_SOLUTION_TEMPLATE = `#include <bits/stdc++.h>
using namespace std;

int n, k;
string s;
stack<char> st;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    // Đọc ghi file theo chuẩn thi HSG nếu cần
    // if (fopen("strnum.inp", "r")) {
    //     freopen("strnum.inp", "r", stdin);
    //     freopen("strnum.out", "w", stdout);
    // }
    
    if (cin >> n >> k >> s) {
        for (int i = 0; i < n; i++) {
            while (k > 0 && !st.empty() && s[i] > st.top()) {
                st.pop();
                k--;
            }
            st.push(s[i]);
        }
        
        while (k > 0 && !st.empty()) {
            st.pop();
            k--;
        }
        
        vector<char> ans;
        while (!st.empty()) {
            ans.push_back(st.top());
            st.pop();
        }
        for (int i = ans.size() - 1; i >= 0; i--) {
            cout << ans[i];
        }
    }
    
    return 0;
}`;

export function WorkspaceLayout({ problemCode, pdfUrl }: WorkspaceLayoutProps) {
  const { isTeacher, isLoading } = useAuth();
  const hasUserEdited = React.useRef(false);

  const getTemplate = React.useCallback(() => {
    return isTeacher ? TEACHER_SOLUTION_TEMPLATE : STUDENT_STARTER_TEMPLATE(problemCode);
  }, [isTeacher, problemCode]);

  const [code, setCode] = React.useState<string>(getTemplate());

  // Khi Auth tải xong vai trò Giáo viên / Học sinh, cập nhật mẫu code tương ứng
  React.useEffect(() => {
    if (!hasUserEdited.current && !isLoading) {
      setCode(getTemplate());
    }
  }, [isTeacher, isLoading, getTemplate]);

  const handleCodeChange = (val: string | undefined) => {
    hasUserEdited.current = true;
    setCode(val || '');
  };

  return (
    <div className="flex w-full h-[calc(100vh-3.5rem)] overflow-hidden bg-background">
      <PanelGroup direction="horizontal">
        <Panel defaultSize={45} minSize={30}>
          <div className="h-full border-r">
            <ProblemTabs
              pdfUrl={pdfUrl}
              problemCode={problemCode}
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
    >
      <div className={cn("z-10 flex items-center justify-center rounded-sm border bg-background", vertical ? "h-3 w-8" : "h-8 w-3")}>
        {vertical ? (
          <div className="flex items-center gap-[2px]">
            <div className="h-0.5 w-1 rounded-full bg-muted-foreground/50" />
            <div className="h-0.5 w-1 rounded-full bg-muted-foreground/50" />
            <div className="h-0.5 w-1 rounded-full bg-muted-foreground/50" />
          </div>
        ) : (
          <div className="flex flex-col gap-[2px]">
            <div className="h-1 w-0.5 rounded-full bg-muted-foreground/50" />
            <div className="h-1 w-0.5 rounded-full bg-muted-foreground/50" />
            <div className="h-1 w-0.5 rounded-full bg-muted-foreground/50" />
          </div>
        )}
      </div>
    </PanelResizeHandle>
  );
}
