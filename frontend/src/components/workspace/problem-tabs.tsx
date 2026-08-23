'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';
import { PdfViewer } from './pdf-viewer';
import { GuideViewer } from './guide-viewer';
import { SubmissionHistory } from './submission-history';
import { FlowchartViewer } from './flowchart-viewer';
import { ScaffoldedCode } from './scaffolded-code';

interface ProblemTabsProps {
  pdfUrl?: string;
  docxUrl?: string;
  guideHtml?: string;
  problemCode: string;
  initialCode?: string;
  onApplyCode?: (code: string) => void;
}

export function ProblemTabs({
  pdfUrl,
  docxUrl,
  guideHtml,
  problemCode,
  initialCode,
  onApplyCode,
}: ProblemTabsProps) {
  return (
    <TabsPrimitive.Root defaultValue="pdf" className="flex flex-col h-full w-full">
      <TabsPrimitive.List className="flex w-full items-center border-b px-2 h-10 bg-muted/30 shrink-0 overflow-x-auto">
        <TabTrigger value="pdf">Đề bài</TabTrigger>
        <TabTrigger value="guide">Hướng dẫn</TabTrigger>
        <TabTrigger value="flowchart">Sơ đồ thuật toán</TabTrigger>
        <TabTrigger value="scaffold">Code khuyết</TabTrigger>
        <TabTrigger value="history">Lịch sử nộp</TabTrigger>
      </TabsPrimitive.List>
      
      <div className="flex-1 overflow-hidden relative">
        <TabsPrimitive.Content value="pdf" className="h-full w-full outline-none data-[state=inactive]:hidden">
          <PdfViewer pdfUrl={pdfUrl} guideHtml={guideHtml} problemCode={problemCode} />
        </TabsPrimitive.Content>

        <TabsPrimitive.Content value="guide" className="h-full w-full outline-none data-[state=inactive]:hidden">
          <GuideViewer
            problemCode={problemCode}
            docxUrl={docxUrl}
            guideHtml={guideHtml}
          />
        </TabsPrimitive.Content>
        
        <TabsPrimitive.Content value="flowchart" className="h-full w-full outline-none data-[state=inactive]:hidden">
          <FlowchartViewer problemCode={problemCode} initialCode={initialCode} />
        </TabsPrimitive.Content>
        
        <TabsPrimitive.Content value="scaffold" className="h-full w-full outline-none data-[state=inactive]:hidden">
          <ScaffoldedCode problemCode={problemCode} onApplyCode={onApplyCode} />
        </TabsPrimitive.Content>
        
        <TabsPrimitive.Content value="history" className="h-full w-full outline-none data-[state=inactive]:hidden">
          <SubmissionHistory problemCode={problemCode} />
        </TabsPrimitive.Content>
      </div>
    </TabsPrimitive.Root>
  );
}

const TabTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap px-3.5 py-2 text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      "data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground hover:text-foreground",
      className
    )}
    {...props}
  />
));
TabTrigger.displayName = TabsPrimitive.Trigger.displayName;
