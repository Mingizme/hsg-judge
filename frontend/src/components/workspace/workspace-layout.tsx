'use client';

import * as React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { cn } from '@/lib/utils';
import { ProblemTabs } from './problem-tabs';
import { CodeEditor } from './code-editor';
import { ConsolePanel } from './console-panel';
import { useSubmission } from '@/hooks/use-submission';

interface WorkspaceLayoutProps {
  problemCode: string;
  pdfUrl?: string;
}

export function WorkspaceLayout({ problemCode, pdfUrl }: WorkspaceLayoutProps) {
  const [code, setCode] = React.useState<string>('');
  
  return (
    <div className="flex w-full h-[calc(100vh-3.5rem)] overflow-hidden bg-background">
      <PanelGroup direction="horizontal">
        <Panel defaultSize={45} minSize={30}>
          <div className="h-full border-r">
            <ProblemTabs
              pdfUrl={pdfUrl}
              problemCode={problemCode}
              onApplyCode={(newCode) => setCode(newCode)}
            />
          </div>
        </Panel>
        
        <ResizeHandle />
        
        <Panel defaultSize={55} minSize={30}>
          <PanelGroup direction="vertical">
            <Panel defaultSize={70} minSize={20}>
              <div className="h-full flex flex-col relative">
                <CodeEditor value={code} onChange={(val) => setCode(val || '')} problemCode={problemCode} />
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
