'use client';

import React, { useState, useMemo, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  Position,
  Handle,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useTheme } from 'next-themes';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Plus,
  Eye,
  Workflow,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateFlowchartFromCpp, type CppBlock } from '@/lib/cpp-to-flowchart';
import { generateSimulationTrace, SimulationStep } from '@/lib/simulation-generator';

/**
 * Bảng màu từng loại khối. Trước đây chỉ có tông tối (`bg-emerald-950/70`) nên ở
 * chế độ Sáng chữ và nền gần như trùng nhau. Nay mỗi loại có biến thể cho cả hai
 * chế độ, dùng độ mờ thay vì màu đặc để hoà với nền của theme.
 *
 * Danh sách khoá phải PHỦ HẾT `data.type` mà `cpp-to-flowchart.ts` phát ra —
 * trước đây khối kết thúc mang type `end` không có trong bảng nên âm thầm rơi
 * về kiểu `action`, còn kiểu `output` thì thành mã chết.
 */
const NODE_STYLES: Record<string, string> = {
  // Hai đầu mút của sơ đồ
  start: 'bg-success/10 border-success/40 text-success dark:bg-success/15',
  end: 'bg-success/10 border-success/40 text-success dark:bg-success/15',
  // Khai báo & khởi tạo: giữ tông trung tính để không tranh màu với xử lý
  decl: 'bg-muted/60 border-border text-muted-foreground',
  input: 'bg-info/10 border-info/40 text-info dark:bg-info/15',
  output: 'bg-primary/10 border-primary/40 text-primary dark:bg-primary/15',
  action:
    'bg-[hsl(280_70%_60%/0.1)] border-[hsl(280_70%_60%/0.4)] text-[hsl(280_60%_45%)] dark:text-[hsl(280_70%_72%)]',
  condition:
    'bg-warning/10 border-warning/40 text-warning dark:bg-warning/15',
  // Vòng lặp cũng là khối rẽ nhánh: cùng tông hổ phách, viền gạch cho ý "lặp lại"
  loop:
    'bg-warning/10 border-dashed border-warning/60 text-warning dark:bg-warning/15',
  // Giữ khoá cũ cho các khối do người dùng tự thêm
  stack:
    'bg-[hsl(280_70%_60%/0.1)] border-[hsl(280_70%_60%/0.4)] text-[hsl(280_60%_45%)] dark:text-[hsl(280_70%_72%)]',
};

