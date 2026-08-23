'use client';

import React, { useState, useMemo, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  MarkerType,
  Position,
  Handle,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Play, Pause, RotateCcw, ChevronRight, ChevronLeft, Info, Layers, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

// Custom Flowchart Node
function CustomNode({ data }: { data: any }) {
  const isCurrent = data.isActive;
  return (
    <div
      className={cn(
        'px-4 py-2.5 rounded-xl border shadow-sm transition-all duration-300 min-w-[200px] text-center backdrop-blur-sm',
        data.type === 'start' && 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold',
        data.type === 'condition' && 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 font-medium',
        data.type === 'action' && 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400',
        data.type === 'stack' && 'bg-purple-500/10 border-purple-500 text-purple-600 dark:text-purple-400',
        data.type === 'output' && 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold',
        isCurrent && 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105 shadow-md border-primary'
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground w-2 h-2" />
      <div className="text-xs font-semibold uppercase tracking-wider opacity-75 mb-1">{data.category}</div>
      <div className="text-sm font-mono font-medium">{data.label}</div>
      {data.subtext && <div className="text-[11px] text-muted-foreground mt-1">{data.subtext}</div>}
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground w-2 h-2" />
    </div>
  );
}

const nodeTypes = {
  custom: CustomNode,
};

// Simulation Steps for Dry Run (STRNUM: n=8, k=6, s="88432334")
interface SimulationStep {
  step: number;
  nodeId: string;
  i: number;
  currentChar: string;
  k: number;
  stack: string[];
  action: string;
  explanation: string;
}

const SIMULATION_STEPS: SimulationStep[] = [
  {
    step: 1,
    nodeId: 'node-init',
    i: -1,
    currentChar: '-',
    k: 6,
    stack: [],
    action: 'Khởi tạo',
    explanation: 'Đọc dữ liệu: n=8, k=6, s="88432334". Chuẩn bị Stack rỗng.',
  },
  {
    step: 2,
    nodeId: 'node-loop',
    i: 0,
    currentChar: '8',
    k: 6,
    stack: [],
    action: 'Duyệt i=0',
    explanation: 'Kí tự s[0]="8". Stack rỗng nên không cần so sánh pop. Đẩy "8" vào Stack.',
  },
  {
    step: 3,
    nodeId: 'node-push',
    i: 0,
    currentChar: '8',
    k: 6,
    stack: ['8'],
    action: 'st.push("8")',
    explanation: 'Stack hiện tại: [8].',
  },
  {
    step: 4,
    nodeId: 'node-loop',
    i: 1,
    currentChar: '8',
    k: 6,
    stack: ['8'],
    action: 'Duyệt i=1',
    explanation: 'Kí tự s[1]="8". So sánh s[1] với st.top()=8. Không lớn hơn nên không pop.',
  },
  {
    step: 5,
    nodeId: 'node-push',
    i: 1,
    currentChar: '8',
    k: 6,
    stack: ['8', '8'],
    action: 'st.push("8")',
    explanation: 'Stack hiện tại: [8, 8].',
  },
  {
    step: 6,
    nodeId: 'node-loop',
    i: 2,
    currentChar: '4',
    k: 6,
    stack: ['8', '8'],
    action: 'Duyệt i=2',
    explanation: 'Kí tự s[2]="4". s[2] < st.top()=8 nên không pop. Đẩy "4" vào Stack.',
  },
  {
    step: 7,
    nodeId: 'node-push',
    i: 2,
    currentChar: '4',
    k: 6,
    stack: ['8', '8', '4'],
    action: 'st.push("4")',
    explanation: 'Stack hiện tại: [8, 8, 4].',
  },
  {
    step: 8,
    nodeId: 'node-condition',
    i: 3,
    currentChar: '3',
    k: 6,
    stack: ['8', '8', '4'],
    action: 'Duyệt i=3',
    explanation: 'Kí tự s[3]="3". s[3] < st.top()=4 nên không pop. Đẩy "3" vào Stack.',
  },
  {
    step: 9,
    nodeId: 'node-push',
    i: 3,
    currentChar: '3',
    k: 6,
    stack: ['8', '8', '4', '3'],
    action: 'st.push("3")',
    explanation: 'Stack hiện tại: [8, 8, 4, 3].',
  },
  {
    step: 10,
    nodeId: 'node-condition',
    i: 4,
    currentChar: '2',
    k: 6,
    stack: ['8', '8', '4', '3'],
    action: 'Duyệt i=4',
    explanation: 'Kí tự s[4]="2". s[4] < st.top()=3 nên không pop. Đẩy "2" vào Stack.',
  },
  {
    step: 11,
    nodeId: 'node-push',
    i: 4,
    currentChar: '2',
    k: 6,
    stack: ['8', '8', '4', '3', '2'],
    action: 'st.push("2")',
    explanation: 'Stack hiện tại: [8, 8, 4, 3, 2].',
  },
  {
    step: 12,
    nodeId: 'node-condition',
    i: 5,
    currentChar: '3',
    k: 6,
    stack: ['8', '8', '4', '3', '2'],
    action: 'Duyệt i=5',
    explanation: 'Kí tự s[5]="3". Vì s[5] > st.top()="2" và k=6 > 0 -> POP "2", k giảm còn 5!',
  },
  {
    step: 13,
    nodeId: 'node-pop',
    i: 5,
    currentChar: '3',
    k: 5,
    stack: ['8', '8', '4', '3'],
    action: 'st.pop() -> Xóa 2',
    explanation: 'Đã xóa số nhỏ hơn để số lớn hơn đứng trước. Tiếp tục so s[5]="3" với st.top()="3". Bằng nhau -> dừng pop.',
  },
  {
    step: 14,
    nodeId: 'node-push',
    i: 5,
    currentChar: '3',
    k: 5,
    stack: ['8', '8', '4', '3', '3'],
    action: 'st.push("3")',
    explanation: 'Stack hiện tại: [8, 8, 4, 3, 3].',
  },
  {
    step: 15,
    nodeId: 'node-condition',
    i: 6,
    currentChar: '3',
    k: 5,
    stack: ['8', '8', '4', '3', '3'],
    action: 'Duyệt i=6',
    explanation: 'Kí tự s[6]="3". Đẩy vào Stack.',
  },
  {
    step: 16,
    nodeId: 'node-push',
    i: 6,
    currentChar: '3',
    k: 5,
    stack: ['8', '8', '4', '3', '3', '3'],
    action: 'st.push("3")',
    explanation: 'Stack hiện tại: [8, 8, 4, 3, 3, 3].',
  },
  {
    step: 17,
    nodeId: 'node-condition',
    i: 7,
    currentChar: '4',
    k: 5,
    stack: ['8', '8', '4', '3', '3', '3'],
    action: 'Duyệt i=7',
    explanation: 'Kí tự s[7]="4" > st.top()="3" và k>0 -> Liên tục POP các số "3"!',
  },
  {
    step: 18,
    nodeId: 'node-pop',
    i: 7,
    currentChar: '4',
    k: 2,
    stack: ['8', '8', '4'],
    action: 'POP 3 lần "3", k còn 2',
    explanation: 'Sau khi pop 3 lần kí tự "3", st.top()="4" không nhỏ hơn s[7]="4" -> Dừng pop và push "4".',
  },
  {
    step: 19,
    nodeId: 'node-push',
    i: 7,
    currentChar: '4',
    k: 2,
    stack: ['8', '8', '4', '4'],
    action: 'st.push("4")',
    explanation: 'Đã duyệt hết chuỗi s. Stack hiện tại: [8, 8, 4, 4].',
  },
  {
    step: 20,
    nodeId: 'node-trim',
    i: 8,
    currentChar: 'Hết',
    k: 0,
    stack: ['8', '8'],
    action: 'Xóa k phần tử cuối',
    explanation: 'Vì k vẫn còn 2 lần xóa, ta xóa 2 phần tử ở đỉnh stack (4, 4). Kết quả còn lại: [8, 8].',
  },
  {
    step: 21,
    nodeId: 'node-output',
    i: 8,
    currentChar: '-',
    k: 0,
    stack: ['8', '8'],
    action: 'In kết quả: "88"',
    explanation: 'Đảo ngược thứ tự lấy từ Stack -> In kết quả: 88 (Khớp chuẩn 100% test case!)',
  },
];

interface FlowchartViewerProps {
  problemCode?: string;
}

export function FlowchartViewer({ problemCode = 'STRNUM' }: FlowchartViewerProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const currentStep = SIMULATION_STEPS[currentStepIndex];

  // Raw Flowchart Nodes
  const initialNodes: Node[] = useMemo(
    () => [
      {
        id: 'node-init',
        type: 'custom',
        position: { x: 250, y: 20 },
        data: {
          category: 'Khởi tạo',
          label: 'cin >> n >> k >> s',
          subtext: 'stack<char> st; vector<char> v;',
          type: 'start',
          isActive: currentStep.nodeId === 'node-init',
        },
      },
      {
        id: 'node-loop',
        type: 'custom',
        position: { x: 250, y: 130 },
        data: {
          category: 'Vòng lặp chính',
          label: 'for (int i = 0; i < n; i++)',
          subtext: 'Duyệt từng chữ số s[i]',
          type: 'action',
          isActive: currentStep.nodeId === 'node-loop',
        },
      },
      {
        id: 'node-condition',
        type: 'custom',
        position: { x: 250, y: 240 },
        data: {
          category: 'Kiểm tra Stack',
          label: 'while (k > 0 && s[i] > st.top())',
          subtext: 'Tham lam: giữ chữ số lớn ở đầu',
          type: 'condition',
          isActive: currentStep.nodeId === 'node-condition',
        },
      },
      {
        id: 'node-pop',
        type: 'custom',
        position: { x: 50, y: 350 },
        data: {
          category: 'Thao tác Stack',
          label: 'st.pop(); k--;',
          subtext: 'Xóa chữ số nhỏ hơn đứng trước',
          type: 'stack',
          isActive: currentStep.nodeId === 'node-pop',
        },
      },
      {
        id: 'node-push',
        type: 'custom',
        position: { x: 450, y: 350 },
        data: {
          category: 'Thao tác Stack',
          label: 'st.push(s[i]);',
          subtext: 'Thêm chữ số hiện tại vào Stack',
          type: 'stack',
          isActive: currentStep.nodeId === 'node-push',
        },
      },
      {
        id: 'node-trim',
        type: 'custom',
        position: { x: 250, y: 470 },
        data: {
          category: 'Xử lý dư',
          label: 'while (k > 0) { st.pop(); k--; }',
          subtext: 'Nếu k còn dư -> xóa từ đuôi',
          type: 'action',
          isActive: currentStep.nodeId === 'node-trim',
        },
      },
      {
        id: 'node-output',
        type: 'custom',
        position: { x: 250, y: 580 },
        data: {
          category: 'Xuất kết quả',
          label: 'In các phần tử trong Stack',
          subtext: 'Đảo ngược và in ra stdout',
          type: 'output',
          isActive: currentStep.nodeId === 'node-output',
        },
      },
    ],
    [currentStep.nodeId]
  );

  const initialEdges: Edge[] = useMemo(
    () => [
      { id: 'e1-2', source: 'node-init', target: 'node-loop', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e2-3', source: 'node-loop', target: 'node-condition', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e3-4', source: 'node-condition', target: 'node-pop', label: 'Đúng (s[i] > top)', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e4-3', source: 'node-pop', target: 'node-condition', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e3-5', source: 'node-condition', target: 'node-push', label: 'Sai / Dừng pop', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e5-2', source: 'node-push', target: 'node-loop', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e2-6', source: 'node-loop', target: 'node-trim', label: 'Hết chuỗi', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e6-7', source: 'node-trim', target: 'node-output', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
    ],
    []
  );

  const handleNext = useCallback(() => {
    setCurrentStepIndex((prev) => Math.min(prev + 1, SIMULATION_STEPS.length - 1));
  }, []);

  const handlePrev = useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleReset = useCallback(() => {
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }, []);

  // Auto play simulation
  React.useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= SIMULATION_STEPS.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1500);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      {/* Top Dry Run Control Bar */}
      <div className="border-b bg-muted/40 p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-background border px-2.5 py-1 rounded-lg text-xs font-mono">
            <span className="text-muted-foreground">Test mẫu:</span>
            <span className="font-semibold text-primary">N=8, K=6, S=&quot;88432334&quot;</span>
          </div>
          <div className="text-xs text-muted-foreground hidden sm:block">
            Bước <span className="font-bold text-foreground">{currentStep.step}</span> / {SIMULATION_STEPS.length}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30"
            title="Bước trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition shadow-sm"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" /> Dừng
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" /> Chạy từng bước
              </>
            )}
          </button>

          <button
            onClick={handleNext}
            disabled={currentStepIndex === SIMULATION_STEPS.length - 1}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30"
            title="Bước tiếp theo"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleReset}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
            title="Chạy lại từ đầu"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Split: React Flow (Left) + Dry Run State Inspector (Right) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 overflow-hidden">
        {/* React Flow Canvas (2 Cols on desktop) */}
        <div className="lg:col-span-2 h-full border-r relative bg-dot-grid">
          <ReactFlow
            nodes={initialNodes}
            edges={initialEdges}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
            className="bg-background/80"
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            <Controls className="!bg-background !border !rounded-lg shadow-sm" />
            <MiniMap
              nodeStrokeColor="#6366f1"
              nodeColor="#e0e7ff"
              className="!bg-background/90 !border !rounded-lg"
            />
          </ReactFlow>
        </div>

        {/* Right Drawer: Dry Run Inspector & Pedagogical Explanations */}
        <div className="flex flex-col h-full bg-muted/10 overflow-y-auto p-4 gap-4">
          {/* Step Action Banner */}
          <div className="p-3.5 rounded-xl border bg-card/60 backdrop-blur-sm shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
              <Eye className="w-3.5 h-3.5" /> Hành động hiện tại
            </div>
            <div className="text-base font-bold text-foreground font-mono">{currentStep.action}</div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {currentStep.explanation}
            </p>
          </div>

          {/* Variables Inspector Box */}
          <div className="p-3.5 rounded-xl border bg-card/60 backdrop-blur-sm shadow-sm space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Bảng biến chạy (Trace Watch)</span>
              <span className="text-[10px] text-primary">Live</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-background border font-mono">
                <div className="text-[10px] text-muted-foreground uppercase">Vị trí i</div>
                <div className="text-sm font-bold text-foreground">{currentStep.i >= 0 ? currentStep.i : '-'}</div>
              </div>
              <div className="p-2 rounded-lg bg-background border font-mono">
                <div className="text-[10px] text-muted-foreground uppercase">s[i]</div>
                <div className="text-sm font-bold text-amber-500">{currentStep.currentChar}</div>
              </div>
              <div className="p-2 rounded-lg bg-background border font-mono">
                <div className="text-[10px] text-muted-foreground uppercase">k còn lại</div>
                <div className="text-sm font-bold text-emerald-500">{currentStep.k}</div>
              </div>
            </div>

            {/* Stack Visualizer */}
            <div className="pt-2">
              <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-500" />
                <span>Trạng thái Monotonic Stack (Đáy &rarr; Đỉnh):</span>
              </div>
              <div className="flex items-center gap-1.5 min-h-[42px] p-2 rounded-lg bg-background border overflow-x-auto">
                {currentStep.stack.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic">Stack rỗng</span>
                ) : (
                  currentStep.stack.map((item, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'w-7 h-7 rounded-md flex items-center justify-center font-mono font-bold text-xs border shadow-xs',
                        idx === currentStep.stack.length - 1
                          ? 'bg-purple-500 text-white border-purple-600 ring-2 ring-purple-400'
                          : 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30'
                      )}
                      title={idx === currentStep.stack.length - 1 ? 'Đỉnh Stack (top)' : undefined}
                    >
                      {item}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Pedagogical Insight Card */}
          <div className="p-3.5 rounded-xl border bg-blue-500/5 border-blue-500/20 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400">
              <Info className="w-4 h-4" /> Bản chất Thuật toán (HSG Key):
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Để tạo số lớn nhất khi xóa \(k\) chữ số, ta cần đưa <strong>chữ số lớn nhất có thể về vị trí đầu tiên</strong> (tư duy Tham lam).
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Sử dụng <strong>Monotonic Stack</strong> (Stack đơn điệu giảm dần) giúp ta nhanh chóng loại bỏ các chữ số nhỏ hơn đứng trước mỗi khi gặp chữ số mới lớn hơn chỉ trong độ phức tạp \(O(N)\).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
