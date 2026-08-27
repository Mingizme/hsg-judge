'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { Play, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TestResults } from './test-results';
import { useSubmission } from '@/hooks/use-submission';

interface ConsolePanelProps {
  code: string;
  problemCode: string;
}

export function ConsolePanel({ code, problemCode }: ConsolePanelProps) {
  const [activeTab, setActiveTab] = React.useState('console');
  const [customInput, setCustomInput] = React.useState('');
  const [runOutput, setRunOutput] = React.useState<{ stdout?: string; stderr?: string; error?: string } | null>(null);
  
  const {
    submitCode,
    runCustom,
    isSubmitting,
    isRunning,
    results,
    verdict,
    score,
    maxScore,
    totalTests,
    errorMessage,
    usedFallback,
  } = useSubmission();

  const handleRun = async () => {
    setActiveTab('console');
    const output = await runCustom(code, customInput, problemCode);
    setRunOutput(output);
  };

  const handleSubmit = () => {
    setActiveTab('results');
    submitCode(code, problemCode);
  };

  return (
    <TabsPrimitive.Root value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full w-full">
      <div className="flex items-center justify-between border-b bg-muted/30 px-2 h-10 shrink-0">
        <TabsPrimitive.List className="flex items-center h-full">
          <TabTrigger value="console">Console</TabTrigger>
          <TabTrigger value="results" data-has-results={results.length > 0}>
            Kết quả chấm
            {results.length > 0 && (
              <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] text-primary">
                {results.length}
              </span>
            )}
          </TabTrigger>
        </TabsPrimitive.List>

        <div className="mr-2 flex items-center gap-2">
          <button
            type="button"
            onClick={handleRun}
            disabled={isRunning || isSubmitting}
            className="inline-flex h-7 items-center justify-center rounded-md border bg-background px-3 text-xs font-medium transition-colors duration-200 ease-smooth hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            {isRunning ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Play className="mr-1.5 h-3.5 w-3.5 text-success" aria-hidden />
            )}
            Chạy thử
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isRunning}
            className="inline-flex h-7 items-center justify-center rounded-md bg-gradient-brand px-3 text-xs font-medium text-white shadow-subtle transition-all duration-200 ease-smooth hover:shadow-glow disabled:pointer-events-none disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Send className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            )}
            Nộp bài
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <TabsPrimitive.Content value="console" className="h-full w-full flex flex-col outline-none data-[state=inactive]:hidden">
          <div className="flex-1 grid grid-cols-2 gap-px bg-border h-full">
            <div className="flex flex-col bg-background">
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b">
                Custom Input (stdin)
              </div>
              <textarea
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                className="flex-1 w-full resize-none p-3 text-sm font-mono outline-none bg-transparent"
                placeholder="Nhập input tại đây..."
                spellCheck={false}
              />
            </div>
            <div className="flex flex-col bg-background">
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b">
                Output (stdout / stderr)
              </div>
              <div className="flex-1 w-full overflow-auto p-3 text-sm font-mono">
                {runOutput ? (
                  <>
                    {runOutput.error && <div className="mb-2 text-destructive">{runOutput.error}</div>}
                    {runOutput.stderr && <div className="mb-2 whitespace-pre-wrap text-destructive/90">{runOutput.stderr}</div>}
                    {runOutput.stdout && <div className="whitespace-pre-wrap">{runOutput.stdout}</div>}
                    {!runOutput.stdout && !runOutput.stderr && !runOutput.error && (
                      <span className="text-muted-foreground italic">Code chạy thành công nhưng không có đầu ra.</span>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground">Kết quả chạy sẽ hiển thị ở đây.</span>
                )}
              </div>
            </div>
          </div>
        </TabsPrimitive.Content>
        
        <TabsPrimitive.Content value="results" className="h-full w-full outline-none data-[state=inactive]:hidden overflow-auto">
          <TestResults
            results={results}
            verdict={verdict}
            score={score}
            maxScore={maxScore}
            isSubmitting={isSubmitting}
            totalTestsExpected={totalTests}
            errorMessage={errorMessage}
            usedFallback={usedFallback}
          />

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
      "inline-flex h-full items-center justify-center whitespace-nowrap px-4 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      "data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground hover:text-foreground",
      "data-[has-results=true]:text-primary/80 data-[has-results=true]:data-[state=active]:text-primary",
      className
    )}
    {...props}
  />
));
TabTrigger.displayName = TabsPrimitive.Trigger.displayName;
