'use client';

import * as React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import dynamic from 'next/dynamic';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProblemTabs } from './problem-tabs';
import { ConsolePanel } from './console-panel';
import type { GuideSubtask } from './guide-viewer';
import { useAuth } from '@/contexts/auth-context';
import { API_BASE } from '@/lib/problems-api';
import { studentStarterTemplate, draftStorageKey } from '@/lib/cpp-template';

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

/** Hình dạng thật của `GET /api/problems/:code` (xem `problem.service.ts`). */
interface SolutionCode {
  id?: string;
  label?: string;
  fileName?: string;
  sourceCode?: string;
  isPrimary?: boolean;
}

interface SampleTestCase {
  id?: string;
  testNumber?: number;
  inputData?: string;
  outputData?: string;
}

interface ProblemDetail {
  id?: string;
  code?: string;
  title?: string;
  description?: string;
  difficulty?: string;
  ioType?: 'FILE' | 'STANDARD';
  ioFileName?: string | null;
  pdfUrl?: string | null;
  docxUrl?: string | null;
  guideHtml?: string | null;
  timeLimitMs?: number;
  memoryLimitMb?: number;
  totalTests?: number;
  maxScore?: number;
  solutions?: SolutionCode[];
  subtasks?: GuideSubtask[];
  sampleTestCases?: SampleTestCase[];
}

/** Chờ 700ms sau lần gõ cuối mới ghi localStorage, tránh ghi theo từng ký tự. */
const DRAFT_SAVE_DELAY_MS = 700;

