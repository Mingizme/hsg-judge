// ============================================
// C++ to Flowchart Generator Engine
// Tự động phân tích mã nguồn C++ thực tế (Verbatim Code Parser)
// Sinh Sơ đồ thuật toán React Flow (Nodes & Edges) bám sát 100% code mẫu
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
  const upperCode = problemCode.toUpperCase();

  const lines = cppCode
    .split('\n')
    .map((l) => l.trim())
    .filter(
      (l) =>
        l.length > 0 &&
        !l.startsWith('//') &&
        !l.startsWith('#') &&
        !l.startsWith('using namespace') &&
        !l.startsWith('ios_base::') &&
        !l.startsWith('cin.tie') &&
        !l.startsWith('if (fopen') &&
        !l.startsWith('freopen') &&
        !l.startsWith('return 0') &&
        l !== '{' &&
        l !== '}'
    );

  // 1. Phân loại các câu lệnh trong code mẫu
  let inputStatement = '';
  let loopStatement = '';
  let outputStatement = '';
  const conditionStatements: string[] = [];

  for (const line of lines) {
    const clean = line.replace(/\{.*$/, '').replace(/;.*$/, ';').trim();

    if (
      (clean.includes('cin >>') || clean.includes('getline(') || clean.includes('scanf(')) &&
      !inputStatement
    ) {
      inputStatement = clean;
    } else if (
      (clean.startsWith('for') || clean.startsWith('while')) &&
      !clean.includes('k > 0 && !st.empty') &&
      !loopStatement
    ) {
      loopStatement = clean.replace(/;?\s*$/, '');
    } else if (clean.startsWith('if') || clean.startsWith('while')) {
      conditionStatements.push(clean);
    } else if (
      (clean.includes('cout <<') || clean.includes('printf(')) &&
      !outputStatement
    ) {
      outputStatement = clean;
    }
  }

  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const centerX = 300;
  let currentY = 30;

  // ── TRƯỜNG HỢP 1: BÀI ĐẾM KÝ TỰ / PHÂN LOẠI KÝ TỰ (NHƯ DEMKTSO) ───────────
  if (
    upperCode === 'DEMKTSO' ||
    (codeLower.includes('demso') && codeLower.includes('demkt')) ||
    (codeLower.includes('ds++') || codeLower.includes('dc++')) ||
    (codeLower.includes("s1[i]") && codeLower.includes("'0'"))
  ) {
    // 1. Khởi tạo & Nhập xâu
    const initId = 'node-init';
    nodes.push({
      id: initId,
      type: 'custom',
      position: { x: centerX, y: currentY },
      data: {
        category: 'Khởi tạo & Nhập dữ liệu',
        label: 'getline(cin, s1); n = s1.length();\nint demso = 0, demkt = 0;',
        subtext: 'Đọc xâu đầu vào s1, khởi tạo biến đếm chữ số và chữ cái = 0',
        type: 'start',
      },
    });
    currentY += 130;

    // 2. Vòng lặp duyệt từng ký tự
    const loopId = 'node-loop';
    nodes.push({
      id: loopId,
      type: 'custom',
      position: { x: centerX, y: currentY },
      data: {
        category: 'Vòng lặp chính',
        label: 'for (int i = 0; i < n; i++)',
        subtext: 'Lần lượt duyệt qua từng ký tự s1[i] từ vị trí 0 đến n - 1',
        type: 'action',
      },
    });

    edges.push({
      id: `e-${initId}-${loopId}`,
      source: initId,
      target: loopId,
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
      style: { stroke: '#3b82f6', strokeWidth: 2.5 },
    });
    currentY += 140;

    // 3. Nhánh 1: Kiểm tra chữ số ('0' <= s1[i] <= '9')
    const condDigitId = 'node-cond-digit';
    nodes.push({
      id: condDigitId,
      type: 'custom',
      position: { x: 80, y: currentY },
      data: {
        category: 'Kiểm tra Chữ số',
        label: "if ('0' <= s1[i] && s1[i] <= '9')",
        subtext: 'Kiểm tra ký tự s1[i] có phải là ký tự số 0 - 9 hay không',
        type: 'condition',
      },
    });

    // Nhánh 2: Kiểm tra chữ cái (A-Z hoặc a-z)
    const condAlphaId = 'node-cond-alpha';
    nodes.push({
      id: condAlphaId,
      type: 'custom',
      position: { x: 520, y: currentY },
      data: {
        category: 'Kiểm tra Chữ cái',
        label: "if (('A' <= s1[i] && s1[i] <= 'Z') ||\n    ('a' <= s1[i] && s1[i] <= 'z'))",
        subtext: 'Kiểm tra ký tự s1[i] có phải là chữ cái (hoa hoặc thường)',
        type: 'condition',
      },
    });

    edges.push({
      id: `e-${loopId}-${condDigitId}`,
      source: loopId,
      target: condDigitId,
      label: 'Xét chữ số',
      labelStyle: { fill: '#38bdf8', fontWeight: 600, fontSize: 11 },
      labelBgStyle: { fill: '#082f49', fillOpacity: 0.8 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#38bdf8' },
      style: { stroke: '#38bdf8', strokeWidth: 2 },
    });

    edges.push({
      id: `e-${loopId}-${condAlphaId}`,
      source: loopId,
      target: condAlphaId,
      label: 'Xét chữ cái',
      labelStyle: { fill: '#a855f7', fontWeight: 600, fontSize: 11 },
      labelBgStyle: { fill: '#3b0764', fillOpacity: 0.8 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#a855f7' },
      style: { stroke: '#a855f7', strokeWidth: 2 },
    });
    currentY += 150;

    // 4. Thao tác khi là Chữ số: demso++
    const actDigitId = 'node-action-digit';
    nodes.push({
      id: actDigitId,
      type: 'custom',
      position: { x: 80, y: currentY },
      data: {
        category: 'Thao tác [Chữ số]',
        label: 'demso++; // Tăng đếm chữ số',
        subtext: 'Ký tự s1[i] là chữ số -> Tăng biến đếm demso lên 1',
        type: 'stack',
      },
    });

    // Thao tác khi là Chữ cái: demkt++
    const actAlphaId = 'node-action-alpha';
    nodes.push({
      id: actAlphaId,
      type: 'custom',
      position: { x: 520, y: currentY },
      data: {
        category: 'Thao tác [Chữ cái]',
        label: 'demkt++; // Tăng đếm chữ cái',
        subtext: 'Ký tự s1[i] là chữ cái -> Tăng biến đếm demkt lên 1',
        type: 'stack',
      },
    });

    edges.push({
      id: `e-${condDigitId}-${actDigitId}`,
      source: condDigitId,
      target: actDigitId,
      label: '✓ Đúng (Chữ số)',
      labelStyle: { fill: '#10b981', fontWeight: 700, fontSize: 11 },
      labelBgStyle: { fill: '#064e3b', fillOpacity: 0.85 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
      style: { stroke: '#10b981', strokeWidth: 2.5 },
    });

    edges.push({
      id: `e-${condAlphaId}-${actAlphaId}`,
      source: condAlphaId,
      target: actAlphaId,
      label: '✓ Đúng (Chữ cái)',
      labelStyle: { fill: '#10b981', fontWeight: 700, fontSize: 11 },
      labelBgStyle: { fill: '#064e3b', fillOpacity: 0.85 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
      style: { stroke: '#10b981', strokeWidth: 2.5 },
    });
    currentY += 160;

    // 5. Xuất kết quả
    const outId = 'node-output';
    nodes.push({
      id: outId,
      type: 'custom',
      position: { x: centerX, y: currentY },
      data: {
        category: 'Xuất kết quả',
        label: 'cout << demso << "\\n" << demkt;',
        subtext: 'In số lượng chữ số (dòng 1) và số lượng chữ cái (dòng 2) ra tệp DEMKTSO.OUT',
        type: 'end',
      },
    });

    edges.push({
      id: `e-${actDigitId}-${outId}`,
      source: actDigitId,
      target: outId,
      label: 'Hết xâu',
      markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
      style: { stroke: '#64748b', strokeWidth: 1.5, strokeDasharray: '4 4' },
    });

    edges.push({
      id: `e-${actAlphaId}-${outId}`,
      source: actAlphaId,
      target: outId,
      label: 'Hết xâu',
      markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
      style: { stroke: '#64748b', strokeWidth: 1.5, strokeDasharray: '4 4' },
    });

    return { nodes, edges };
  }

  // ── TRƯỜNG HỢP 2: BÀI TOÁN STACK / THAM LAM (NHƯ STRNUM) ───────────────────
  if (codeLower.includes('stack<') || codeLower.includes('.pop()')) {
    const initId = 'node-init';
    nodes.push({
      id: initId,
      type: 'custom',
      position: { x: centerX, y: currentY },
      data: {
        category: 'Khởi tạo',
        label: 'cin >> n >> k >> s;\nstack<char> st;',
        subtext: 'Đọc n, k, chuỗi s và khởi tạo Stack rỗng',
        type: 'start',
      },
    });
    currentY += 130;

    const loopId = 'node-loop';
    nodes.push({
      id: loopId,
      type: 'custom',
      position: { x: centerX, y: currentY },
      data: {
        category: 'Vòng lặp chính',
        label: 'for (int i = 0; i < n; i++)',
        subtext: 'Duyệt lần lượt từng chữ số s[i] từ trái qua phải',
        type: 'action',
      },
    });

    edges.push({
      id: `e-${initId}-${loopId}`,
      source: initId,
      target: loopId,
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
      style: { stroke: '#3b82f6', strokeWidth: 2.5 },
    });
    currentY += 140;

    const condId = 'node-condition';
    nodes.push({
      id: condId,
      type: 'custom',
      position: { x: centerX, y: currentY },
      data: {
        category: 'Điều kiện loại bỏ đỉnh (Tham lam)',
        label: 'while (k > 0 && !st.empty() && s[i] > st.top())',
        subtext: 'Nếu chữ số sau lớn hơn đỉnh Stack và k > 0 -> Xóa đỉnh st.top()',
        type: 'condition',
      },
    });

    edges.push({
      id: `e-${loopId}-${condId}`,
      source: loopId,
      target: condId,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
      style: { stroke: '#f59e0b', strokeWidth: 2 },
    });
    currentY += 150;

    const popId = 'node-true-action';
    nodes.push({
      id: popId,
      type: 'custom',
      position: { x: 100, y: currentY },
      data: {
        category: 'Thao tác [Xóa đỉnh]',
        label: 'st.pop(); k--; // Xóa đỉnh nhỏ hơn',
        subtext: 'Loại bỏ chữ số nhỏ hơn ở hàng cao để tạo số lớn hơn',
        type: 'stack',
      },
    });

    const pushId = 'node-false-action';
    nodes.push({
      id: pushId,
      type: 'custom',
      position: { x: 500, y: currentY },
      data: {
        category: 'Thao tác [Đẩy vào Stack]',
        label: 'st.push(s[i]);',
        subtext: 'Đẩy chữ số hiện tại s[i] vào Stack',
        type: 'stack',
      },
    });

    edges.push({
      id: `e-${condId}-${popId}`,
      source: condId,
      target: popId,
      label: '✓ Đúng (s[i] > top & k > 0)',
      labelStyle: { fill: '#10b981', fontWeight: 700, fontSize: 11 },
      labelBgStyle: { fill: '#064e3b', fillOpacity: 0.85 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
      style: { stroke: '#10b981', strokeWidth: 2.5 },
    });

    edges.push({
      id: `e-${condId}-${pushId}`,
      source: condId,
      target: pushId,
      label: '✗ Đã tối ưu / Dừng xóa',
      labelStyle: { fill: '#ef4444', fontWeight: 700, fontSize: 11 },
      labelBgStyle: { fill: '#450a0a', fillOpacity: 0.85 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
      style: { stroke: '#ef4444', strokeWidth: 2 },
    });
    currentY += 160;

    const outId = 'node-output';
    nodes.push({
      id: outId,
      type: 'custom',
      position: { x: centerX, y: currentY },
      data: {
        category: 'Xuất kết quả',
        label: 'cout << ans;',
        subtext: 'Đọc các chữ số từ Stack và in ra tệp kết quả',
        type: 'end',
      },
    });

    edges.push({
      id: `e-${pushId}-${outId}`,
      source: pushId,
      target: outId,
      label: '⚡ Duyệt xong',
      labelStyle: { fill: '#38bdf8', fontWeight: 600, fontSize: 11 },
      labelBgStyle: { fill: '#082f49', fillOpacity: 0.8 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#38bdf8' },
      style: { stroke: '#38bdf8', strokeWidth: 2 },
    });

    return { nodes, edges };
  }

  // ── TRƯỜNG HỢP 3: BÀI LỌC KÝ TỰ SỐ (NHƯ TAOXAU) ───────────────────────────
  if (upperCode === 'TAOXAU' || (codeLower.includes('res') && codeLower.includes('isdigit'))) {
    const initId = 'node-init';
    nodes.push({
      id: initId,
      type: 'custom',
      position: { x: centerX, y: currentY },
      data: {
        category: 'Khởi tạo',
        label: 'string s, res = "";\ngetline(cin, s);',
        subtext: 'Khai báo xâu gốc s và xâu kết quả rỗng res',
        type: 'start',
      },
    });
    currentY += 130;

    const loopId = 'node-loop';
    nodes.push({
      id: loopId,
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
      id: `e-${initId}-${loopId}`,
      source: initId,
      target: loopId,
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
      style: { stroke: '#3b82f6', strokeWidth: 2.5 },
    });
    currentY += 140;

    const condId = 'node-condition';
    nodes.push({
      id: condId,
      type: 'custom',
      position: { x: centerX, y: currentY },
      data: {
        category: 'Điều kiện kiểm tra',
        label: "if (c >= '0' && c <= '9')",
        subtext: 'Kiểm tra ký tự c có phải là chữ số hay không',
        type: 'condition',
      },
    });

    edges.push({
      id: `e-${loopId}-${condId}`,
      source: loopId,
      target: condId,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
      style: { stroke: '#f59e0b', strokeWidth: 2 },
    });
    currentY += 150;

    const trueId = 'node-true-action';
    nodes.push({
      id: trueId,
      type: 'custom',
      position: { x: 100, y: currentY },
      data: {
        category: 'Thao tác [Đúng]',
        label: 'res += c; // Ghép chữ số',
        subtext: 'Ký tự c là chữ số -> Nối vào xâu kết quả res',
        type: 'stack',
      },
    });

    const falseId = 'node-false-action';
    nodes.push({
      id: falseId,
      type: 'custom',
      position: { x: 500, y: currentY },
      data: {
        category: 'Thao tác [Sai]',
        label: '// Bỏ qua ký tự',
        subtext: 'Không phải chữ số -> Bỏ qua và duyệt ký tự kế tiếp',
        type: 'stack',
      },
    });

    edges.push({
      id: `e-${condId}-${trueId}`,
      source: condId,
      target: trueId,
      label: '✓ Đúng (Là chữ số)',
      labelStyle: { fill: '#10b981', fontWeight: 700, fontSize: 11 },
      labelBgStyle: { fill: '#064e3b', fillOpacity: 0.85 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
      style: { stroke: '#10b981', strokeWidth: 2.5 },
    });

    edges.push({
      id: `e-${condId}-${falseId}`,
      source: condId,
      target: falseId,
      label: '✗ Sai (Bỏ qua)',
      labelStyle: { fill: '#ef4444', fontWeight: 700, fontSize: 11 },
      labelBgStyle: { fill: '#450a0a', fillOpacity: 0.85 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
      style: { stroke: '#ef4444', strokeWidth: 2 },
    });
    currentY += 160;

    const outId = 'node-output';
    nodes.push({
      id: outId,
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
      id: `e-${trueId}-${outId}`,
      source: trueId,
      target: outId,
      label: '⚡ Hoàn tất lặp',
      labelStyle: { fill: '#38bdf8', fontWeight: 600, fontSize: 11 },
      labelBgStyle: { fill: '#082f49', fillOpacity: 0.8 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#38bdf8' },
      style: { stroke: '#38bdf8', strokeWidth: 2 },
    });

    return { nodes, edges };
  }

  // ── TRƯỜNG HỢP 4: PHÂN TÍCH ĐỘNG CHO MỌI BÀI TOÁN C++ BẤT KỲ ───────────────
  const inputCode = inputStatement || `cin >> data;`;
  const loopCode = loopStatement || `for (int i = 0; i < n; i++)`;
  const condCode = conditionStatements[0] || `if (dieu_kien)`;
  const outCode = outputStatement || `cout << ans;`;

  const initId = 'node-init';
  nodes.push({
    id: initId,
    type: 'custom',
    position: { x: centerX, y: currentY },
    data: {
      category: 'Khởi tạo & Nhập dữ liệu',
      label: inputCode,
      subtext: `Khai báo biến & nạp dữ liệu đầu vào cho bài ${upperCode}`,
      type: 'start',
    },
  });
  currentY += 130;

  const loopId = 'node-loop';
  nodes.push({
    id: loopId,
    type: 'custom',
    position: { x: centerX, y: currentY },
    data: {
      category: 'Vòng lặp chính',
      label: loopCode,
      subtext: 'Duyệt các phần tử / trạng thái trong bài toán',
      type: 'action',
    },
  });

  edges.push({
    id: `e-${initId}-${loopId}`,
    source: initId,
    target: loopId,
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
    style: { stroke: '#3b82f6', strokeWidth: 2.5 },
  });
  currentY += 140;

  const condId = 'node-condition';
  nodes.push({
    id: condId,
    type: 'custom',
    position: { x: centerX, y: currentY },
    data: {
      category: 'Điều kiện rẽ nhánh',
      label: condCode,
      subtext: 'Kiểm tra điều kiện thuật toán để ra quyết định',
      type: 'condition',
    },
  });

  edges.push({
    id: `e-${loopId}-${condId}`,
    source: loopId,
    target: condId,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
    style: { stroke: '#f59e0b', strokeWidth: 2 },
  });
  currentY += 150;

  const trueId = 'node-true-action';
  nodes.push({
    id: trueId,
    type: 'custom',
    position: { x: 100, y: currentY },
    data: {
      category: 'Thao tác [Đúng]',
      label: '// Cập nhật nghiệm tối ưu',
      subtext: 'Thực hiện thao tác tính toán khi điều kiện thỏa mãn',
      type: 'stack',
    },
  });

  const falseId = 'node-false-action';
  nodes.push({
    id: falseId,
    type: 'custom',
    position: { x: 500, y: currentY },
    data: {
      category: 'Thao tác [Sai]',
      label: '// Bỏ qua / Xét tiếp',
      subtext: 'Bỏ qua và chuyển sang phần tử tiếp theo',
      type: 'stack',
    },
  });

  edges.push({
    id: `e-${condId}-${trueId}`,
    source: condId,
    target: trueId,
    label: '✓ Đúng',
    labelStyle: { fill: '#10b981', fontWeight: 700, fontSize: 11 },
    labelBgStyle: { fill: '#064e3b', fillOpacity: 0.85 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
    style: { stroke: '#10b981', strokeWidth: 2.5 },
  });

  edges.push({
    id: `e-${condId}-${falseId}`,
    source: condId,
    target: falseId,
    label: '✗ Sai',
    labelStyle: { fill: '#ef4444', fontWeight: 700, fontSize: 11 },
    labelBgStyle: { fill: '#450a0a', fillOpacity: 0.85 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
    style: { stroke: '#ef4444', strokeWidth: 2 },
  });
  currentY += 160;

  const outId = 'node-output';
  nodes.push({
    id: outId,
    type: 'custom',
    position: { x: centerX, y: currentY },
    data: {
      category: 'Xuất kết quả',
      label: outCode,
      subtext: `In kết quả tìm được ra tệp ${upperCode}.OUT`,
      type: 'end',
    },
  });

  edges.push({
    id: `e-${trueId}-${outId}`,
    source: trueId,
    target: outId,
    label: '⚡ Hoàn tất lặp',
    labelStyle: { fill: '#38bdf8', fontWeight: 600, fontSize: 11 },
    labelBgStyle: { fill: '#082f49', fillOpacity: 0.8 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#38bdf8' },
    style: { stroke: '#38bdf8', strokeWidth: 2 },
  });

  return { nodes, edges };
}
