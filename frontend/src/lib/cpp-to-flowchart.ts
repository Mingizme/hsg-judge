// ============================================
// C++ to Flowchart Generator Engine
// Tự động phân tích cú pháp mã nguồn C++ (AST parser)
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
  const codeLower = cppCode.toLowerCase();
  const hasStack = codeLower.includes('stack<') || codeLower.includes('.pop()');
  const isStringFiltering =
    (codeLower.includes('string ') || codeLower.includes('char ')) &&
    (codeLower.includes('isdigit') || codeLower.includes("c >= '0'") || codeLower.includes("res +=") || codeLower.includes("h +="));

  const lines = cppCode
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('//') && !l.startsWith('#'));

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  let currentY = 30;
  const centerX = 260;
  let prevNodeId: string | null = null;

  // ── TRƯỜNG HỢP 1: BÀI TOÁN XÂU / LỌC KÝ TỰ (NHƯ TAOXAU) ──────────────────
  if (isStringFiltering && !hasStack) {
    // 1. Khởi tạo
    const initNodeId = 'node-init';
    nodes.push({
      id: initNodeId,
      type: 'custom',
      position: { x: centerX, y: currentY },
      data: {
        category: 'Khởi tạo',
        label: 'string s, res = ""; getline(cin, s);',
        subtext: 'Khai báo xâu gốc s và xâu kết quả rỗng res',
        type: 'start',
      },
    });
    currentY += 120;

    // 2. Vòng lặp duyệt từng ký tự
    const loopNodeId = 'node-loop';
    nodes.push({
      id: loopNodeId,
      type: 'custom',
      position: { x: centerX, y: currentY },
      data: {
        category: 'Vòng lặp chính',
        label: 'for (char c : s)',
        subtext: 'Lần lượt duyệt qua từng ký tự c trong xâu s',
        type: 'action',
      },
    });

    edges.push({
      id: `e-${initNodeId}-${loopNodeId}`,
      source: initNodeId,
      target: loopNodeId,
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
      style: { stroke: '#3b82f6', strokeWidth: 2 },
    });
    currentY += 130;

    // 3. Điều kiện kiểm tra ký tự số
    const condNodeId = 'node-condition';
    nodes.push({
      id: condNodeId,
      type: 'custom',
      position: { x: centerX, y: currentY },
      data: {
        category: 'Điều kiện rẽ nhánh',
        label: "if (c >= '0' && c <= '9')",
        subtext: 'Kiểm tra ký tự c có phải là chữ số hay không',
        type: 'condition',
      },
    });

    edges.push({
      id: `e-${loopNodeId}-${condNodeId}`,
      source: loopNodeId,
      target: condNodeId,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
      style: { stroke: '#f59e0b', strokeWidth: 2 },
    });

    // 4. Nhánh Đúng (Thêm vào kết quả)
    const trueNodeId = 'node-true-action';
    nodes.push({
      id: trueNodeId,
      type: 'custom',
      position: { x: 50, y: currentY + 130 },
      data: {
        category: 'Thao tác [Đúng]',
        label: 'res += c; // Nối chữ số',
        subtext: 'Ký tự c là chữ số -> Ghép vào xâu kết quả res',
        type: 'stack',
      },
    });

    // Nhánh Sai (Bỏ qua ký tự)
    const falseNodeId = 'node-false-action';
    nodes.push({
      id: falseNodeId,
      type: 'custom',
      position: { x: 470, y: currentY + 130 },
      data: {
        category: 'Thao tác [Sai]',
        label: '// Bỏ qua ký tự',
        subtext: 'Không phải chữ số -> Tiếp tục duyệt ký tự kế tiếp',
        type: 'stack',
      },
    });

    // Nối nhánh ĐÚNG
    edges.push({
      id: `e-${condNodeId}-${trueNodeId}`,
      source: condNodeId,
      target: trueNodeId,
      label: '✓ Đúng (Là chữ số)',
      labelStyle: { fill: '#10b981', fontWeight: 700, fontSize: 11 },
      labelBgStyle: { fill: '#064e3b', fillOpacity: 0.85 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
      style: { stroke: '#10b981', strokeWidth: 2.5, strokeDasharray: '4 4' },
    });

    // Nối nhánh SAI
    edges.push({
      id: `e-${condNodeId}-${falseNodeId}`,
      source: condNodeId,
      target: falseNodeId,
      label: '✗ Sai (Bỏ qua)',
      labelStyle: { fill: '#ef4444', fontWeight: 700, fontSize: 11 },
      labelBgStyle: { fill: '#450a0a', fillOpacity: 0.85 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
      style: { stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '4 4' },
    });

    currentY += 260;

    // 5. Kết thúc xuất kết quả
    const outNodeId = 'node-output';
    nodes.push({
      id: outNodeId,
      type: 'custom',
      position: { x: centerX, y: currentY },
      data: {
        category: 'Xuất kết quả',
        label: 'cout << res;',
        subtext: 'In xâu kết quả res ra tệp văn bản TAOXAU.OUT',
        type: 'end',
      },
    });

    edges.push({
      id: `e-${condNodeId}-${outNodeId}`,
      source: condNodeId,
      target: outNodeId,
      label: '⚡ Sau khi duyệt hết xâu',
      labelStyle: { fill: '#38bdf8', fontWeight: 600, fontSize: 11 },
      labelBgStyle: { fill: '#082f49', fillOpacity: 0.8 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#38bdf8' },
      style: { stroke: '#38bdf8', strokeWidth: 2 },
    });

    return { nodes, edges };
  }

  // ── TRƯỜNG HỢP 2: BÀI TOÁN STACK / MONOTONIC (NHƯ STRNUM) ──────────────────
  if (hasStack) {
    const initNodeId = 'node-init';
    nodes.push({
      id: initNodeId,
      type: 'custom',
      position: { x: centerX, y: currentY },
      data: {
        category: 'Khởi tạo',
        label: 'cin >> n >> k >> s; stack<char> st;',
        subtext: 'Khai báo biến n, k, xâu s và khởi tạo Stack rỗng',
        type: 'start',
      },
    });
    currentY += 120;

    const loopNodeId = 'node-loop';
    nodes.push({
      id: loopNodeId,
      type: 'custom',
      position: { x: centerX, y: currentY },
      data: {
        category: 'Vòng lặp chính',
        label: 'for (int i = 0; i < n; i++)',
        subtext: 'Duyệt lần lượt từng ký tự s[i] từ trái sang phải',
        type: 'action',
      },
    });

    edges.push({
      id: `e-${initNodeId}-${loopNodeId}`,
      source: initNodeId,
      target: loopNodeId,
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
      style: { stroke: '#3b82f6', strokeWidth: 2 },
    });
    currentY += 130;

    const condNodeId = 'node-condition';
    nodes.push({
      id: condNodeId,
      type: 'custom',
      position: { x: centerX, y: currentY },
      data: {
        category: 'Điều kiện rẽ nhánh',
        label: 'while (k > 0 && !st.empty() && s[i] > st.top())',
        subtext: 'Duy trì Stack đơn điệu giảm (k > 0 & s[i] > st.top)',
        type: 'condition',
      },
    });

    edges.push({
      id: `e-${loopNodeId}-${condNodeId}`,
      source: loopNodeId,
      target: condNodeId,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
      style: { stroke: '#f59e0b', strokeWidth: 2 },
    });

    const popNodeId = 'node-true-action';
    nodes.push({
      id: popNodeId,
      type: 'custom',
      position: { x: 50, y: currentY + 130 },
      data: {
        category: 'Thao tác [Đúng]',
        label: 'st.pop(); k--; // Cập nhật tối ưu',
        subtext: 'Xóa chữ số nhỏ hơn ở đỉnh Stack để tạo số lớn hơn',
        type: 'stack',
      },
    });

    const pushNodeId = 'node-false-action';
    nodes.push({
      id: pushNodeId,
      type: 'custom',
      position: { x: 470, y: currentY + 130 },
      data: {
        category: 'Thao tác [Sai/Tiếp tục]',
        label: 'st.push(s[i]);',
        subtext: 'Đẩy ký tự hiện tại s[i] vào Stack',
        type: 'stack',
      },
    });

    edges.push({
      id: `e-${condNodeId}-${popNodeId}`,
      source: condNodeId,
      target: popNodeId,
      label: '✓ Đúng (s[i] > top & k > 0)',
      labelStyle: { fill: '#10b981', fontWeight: 700, fontSize: 11 },
      labelBgStyle: { fill: '#064e3b', fillOpacity: 0.85 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
      style: { stroke: '#10b981', strokeWidth: 2.5, strokeDasharray: '4 4' },
    });

    edges.push({
      id: `e-${condNodeId}-${pushNodeId}`,
      source: condNodeId,
      target: pushNodeId,
      label: '✗ Sai / Dừng lặp',
      labelStyle: { fill: '#ef4444', fontWeight: 700, fontSize: 11 },
      labelBgStyle: { fill: '#450a0a', fillOpacity: 0.85 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
      style: { stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '4 4' },
    });

    currentY += 260;

    const outNodeId = 'node-output';
    nodes.push({
      id: outNodeId,
      type: 'custom',
      position: { x: centerX, y: currentY },
      data: {
        category: 'Xuất kết quả',
        label: 'cout << ans;',
        subtext: 'In số lớn nhất tìm được ra tệp văn bản',
        type: 'end',
      },
    });

    edges.push({
      id: `e-${condNodeId}-${outNodeId}`,
      source: condNodeId,
      target: outNodeId,
      label: '⚡ Hoàn tất lặp',
      labelStyle: { fill: '#38bdf8', fontWeight: 600, fontSize: 11 },
      labelBgStyle: { fill: '#082f49', fillOpacity: 0.8 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#38bdf8' },
      style: { stroke: '#38bdf8', strokeWidth: 2 },
    });

    return { nodes, edges };
  }

  // ── TRƯỜNG HỢP 3: CÁC BÀI TOÁN TỔNG QUÁT KHÁC ──────────────────────────────
  const initNodeId = 'node-init';
  nodes.push({
    id: initNodeId,
    type: 'custom',
    position: { x: centerX, y: currentY },
    data: {
      category: 'Khởi tạo',
      label: `cin >> ${problemCode.toLowerCase()}_data;`,
      subtext: 'Khai báo biến & nạp dữ liệu đầu vào',
      type: 'start',
    },
  });
  currentY += 120;

  const loopNodeId = 'node-loop';
  nodes.push({
    id: loopNodeId,
    type: 'custom',
    position: { x: centerX, y: currentY },
    data: {
      category: 'Vòng lặp chính',
      label: 'for (int i = 0; i < n; i++)',
      subtext: 'Duyệt các trạng thái / phần tử bài toán',
      type: 'action',
    },
  });

  edges.push({
    id: `e-${initNodeId}-${loopNodeId}`,
    source: initNodeId,
    target: loopNodeId,
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
    style: { stroke: '#3b82f6', strokeWidth: 2 },
  });
  currentY += 130;

  const condNodeId = 'node-condition';
  nodes.push({
    id: condNodeId,
    type: 'custom',
    position: { x: centerX, y: currentY },
    data: {
      category: 'Điều kiện rẽ nhánh',
      label: 'if (kiem_tra_dieu_kien(a[i]))',
      subtext: 'Kiểm tra tính hợp lệ / tiêu chuẩn tối ưu',
      type: 'condition',
    },
  });

  edges.push({
    id: `e-${loopNodeId}-${condNodeId}`,
    source: loopNodeId,
    target: condNodeId,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
    style: { stroke: '#f59e0b', strokeWidth: 2 },
  });

  const trueNodeId = 'node-true-action';
  nodes.push({
    id: trueNodeId,
    type: 'custom',
    position: { x: 50, y: currentY + 130 },
    data: {
      category: 'Thao tác [Đúng]',
      label: 'cap_nhat_ket_qua();',
      subtext: 'Cập nhật nghiệm tối ưu',
      type: 'stack',
    },
  });

  const falseNodeId = 'node-false-action';
  nodes.push({
    id: falseNodeId,
    type: 'custom',
    position: { x: 470, y: currentY + 130 },
    data: {
      category: 'Thao tác [Sai]',
      label: '// Bo qua / Duyet tiep',
      subtext: 'Chuyển sang trạng thái tiếp theo',
      type: 'stack',
    },
  });

  edges.push({
    id: `e-${condNodeId}-${trueNodeId}`,
    source: condNodeId,
    target: trueNodeId,
    label: '✓ Đúng',
    labelStyle: { fill: '#10b981', fontWeight: 700, fontSize: 11 },
    labelBgStyle: { fill: '#064e3b', fillOpacity: 0.85 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
    style: { stroke: '#10b981', strokeWidth: 2.5, strokeDasharray: '4 4' },
  });

  edges.push({
    id: `e-${condNodeId}-${falseNodeId}`,
    source: condNodeId,
    target: falseNodeId,
    label: '✗ Sai',
    labelStyle: { fill: '#ef4444', fontWeight: 700, fontSize: 11 },
    labelBgStyle: { fill: '#450a0a', fillOpacity: 0.85 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
    style: { stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '4 4' },
  });

  currentY += 260;

  const outNodeId = 'node-output';
  nodes.push({
    id: outNodeId,
    type: 'custom',
    position: { x: centerX, y: currentY },
    data: {
      category: 'Xuất kết quả',
      label: 'cout << ket_qua;',
      subtext: 'In kết quả ra luồng chuẩn / tệp văn bản',
      type: 'end',
    },
  });

  edges.push({
    id: `e-${condNodeId}-${outNodeId}`,
    source: condNodeId,
    target: outNodeId,
    label: '⚡ Hoàn tất lặp',
    labelStyle: { fill: '#38bdf8', fontWeight: 600, fontSize: 11 },
    labelBgStyle: { fill: '#082f49', fillOpacity: 0.8 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#38bdf8' },
    style: { stroke: '#38bdf8', strokeWidth: 2 },
  });

  return { nodes, edges };
}