export function WorkspaceLayout({
  problemCode,
  pdfUrl: propPdfUrl,
  docxUrl: propDocxUrl,
  guideHtml: propGuideHtml,
}: WorkspaceLayoutProps) {
  const { isTeacher, isLoading } = useAuth();
  const hasUserEdited = React.useRef(false);

  const [problemData, setProblemData] = React.useState<ProblemDetail | null>(
    null,
  );
  const [modelSolution, setModelSolution] = React.useState<string>('');
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [code, setCode] = React.useState<string>(() =>
    studentStarterTemplate(problemCode),
  );

  // Tải chi tiết bài tập từ Backend (Lời giải mẫu, HTML hướng dẫn, PDF...).
  // Reset trạng thái ngay trong cùng effect để tránh 2 effect tranh nhau setCode.
  React.useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    hasUserEdited.current = false;
    setModelSolution('');
    setProblemData(null);
    setLoadError(null);

    /**
     * Khôi phục bản nháp trước khi khung mẫu kịp thắng. `hasUserEdited` bật
     * lên để effect nạp lời giải mẫu bên dưới không ghi đè bài đang làm — trước
     * đây bấm F5 hay đổi bài là mất sạch code học sinh vừa viết.
     */
    let restored = false;
    try {
      const saved = window.localStorage.getItem(draftStorageKey(problemCode));
      if (saved && saved.trim()) {
        setCode(saved);
        hasUserEdited.current = true;
        restored = true;
      }
    } catch {
      // Chế độ riêng tư của trình duyệt có thể chặn localStorage — bỏ qua.
    }
    if (!restored) setCode(studentStarterTemplate(problemCode));

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/problems/${problemCode}`, {
          signal: controller.signal,
        });
        if (cancelled) return;

        if (!res.ok) {
          // `catch` KHÔNG bắt được lỗi HTTP, nên trước đây một `return` âm thầm
          // để lại panel trống trơn không kèm lời giải thích nào.
          setLoadError(
            res.status === 404
              ? `Không tìm thấy bài "${problemCode}" trên máy chủ.`
              : `Máy chủ trả về lỗi ${res.status}. Máy chủ miễn phí có thể đang “ngủ”, thử tải lại sau vài giây.`,
          );
          return;
        }

        const json = await res.json();
        if (cancelled) return;

        const p: ProblemDetail = json.data || json;
        setProblemData(p);

        if (Array.isArray(p.solutions) && p.solutions.length > 0) {
          const primary = p.solutions.find((s) => s.isPrimary) || p.solutions[0];
          setModelSolution(primary?.sourceCode || '');
        }
      } catch (err) {
        if (cancelled || (err as Error).name === 'AbortError') return;
        setLoadError(
          'Không kết nối được máy chủ chấm bài. Kiểm tra mạng rồi thử tải lại.',
        );
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [problemCode, reloadKey]);

  // Giáo viên được nạp sẵn lời giải mẫu; học sinh luôn bắt đầu từ khung trống.
  React.useEffect(() => {
    if (isLoading || hasUserEdited.current) return;
    setCode(
      isTeacher && modelSolution
        ? modelSolution
        : studentStarterTemplate(problemCode),
    );
  }, [isTeacher, isLoading, modelSolution, problemCode]);

  // Lưu bản nháp (có hoãn) mỗi khi học sinh gõ.
  React.useEffect(() => {
    if (!hasUserEdited.current) return;
    const key = draftStorageKey(problemCode);
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(key, code);
      } catch {
        // Hết dung lượng hoặc bị chặn: không cản trở việc làm bài.
      }
    }, DRAFT_SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [code, problemCode]);

  const handleCodeChange = React.useCallback((val: string | undefined) => {
    hasUserEdited.current = true;
    setCode(val || '');
  }, []);

  const handleApplyCode = React.useCallback((newCode: string) => {
    hasUserEdited.current = true;
    setCode(newCode);
  }, []);

  /** Nút "Khôi phục khung code": xoá luôn bản nháp đã lưu. */
  const handleResetCode = React.useCallback(() => {
    try {
      window.localStorage.removeItem(draftStorageKey(problemCode));
    } catch {
      /* không sao */
    }
    hasUserEdited.current = false;
    setCode(
      isTeacher && modelSolution
        ? modelSolution
        : studentStarterTemplate(problemCode),
    );
  }, [isTeacher, modelSolution, problemCode]);

  const finalPdfUrl = problemData?.pdfUrl || propPdfUrl;
  const finalDocxUrl = problemData?.docxUrl || propDocxUrl;
  const finalGuideHtml = problemData?.guideHtml || propGuideHtml;
  /** Input của test ví dụ — dữ liệu chạy thử cho sơ đồ mô phỏng ở tab ③ */
  const sampleInput = problemData?.sampleTestCases?.[0]?.inputData;

  return (
    // `100dvh` thay `100vh`: trên di động thanh địa chỉ ăn mất phần cuối khung,
    // khiến thanh console bị đẩy khỏi màn hình.
    <div className="flex h-[calc(100dvh-3.5rem)] w-full overflow-hidden bg-background">
      <PanelGroup direction="horizontal" autoSaveId="hsg-workspace-h">
        <Panel defaultSize={45} minSize={25} className="min-w-0">
          <div className="flex h-full flex-col border-r bg-card">
            {loadError && (
              <div
                role="alert"
                className="flex shrink-0 items-start gap-2 border-b border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning"
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="flex-1 leading-relaxed">{loadError}</span>
                <button
                  type="button"
                  onClick={() => setReloadKey((k) => k + 1)}
                  className="flex shrink-0 items-center gap-1 rounded-md border border-warning/40 px-2 py-0.5 font-semibold transition hover:bg-warning/20"
                >
                  <RefreshCw className="h-3 w-3" aria-hidden /> Tải lại
                </button>
              </div>
            )}
            <div className="min-h-0 flex-1">
              <ProblemTabs
                problemCode={problemCode}
                title={problemData?.title}
                difficulty={problemData?.difficulty}
                timeLimitMs={problemData?.timeLimitMs}
                memoryLimitMb={problemData?.memoryLimitMb}
                ioType={problemData?.ioType}
                ioFileName={problemData?.ioFileName ?? undefined}
                pdfUrl={finalPdfUrl}
                docxUrl={finalDocxUrl}
                guideHtml={finalGuideHtml ?? undefined}
                description={problemData?.description}
                subtasks={problemData?.subtasks}
                sampleInput={sampleInput}
                // CHỈ truyền lời giải mẫu của giáo viên. Trước đây fallback về
                // `code` khiến Sơ đồ thuật toán / Code khuyết phân tích chính
                // khung trống của học sinh khi bài chưa có code mẫu.
                modelSolution={modelSolution}
                onApplyCode={handleApplyCode}
              />
            </div>
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
                  onReset={handleResetCode}
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
