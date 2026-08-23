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
import {
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Plus,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateFlowchartFromCpp } from '@/lib/cpp-to-flowchart';
import { generateSimulationTrace, SimulationStep } from '@/lib/simulation-generator';

// Custom Flowchart Node with High-aesthetic Visuals
function CustomNode({ id, data }: { id: string; data: any }) {
  const isCurrent = data.isActive;

  return (
    <div
      className={cn(
        'px-4 py-2.5 rounded-2xl border shadow-lg transition-all duration-300 min-w-[210px] text-center backdrop-blur-md relative group select-none cursor-grab active:cursor-grabbing',
        data.type === 'start' && 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300 shadow-emerald-950/50',
        data.type === 'condition' && 'bg-amber-950/70 border-amber-500/50 text-amber-300 shadow-amber-950/50',
        data.type === 'action' && 'bg-blue-950/70 border-blue-500/50 text-blue-300 shadow-blue-950/50',
        data.type === 'stack' && 'bg-purple-950/70 border-purple-500/50 text-purple-300 shadow-purple-950/50',
        data.type === 'output' && 'bg-teal-950/70 border-teal-500/50 text-teal-300 shadow-teal-950/50',
        isCurrent && 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-background scale-105 shadow-xl border-emerald-400'
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-slate-400 !w-2.5 !h-2.5 !border-2 !border-background"
      />
      <div className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-0.5 flex items-center justify-center gap-1">
        <span>{data.category}</span>
      </div>
      <div className="text-xs font-mono font-bold tracking-tight text-foreground">{data.label}</div>
      {data.subtext && <div className="text-[10px] text-muted-foreground mt-1 opacity-90">{data.subtext}</div>}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-slate-400 !w-2.5 !h-2.5 !border-2 !border-background"
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
}

const DEFAULT_STRNUM_CODE = `#include <bits/stdc++.h>
using namespace std;
int n, k;
string s;
stack<char> st;
int main() {
    if (cin >> n >> k >> s) {
        for (int i = 0; i < n; i++) {
            while (k > 0 && !st.empty() && s[i] > st.top()) {
                st.pop(); k--;
            }
            st.push(s[i]);
        }
        while (k > 0 && !st.empty()) { st.pop(); k--; }
        vector<char> ans;
        while (!st.empty()) { ans.push_back(st.top()); st.pop(); }
        for (int i = ans.size() - 1; i >= 0; i--) cout << ans[i];
    }
    return 0;
}`;

export function FlowchartViewer({ problemCode = 'STRNUM', initialCode }: FlowchartViewerProps) {
  const code = initialCode || DEFAULT_STRNUM_CODE;

  // 1. Tự động sinh danh sách các bước mô phỏng (Dry-run Steps) cho từng bài
  const simulationSteps = useMemo(() => {
    return generateSimulationTrace(code, problemCode);
  }, [code, problemCode]);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const currentStep = simulationSteps[currentStepIndex] || simulationSteps[0];

  // 2. Tự động sinh cấu trúc Nodes & Edges từ Code C++
  const initialGenerated = useMemo(() => {
    return generateFlowchartFromCpp(code, problemCode);
  }, [code, problemCode]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialGenerated.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialGenerated.edges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Sync active step to nodes highlight
  React.useEffect(() => {
    if (!currentStep) return;
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isActive: node.id === currentStep?.nodeId,
        },
      }))
    );
  }, [currentStepIndex, currentStep?.nodeId, setNodes, currentStep]);

  const handleResetLayout = () => {
    const regenerated = generateFlowchartFromCpp(code, problemCode);
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
    let timer: any;
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
    return () => clearInterval(timer);
  }, [isPlaying, simulationSteps.length]);

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden relative">
      {/* Top Interactive Toolbar */}
      <div className="border-b bg-muted/30 px-3 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0 z-10 backdrop-blur-sm">
        {/* Left: Dry Run Stepper */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold shadow-sm transition',
              isPlaying
                ? 'bg-amber-500 text-amber-950 hover:bg-amber-600'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            )}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Tạm dừng' : 'Chạy mô phỏng'}</span>
          </button>

          <button
            onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentStepIndex === 0 || isPlaying}
            className="p-1 rounded-lg border bg-background hover:bg-muted text-foreground disabled:opacity-40 text-xs"
            title="Bước trước"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <span className="text-[11px] font-mono font-semibold px-1 text-muted-foreground">
            Bước {currentStepIndex + 1}/{simulationSteps.length}
          </span>

          <button
            onClick={() => setCurrentStepIndex((prev) => Math.min(simulationSteps.length - 1, prev + 1))}
            disabled={currentStepIndex === simulationSteps.length - 1 || isPlaying}
            className="p-1 rounded-lg border bg-background hover:bg-muted text-foreground disabled:opacity-40 text-xs"
            title="Bước kế tiếp"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              setCurrentStepIndex(0);
              setIsPlaying(false);
            }}
            className="p-1 rounded-lg border bg-background hover:bg-muted text-muted-foreground hover:text-foreground text-xs ml-1"
            title="Đặt lại mô phỏng"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Drag & Drop and Auto-generate actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleAddNewNode}
            className="flex items-center gap-1 px-2 py-1 rounded-lg border bg-card hover:bg-muted text-xs font-medium text-foreground transition"
            title="Thêm khối mới vào sơ đồ"
          >
            <Plus className="w-3 h-3 text-primary" />
            <span className="hidden sm:inline">Thêm khối</span>
          </button>

          <button
            onClick={handleResetLayout}
            className="flex items-center gap-1 px-2 py-1 rounded-lg border bg-card hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition"
            title="Tự động sắp xếp lại từ C++"
          >
            <Sparkles className="w-3 h-3 text-amber-500" />
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
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#334155" />
          <Controls className="!bg-card !border-border !shadow-md !rounded-xl overflow-hidden" />
          <MiniMap
            className="!bg-card/90 !border-border !rounded-xl overflow-hidden hidden sm:block"
            nodeColor={(node) => {
              if (node.data?.type === 'start') return '#10b981';
              if (node.data?.type === 'condition') return '#f59e0b';
              if (node.data?.type === 'stack') return '#a855f7';
              return '#3b82f6';
            }}
          />
        </ReactFlow>
      </div>

      {/* Bottom Live Dry Run Dynamic Variable Watcher Bar */}
      {currentStep && (
        <div className="border-t bg-card/95 backdrop-blur px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shrink-0 z-10 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="font-bold text-primary flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" /> Biến theo dõi:
            </span>
            <div className="flex items-center gap-2 font-mono">
              <span className="px-2 py-0.5 rounded bg-muted border">i = {currentStep.i >= 0 ? currentStep.i : '-'}</span>
              <span className="px-2 py-0.5 rounded bg-muted border">s[i] = &apos;{currentStep.currentChar}&apos;</span>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-500 font-bold">
                {currentStep.primaryVarName} = {currentStep.primaryVarValue}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono">
            <span className="text-muted-foreground font-sans">{currentStep.memoryLabel || 'Bộ nhớ'}:</span>
            <div className="flex items-center gap-1">
              {!currentStep.memoryItems || currentStep.memoryItems.length === 0 ? (
                <span className="text-muted-foreground italic font-sans text-[11px]">[rỗng]</span>
              ) : (
                currentStep.memoryItems.map((item, idx) => (
                  <span
                    key={idx}
                    className="w-5 h-5 rounded bg-purple-500/20 border border-purple-500/40 text-purple-400 font-bold flex items-center justify-center text-xs"
                  >
                    {item}
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground line-clamp-1 italic max-w-sm hidden lg:block">
            {currentStep.explanation}
          </div>
        </div>
      )}
    </div>
  );
}