// Custom Flowchart Node with High-aesthetic Visuals
function CustomNode({ id, data }: { id: string; data: any }) {
  const isCurrent = data.isActive;

  return (
    <div
      className={cn(
        'relative min-w-[210px] max-w-[300px] cursor-grab select-none rounded-2xl border px-4 py-2.5 text-center shadow-card backdrop-blur-md transition-all duration-300 ease-smooth active:cursor-grabbing',
        NODE_STYLES[data.type as string] ?? NODE_STYLES.action,
        isCurrent &&
          'scale-105 border-primary shadow-glow ring-2 ring-primary ring-offset-2 ring-offset-background',
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2.5 !w-2.5 !border-2 !border-background !bg-muted-foreground"
      />
      <div className="mb-0.5 flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider opacity-70">
        <span>{data.category}</span>
      </div>
      {/* `whitespace-pre-line`: khối khai báo gộp nhiều dòng bằng `\n`, không có
          nó thì mọi khai báo bị nối thành một dòng dài. */}
      <div className="whitespace-pre-line break-words font-mono text-xs font-bold leading-relaxed tracking-tight text-foreground">
        {data.label}
      </div>
      {data.subtext && (
        <div className="mt-1 text-[10px] text-muted-foreground opacity-90">
          {data.subtext}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !border-2 !border-background !bg-muted-foreground"
      />
    </div>
  );
}

const nodeTypes = {
  custom: CustomNode,
};

interface FlowchartViewerProps {
  problemCode?: string;
  initialCode?: string;
  /** Quy cách nhập/xuất thật của bài — để khối "Bắt đầu" không nói bừa về tệp */
  ioType?: 'FILE' | 'STANDARD';
  ioFileName?: string | null;
  /** Input của test ví dụ, dùng làm dữ liệu chạy thử cho phần mô phỏng */
  sampleInput?: string;
}

export function FlowchartViewer({
  problemCode = '',
  initialCode,
  ioType,
  ioFileName,
  sampleInput,
}: FlowchartViewerProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  /**
   * KHÔNG còn code mẫu STRNUM cứng. Trước đây mọi bài chưa có lời giải mẫu đều
   * hiển thị sơ đồ của STRNUM — học sinh học sai hoàn toàn thuật toán bài mình
   * đang làm. Nay không có lời giải thì hiện trạng thái rỗng trung thực.
   */
  const code = initialCode?.trim() || '';
  const hasCode = code.length > 0;

  // 2. Tự động sinh cấu trúc Nodes & Edges từ Code C++
  //    Màu cạnh phải sinh lại khi đổi Sáng/Tối: mũi tên SVG không nhận `var()`.
  const flowOptions = useMemo(
    () => ({
      theme: (isDark ? 'dark' : 'light') as 'dark' | 'light',
      ioType,
      ioFileName,
    }),
    [isDark, ioType, ioFileName],
  );

  const initialGenerated = useMemo(() => {
    if (!hasCode) {
      return {
        nodes: [] as Node[],
        edges: [] as Edge[],
        aliases: {} as Record<string, string>,
        program: [] as CppBlock[],
      };
    }
    return generateFlowchartFromCpp(code, problemCode, flowOptions);
  }, [code, problemCode, hasCode, flowOptions]);

  // 1. Sinh các bước chạy thử THẬT trên test ví dụ của chính bài này.
  //    Truyền `program` (cây khối đã gắn `nodeId`) để bộ chạy thử làm sáng đúng
  //    khối đang thực hiện, và truyền `sampleInput` vì đó là nguồn dữ liệu duy
  //    nhất — thiếu nó, engine chỉ đi theo cấu trúc chứ không bịa số liệu.
  const simulationSteps = useMemo<SimulationStep[]>(() => {
    if (!hasCode) return [];
    return generateSimulationTrace(
      code,
      problemCode,
      sampleInput,
      initialGenerated.program,
    );
  }, [code, problemCode, hasCode, sampleInput, initialGenerated.program]);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const currentStep = simulationSteps[currentStepIndex] || simulationSteps[0];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialGenerated.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialGenerated.edges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // 3. Tự động đồng bộ lại sơ đồ Nodes & Edges khi mã bài hoặc Code C++ thay đổi
  React.useEffect(() => {
    setNodes(initialGenerated.nodes);
    setEdges(initialGenerated.edges);
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }, [initialGenerated, setNodes, setEdges]);

  // Sync active step to nodes highlight
  //
  // `simulation-generator.ts` phát ra tên khối kiểu cũ (`node-init`,
  // `node-true-0`…). Sơ đồ mới đánh id theo cấu trúc thật của code, nên phải
  // dịch qua bảng `aliases`; thiếu bước này thì mọi bước mô phỏng đều trượt và
  // không khối nào sáng lên.
  const activeNodeId = React.useMemo(() => {
    const raw = currentStep?.nodeId;
    if (!raw) return undefined;
    return initialGenerated.aliases?.[raw] ?? raw;
  }, [currentStep?.nodeId, initialGenerated.aliases]);

  React.useEffect(() => {
    if (!activeNodeId) return;
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: { ...node.data, isActive: node.id === activeNodeId },
      })),
    );
  }, [activeNodeId, setNodes]);

  const handleResetLayout = () => {
    if (!hasCode) return;
    const regenerated = generateFlowchartFromCpp(code, problemCode, flowOptions);
    setNodes(regenerated.nodes);
    setEdges(regenerated.edges);
    setCurrentStepIndex(0);
  };

  const handleAddNewNode = () => {
    const newId = `node-custom-${Date.now()}`;
    const newNode: Node = {
      id: newId,
      type: 'custom',
      position: { x: 260 + (Math.random() * 60 - 30), y: 300 + (Math.random() * 60 - 30) },
      data: {
        category: 'Khối tùy biến',
        label: 'Thao tác mới // Kéo thả tự do',
        subtext: 'Bấm và kéo để kết nối vào sơ đồ',
        type: 'action',
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  // Auto-play simulation
  React.useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= simulationSteps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1800);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, simulationSteps.length]);

  if (!hasCode) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-background p-8 text-center">
        <Workflow
          className="h-10 w-10 stroke-1 text-muted-foreground/40"
          aria-hidden
        />
        <p className="text-sm font-semibold text-foreground">
          Bài này chưa có lời giải mẫu
        </p>
        <p className="max-w-[320px] text-xs leading-relaxed text-muted-foreground">
          Sơ đồ thuật toán được sinh tự động từ lời giải mẫu (.cpp) mà giáo viên
          tải lên. Khi chưa có tệp đó, hệ thống không hiển thị sơ đồ của bài khác
          để tránh gây hiểu sai thuật toán.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden relative">
      {/* Top Interactive Toolbar */}
      <div className="border-b bg-muted/30 px-3 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0 z-10 backdrop-blur-sm">
        {/* Left: Dry Run Stepper */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className={cn(
              'flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold shadow-subtle transition-colors duration-200 ease-smooth',
              isPlaying
                ? 'bg-warning text-background hover:bg-warning/90'
                : 'bg-gradient-brand text-white hover:shadow-glow',
            )}
          >
            {isPlaying ? (
              <Pause className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Play className="h-3.5 w-3.5" aria-hidden />
            )}
            <span>{isPlaying ? 'Tạm dừng' : 'Chạy mô phỏng'}</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentStepIndex === 0 || isPlaying}
            className="rounded-lg border bg-background p-1 text-xs text-foreground transition hover:bg-muted disabled:opacity-40"
            title="Bước trước"
            aria-label="Bước trước"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          </button>

          <span className="px-1 font-mono text-[11px] font-semibold tabular-nums text-muted-foreground">
            Bước {simulationSteps.length === 0 ? 0 : currentStepIndex + 1}/
            {simulationSteps.length}
          </span>

          <button
            type="button"
            onClick={() =>
              setCurrentStepIndex((prev) =>
                Math.min(simulationSteps.length - 1, prev + 1),
              )
            }
            disabled={
              currentStepIndex >= simulationSteps.length - 1 || isPlaying
            }
            className="rounded-lg border bg-background p-1 text-xs text-foreground transition hover:bg-muted disabled:opacity-40"
            title="Bước kế tiếp"
            aria-label="Bước kế tiếp"
          >
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>

          <button
            type="button"
            onClick={() => {
              setCurrentStepIndex(0);
              setIsPlaying(false);
            }}
            className="ml-1 rounded-lg border bg-background p-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
            title="Đặt lại mô phỏng"
            aria-label="Đặt lại mô phỏng"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>

        {/* Right: Drag & Drop and Auto-generate actions */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleAddNewNode}
            className="flex items-center gap-1 rounded-lg border bg-card px-2 py-1 text-xs font-medium text-foreground transition hover:bg-muted"
            title="Thêm khối mới vào sơ đồ"
          >
            <Plus className="h-3 w-3 text-primary" aria-hidden />
            <span className="hidden sm:inline">Thêm khối</span>
          </button>

          <button
            type="button"
            onClick={handleResetLayout}
            className="flex items-center gap-1 rounded-lg border bg-card px-2 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            title="Tự động sắp xếp lại từ C++"
          >
            <Sparkles className="h-3 w-3 text-warning" aria-hidden />
            <span className="hidden sm:inline">Sinh lại từ C++</span>
          </button>
        </div>
      </div>

      {/* Main Flow Canvas */}
      <div className="flex-1 w-full h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          nodesDraggable={true}
          nodesConnectable={true}
          elementsSelectable={true}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.3}
          maxZoom={1.8}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={16}
            size={1}
            /* Màu chấm nền phải đổi theo theme, nếu không ở chế độ Sáng nền bị
               lốm đốm xám đậm rất rối mắt. */
            color={isDark ? 'hsl(240 5% 24%)' : 'hsl(215 20% 82%)'}
          />
          <Controls className="!overflow-hidden !rounded-xl !border-border !bg-card !shadow-card" />
          <MiniMap
            className="hidden !overflow-hidden !rounded-xl !border-border !bg-card/90 sm:block"
            maskColor={isDark ? 'hsl(240 10% 4% / 0.6)' : 'hsl(210 40% 96% / 0.6)'}
            nodeColor={(node) => {
              /* Phải khớp `NODE_STYLES`, nếu không bản đồ thu nhỏ tô sai loại khối. */
              switch (node.data?.type) {
                case 'start':
                case 'end':
                  return 'hsl(142 71% 45%)';
                case 'condition':
                case 'loop':
                  return 'hsl(38 92% 50%)';
                case 'action':
                case 'stack':
                  return 'hsl(280 70% 60%)';
                case 'output':
                  return 'hsl(221 83% 53%)';
                case 'decl':
                  return 'hsl(240 5% 55%)';
                default:
                  return 'hsl(199 89% 48%)';
              }
            }}
          />
        </ReactFlow>
      </div>

      {/* Bottom Live Dry Run Dynamic Variable Watcher Bar */}
      {currentStep && (
        <div className="z-10 flex shrink-0 flex-col items-start justify-between gap-3 border-t bg-card/95 px-4 py-2.5 text-xs shadow-elevated backdrop-blur sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-bold text-primary">
              <Eye className="h-3.5 w-3.5" aria-hidden />{' '}
              {currentStep.kind === 'structure' ? 'Đang xét:' : 'Biến theo dõi:'}
            </span>
            <div className="flex items-center gap-2 font-mono">
              {/* Chỉ bài có engine mô phỏng giá trị mới có `i` / `s[i]` thật.
                  Với chế độ đi bộ theo cấu trúc, hiện chúng ra chỉ là "-" vô nghĩa. */}
              {currentStep.kind !== 'structure' && (
                <>
                  <span className="rounded border bg-muted px-2 py-0.5">
                    i = {currentStep.i >= 0 ? currentStep.i : '-'}
                  </span>
                  <span className="rounded border bg-muted px-2 py-0.5">
                    s[i] = &apos;{currentStep.currentChar}&apos;
                  </span>
                </>
              )}
              <span className="rounded border border-warning/30 bg-warning/10 px-2 py-0.5 font-bold text-warning">
                {currentStep.primaryVarName} = {currentStep.primaryVarValue}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono">
            <span className="font-sans text-muted-foreground">
              {currentStep.memoryLabel || 'Bộ nhớ'}:
            </span>
            {/* Chế độ cấu trúc không có ô nhớ nào để vẽ — thay bằng tên loại khối
                thì hữu ích hơn là một chữ "[rỗng]" ở mọi bước. */}
            {currentStep.kind === 'structure' ? (
              <span className="max-w-[220px] truncate rounded border bg-muted px-2 py-0.5 font-sans">
                {currentStep.action || '—'}
              </span>
            ) : (
              <div className="flex items-center gap-1">
              {!currentStep.memoryItems || currentStep.memoryItems.length === 0 ? (
                <span className="font-sans text-[11px] italic text-muted-foreground">
                  [rỗng]
                </span>
              ) : (
                currentStep.memoryItems.map((item, idx) => (
                  <span
                    key={idx}
                    className="flex h-5 w-5 items-center justify-center rounded border border-[hsl(280_70%_60%/0.4)] bg-[hsl(280_70%_60%/0.15)] text-xs font-bold text-[hsl(280_60%_45%)] dark:text-[hsl(280_70%_72%)]"
                  >
                    {item}
                  </span>
                ))
              )}
              </div>
            )}
          </div>

          <div className="hidden max-w-sm italic line-clamp-1 text-[11px] text-muted-foreground lg:block">
            {currentStep.explanation}
          </div>
        </div>
      )}
    </div>
  );
}
