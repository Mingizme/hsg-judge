'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import {
  FileText,
  BookOpen,
  Workflow,
  Puzzle,
  History,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import { StatementViewer } from './statement-viewer';
import { GuideViewer, type GuideSubtask } from './guide-viewer';
import { SubmissionHistory } from './submission-history';

/** Khung chờ dùng chung cho các tab tải theo yêu cầu */
function PaneSkeleton({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center gap-2 text-xs text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

/**
 * React Flow + engine mô phỏng nặng gần 200KB nhưng chỉ dùng ở tab ③.
 * Tách khỏi bundle chính để mở trang bài tập nhanh hơn.
 */
const FlowchartViewer = dynamic(
  () => import('./flowchart-viewer').then((m) => m.FlowchartViewer),
  {
    ssr: false,
    loading: () => <PaneSkeleton label="Đang tải sơ đồ thuật toán…" />,
  },
);

/**
 * Bộ sinh "code khuyết" phải phân tích cả file .cpp bằng AST — nặng và chỉ
 * cần khi học sinh mở tab ④.
 */
const ScaffoldedCode = dynamic(
  () => import('./scaffolded-code').then((m) => m.ScaffoldedCode),
  {
    ssr: false,
    loading: () => <PaneSkeleton label="Đang tạo code khuyết…" />,
  },
);

interface ProblemTabsProps {
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
  /** Thang điểm subtask thật của bài (dùng ở tab Hướng dẫn) */
  subtasks?: GuideSubtask[];
  /** Input của test ví dụ đầu tiên — dữ liệu chạy thử cho tab Sơ đồ thuật toán */
  sampleInput?: string;
  /** Lời giải mẫu của giáo viên — chỉ dùng cho Sơ đồ thuật toán / Code khuyết */
  modelSolution?: string;
  onApplyCode?: (code: string) => void;
}

type TabValue = 'pdf' | 'guide' | 'flowchart' | 'scaffold' | 'history';

const TAB_META: { value: TabValue; label: string; icon: LucideIcon }[] = [
  { value: 'pdf', label: 'Đề bài', icon: FileText },
  { value: 'guide', label: 'Hướng dẫn', icon: BookOpen },
  { value: 'flowchart', label: 'Sơ đồ thuật toán', icon: Workflow },
  { value: 'scaffold', label: 'Code khuyết', icon: Puzzle },
  { value: 'history', label: 'Lịch sử nộp', icon: History },
];

export function ProblemTabs({
  problemCode,
  title,
  difficulty,
  timeLimitMs,
  memoryLimitMb,
  ioType,
  ioFileName,
  pdfUrl,
  docxUrl,
  guideHtml,
  description,
  subtasks,
  sampleInput,
  modelSolution,
  onApplyCode,
}: ProblemTabsProps) {
  const [active, setActive] = React.useState<TabValue>('pdf');

  // Lazy-mount rồi keep-alive: tab chỉ mount lần đầu khi được mở, sau đó giữ
  // nguyên trong DOM (forceMount) để PDF viewer / React Flow / lịch sử nộp
  // không phải khởi tạo lại mỗi lần đổi tab.
  const [mounted, setMounted] = React.useState<Set<TabValue>>(
    () => new Set<TabValue>(['pdf']),
  );

  const handleChange = React.useCallback((value: string) => {
    const next = value as TabValue;
    setActive(next);
    setMounted((prev) => (prev.has(next) ? prev : new Set(prev).add(next)));
  }, []);

  // Đổi bài tập → quay về tab Đề bài và bỏ cache các tab cũ
  React.useEffect(() => {
    setActive('pdf');
    setMounted(new Set<TabValue>(['pdf']));
  }, [problemCode]);

  const renderPane = (value: TabValue, children: React.ReactNode) => {
    if (!mounted.has(value)) return null;
    return (
      <TabsPrimitive.Content
        key={value}
        value={value}
        forceMount
        tabIndex={-1}
        className="absolute inset-0 h-full w-full outline-none data-[state=inactive]:pointer-events-none data-[state=inactive]:invisible"
      >
        {children}
      </TabsPrimitive.Content>
    );
  };

  return (
    <TabsPrimitive.Root
      value={active}
      onValueChange={handleChange}
      className="flex h-full w-full flex-col"
    >
      <TabsPrimitive.List
        aria-label="Khu vực học tập"
        className="flex h-10 w-full shrink-0 items-center gap-0.5 overflow-x-auto border-b bg-surface/60 px-1.5 backdrop-blur"
      >
        {TAB_META.map(({ value, label, icon: Icon }) => (
          <TabTrigger key={value} value={value}>
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{label}</span>
          </TabTrigger>
        ))}
      </TabsPrimitive.List>

      <div className="relative flex-1 overflow-hidden">
        {renderPane(
          'pdf',
          <StatementViewer
            problemCode={problemCode}
            title={title}
            difficulty={difficulty}
            timeLimitMs={timeLimitMs}
            memoryLimitMb={memoryLimitMb}
            ioType={ioType}
            ioFileName={ioFileName}
            pdfUrl={pdfUrl}
            docxUrl={docxUrl}
            guideHtml={guideHtml}
            description={description}
          />,
        )}

        {renderPane(
          'guide',
          <GuideViewer
            problemCode={problemCode}
            docxUrl={docxUrl}
            guideHtml={guideHtml}
            subtasks={subtasks}
          />,
        )}

        {renderPane(
          'flowchart',
          <FlowchartViewer
            problemCode={problemCode}
            initialCode={modelSolution}
            ioType={ioType}
            ioFileName={ioFileName}
            sampleInput={sampleInput}
          />,
        )}

        {renderPane(
          'scaffold',
          <ScaffoldedCode
            problemCode={problemCode}
            initialCode={modelSolution}
            onApplyCode={onApplyCode}
          />,
        )}

        {renderPane('history', <SubmissionHistory problemCode={problemCode} />)}
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
      'group relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground',
      'transition-colors duration-200 ease-smooth hover:bg-muted/60 hover:text-foreground',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70',
      'disabled:pointer-events-none disabled:opacity-50 sm:text-[13px]',
      'data-[state=active]:bg-primary/10 data-[state=active]:text-primary',
      'data-[state=active]:after:absolute data-[state=active]:after:inset-x-2 data-[state=active]:after:-bottom-[5px]',
      'data-[state=active]:after:h-0.5 data-[state=active]:after:rounded-full data-[state=active]:after:bg-primary',
      className,
    )}
    {...props}
  />
));
TabTrigger.displayName = TabsPrimitive.Trigger.displayName;
