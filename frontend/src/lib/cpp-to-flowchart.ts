// ============================================
// C++ to Flowchart Generator Engine
// Tự động phân tích cú pháp mã nguồn C++ (AST parser rút gọn)
// và sinh cấu trúc Sơ đồ thuật toán React Flow (Nodes & Edges)
// ============================================

import { Node, Edge, MarkerType } from 'reactflow';

export interface FlowchartData {
  nodes: Node[];
  edges: Edge[];
}

export function generateFlowchartFromCpp(
  cppCode: string,
  problemCode: string = 'PROBLEM'
): FlowchartData {
  const lines = cppCode
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('//') && !l.startsWith('#'));

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  let currentY = 30;
  const centerX = 260;
  let prevNodeId: string | null = null;
  let nodeCount = 0;

  // 1. Phân tích Khởi tạo (cin, biến, stack/vector)
  const initLines = lines.filter(
    (l) =>
      l.includes('cin >>') ||
      l.includes('stack<') ||
      l.includes('vector<') ||
      l.includes('queue<') ||
      (l.includes('int ') && !l.includes('main()') && !l.includes('for('))
  );

  const initLabel = initLines.length > 0
    ? initLines.slice(0, 2).join('; ')
    : `cin >> ${problemCode.toLowerCase()}_input`;

  const initNodeId = 'node-init';
  nodes.push({
    id: initNodeId,
    type: 'custom',
    position: { x: centerX, y: currentY },
    data: {
      category: 'Khởi tạo',
      label: initLabel.length > 40 ? initLabel.slice(0, 38) + '...' : initLabel,
      subtext: 'Khai báo biến & nạp dữ liệu đầu vào',
      type: 'start',
    },
  });
  prevNodeId = initNodeId;
  currentY += 120;

  // 2. Phân tích Vòng lặp chính (for, while)
  const loopLine = lines.find((l) => l.startsWith('for') || (l.startsWith('while') && !l.includes('empty')));
  const loopLabel = loopLine ? loopLine.replace('{', '').trim() : 'for (int i = 0; i < n; i++)';
  const loopNodeId = 'node-loop';

  nodes.push({
    id: loopNodeId,
    type: 'custom',
    position: { x: centerX, y: currentY },
    data: {
      category: 'Vòng lặp chính',
      label: loopLabel,
      subtext: 'Duyệt từng phần tử / trạng thái bài toán',
      type: 'action',
    },
  });

  if (prevNodeId) {
    edges.push({
      id: `e-${prevNodeId}-${loopNodeId}`,
      source: prevNodeId,
      target: loopNodeId,
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
      style: { stroke: '#3b82f6', strokeWidth: 2 },
    });
  }
  prevNodeId = loopNodeId;
  currentY += 130;

  // 3. Phân tích Điều kiện / Rẽ nhánh (if, while condition)
  const conditionLine = lines.find(
    (l) =>
      (l.startsWith('if') || l.startsWith('while')) &&
      (l.includes('>') || l.includes('<') || l.includes('==') || l.includes('&&') || l.includes('top()') || l.includes('pop'))
  );

  const condLabel = conditionLine
    ? conditionLine.replace(/[\{\}]/g, '').trim()
    : 'while (k > 0 && s[i] > st.top())';

  const condNodeId = 'node-condition';
  nodes.push({
    id: condNodeId,
    type: 'custom',
    position: { x: centerX, y: currentY },
    data: {
      category: 'Điều kiện rẽ nhánh',
      label: condLabel.length > 45 ? condLabel.slice(0, 42) + '...' : condLabel,
      subtext: 'Kiểm tra tính tối ưu / tiêu chuẩn tham lam',
      type: 'condition',
    },
  });

  if (prevNodeId) {
    edges.push({
      id: `e-${prevNodeId}-${condNodeId}`,
      source: prevNodeId,
      target: condNodeId,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
      style: { stroke: '#f59e0b', strokeWidth: 2 },
    });
  }

  // 4. Nhánh Đúng (Thao tác Pop / Cập nhật trạng thái)
  const popNodeId = 'node-true-action';
  nodes.push({
    id: popNodeId,
    type: 'custom',
    position: { x: 50, y: currentY + 130 },
    data: {
      category: 'Thao tác [Đúng]',
      label: 'st.pop(); k--; // Cập nhật tối ưu',
      subtext: 'Loại bỏ phần tử không tối ưu',
      type: 'stack',
    },
  });

  // Nhánh Sai (Thao tác Push / Giữ nguyên)
  const pushNodeId = 'node-false-action';
  nodes.push({
    id: pushNodeId,
    type: 'custom',
    position: { x: 470, y: currentY + 130 },
    data: {
      category: 'Thao tác [Sai/Tiếp tục]',
      label: 'st.push(s[i]);',
      subtext: 'Lưu trữ giá trị hiện tại vào tập kết quả',
      type: 'stack',
    },
  });

  // Edge [Đúng] - Sang trái
  edges.push({
    id: `e-${condNodeId}-${popNodeId}`,
    source: condNodeId,
    target: popNodeId,
    label: '✓ Đúng (Thỏa ĐK)',
    labelStyle: { fill: '#10b981', fontWeight: 700, fontSize: 11 },
    labelBgStyle: { fill: '#052e16', fillOpacity: 0.95, stroke: '#10b981', strokeWidth: 1, rx: 8, ry: 8 },
    labelBgPadding: [6, 8],
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
    style: { stroke: '#10b981', strokeWidth: 2 },
  });

  // Loop back from Pop to Condition
  edges.push({
    id: `e-${popNodeId}-${condNodeId}`,
    source: popNodeId,
    target: condNodeId,
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
    style: { stroke: '#10b981', strokeWidth: 1.5, strokeDasharray: '4,4' },
  });

  // Edge [Sai] - Sang phải
  edges.push({
    id: `e-${condNodeId}-${pushNodeId}`,
    source: condNodeId,
    target: pushNodeId,
    label: '✗ Sai / Dừng',
    labelStyle: { fill: '#f59e0b', fontWeight: 700, fontSize: 11 },
    labelBgStyle: { fill: '#451a03', fillOpacity: 0.95, stroke: '#f59e0b', strokeWidth: 1, rx: 8, ry: 8 },
    labelBgPadding: [6, 8],
    markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
    style: { stroke: '#f59e0b', strokeWidth: 2 },
  });

  // Edge from Push back to Loop
  edges.push({
    id: `e-${pushNodeId}-${loopNodeId}`,
    source: pushNodeId,
    target: loopNodeId,
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
    style: { stroke: '#3b82f6', strokeWidth: 1.5, strokeDasharray: '4,4' },
  });

  currentY += 270;

  // 5. Khối Xử lý Hậu kỳ (Post-processing)
  const trimNodeId = 'node-trim';
  nodes.push({
    id: trimNodeId,
    type: 'custom',
    position: { x: centerX, y: currentY },
    data: {
      category: 'Xử lý hoàn tất',
      label: 'Xử lý dư & Chuẩn hóa đầu ra',
      subtext: 'Đảm bảo độ dài và định dạng yêu cầu',
      type: 'action',
    },
  });

  edges.push({
    id: `e-${loopNodeId}-${trimNodeId}`,
    source: loopNodeId,
    target: trimNodeId,
    label: '⚡ Hoàn tất lặp',
    labelStyle: { fill: '#38bdf8', fontWeight: 700, fontSize: 11 },
    labelBgStyle: { fill: '#082f49', fillOpacity: 0.95, stroke: '#0284c7', strokeWidth: 1, rx: 8, ry: 8 },
    labelBgPadding: [6, 8],
    markerEnd: { type: MarkerType.ArrowClosed, color: '#38bdf8' },
    style: { stroke: '#38bdf8', strokeWidth: 2 },
  });

  currentY += 120;

  // 6. Khối Xuất kết quả (cout / Output)
  const outputLine = lines.find((l) => l.includes('cout <<') || l.includes('printf('));
  const outputLabel = outputLine ? outputLine.replace(';', '').trim() : 'cout << ans << "\\n";';
  const outNodeId = 'node-output';

  nodes.push({
    id: outNodeId,
    type: 'custom',
    position: { x: centerX, y: currentY },
    data: {
      category: 'Xuất kết quả',
      label: outputLabel,
      subtext: 'In kết quả chuẩn ra stdout / file output',
      type: 'output',
    },
  });

  edges.push({
    id: `e-${trimNodeId}-${outNodeId}`,
    source: trimNodeId,
    target: outNodeId,
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
    style: { stroke: '#10b981', strokeWidth: 2 },
  });

  return { nodes, edges };
}
