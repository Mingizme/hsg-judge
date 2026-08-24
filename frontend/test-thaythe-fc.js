function generateUniversalFlowchart(cppCode, problemCode = 'PROBLEM') {
  const upperCode = problemCode.toUpperCase();

  // Loại bỏ các dòng tiền xử lý, cấu hình IO
  const rawLines = cppCode.split('\n');
  const lines = [];

  for (let l of rawLines) {
    let s = l.trim();
    if (!s) continue;
    if (s.startsWith('//') || s.startsWith('#') || s.startsWith('using namespace') || s.startsWith('ios_base') || s.startsWith('cin.tie') || s.startsWith('freopen') || s.startsWith('if (fopen') || s.startsWith('return 0')) continue;
    if (s === '{' || s === '}') continue;
    lines.push(s);
  }

  // 1. Phân loại câu lệnh
  let initParts = [];
  let loopHeader = '';
  let conditions = []; // { cond: string, trueActions: string[], falseActions: string[] }
  let outputParts = [];

  let inLoop = false;
  let inIf = false;
  let currentCond = '';
  let currentActions = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('cin >>') || line.includes('getline(') || line.includes('scanf(') || /^(int|long long|string|char|float|double|bool|vector|stack|queue)\s+/.test(line)) {
      if (!line.includes('main()') && !inLoop && !inIf) {
        initParts.push(line.replace(/\{.*$/, '').replace(/;.*$/, ';').trim());
      }
    }

    if (/^(for|while)\s*\(/.test(line)) {
      const header = line.replace(/\{.*$/, '').trim();
      if (!loopHeader) {
        loopHeader = header;
        inLoop = true;
      }
    } else if (/^if\s*\(/.test(line)) {
      // Single line if: if (cond) action;
      const singleMatch = line.match(/^if\s*\((.*?)\)\s*(?:\{)?\s*([^{}]+)$/);
      if (singleMatch && !line.endsWith('{')) {
        conditions.push({
          cond: `if (${singleMatch[1]})`,
          trueActions: [singleMatch[2].replace(/;.*$/, ';').trim()],
          falseActions: ['// Bỏ qua / Duyệt tiếp'],
        });
      } else {
        const condMatch = line.match(/^if\s*\((.*?)\)/);
        if (condMatch) {
          currentCond = `if (${condMatch[1]})`;
          inIf = true;
          currentActions = [];
        }
      }
    } else if (inIf) {
      if (line.includes('}')) {
        const action = line.replace(/\}.*$/, '').trim();
        if (action) currentActions.push(action);
        conditions.push({
          cond: currentCond,
          trueActions: [...currentActions],
          falseActions: ['// Không thỏa mãn điều kiện\n// Duyệt tiếp phần tử kế'],
        });
        inIf = false;
        currentCond = '';
        currentActions = [];
      } else {
        currentActions.push(line);
      }
    } else if (line.includes('cout <<') || line.includes('printf(')) {
      outputParts.push(line.replace(/\{.*$/, '').replace(/;.*$/, ';').trim());
    }
  }

  if (inIf && currentCond) {
    conditions.push({
      cond: currentCond,
      trueActions: [...currentActions],
      falseActions: ['// Bỏ qua / Duyệt tiếp'],
    });
  }

  const nodes = [];
  const edges = [];
  const centerX = 320;
  let currentY = 30;

  // Node 1: Khởi tạo & Nhập liệu
  const initLabel = initParts.length > 0 ? initParts.join('\n') : `cin >> data;`;
  const initId = 'node-init';
  nodes.push({
    id: initId,
    type: 'custom',
    position: { x: centerX, y: currentY },
    data: {
      category: 'Khởi tạo & Nhập dữ liệu',
      label: initLabel,
      subtext: `Khai báo biến & nạp dữ liệu cho bài toán ${upperCode}`,
      type: 'start',
    },
  });
  currentY += 130;

  // Node 2: Vòng lặp
  const loopId = 'node-loop';
  const finalLoop = loopHeader || `for (int i = 0; i < n; i++)`;
  nodes.push({
    id: loopId,
    type: 'custom',
    position: { x: centerX, y: currentY },
    data: {
      category: 'Vòng lặp chính',
      label: finalLoop,
      subtext: `Lần lượt duyệt các phần tử / ký tự từ đầu đến cuối`,
      type: 'action',
    },
  });

  edges.push({
    id: `e-${initId}-${loopId}`,
    source: initId,
    target: loopId,
    animated: true,
    markerEnd: { type: 'arrowclosed', color: '#3b82f6' },
    style: { stroke: '#3b82f6', strokeWidth: 2.5 },
  });
  currentY += 140;

  // Node 3 & 4: Các điều kiện rẽ nhánh & Thao tác
  if (conditions.length === 1) {
    const c = conditions[0];
    const condId = 'node-cond-0';
    nodes.push({
      id: condId,
      type: 'custom',
      position: { x: centerX, y: currentY },
      data: {
        category: 'Kiểm tra điều kiện',
        label: c.cond,
        subtext: 'Kiểm tra điều kiện thuật toán tại vị trí hiện tại',
        type: 'condition',
      },
    });

    edges.push({
      id: `e-${loopId}-${condId}`,
      source: loopId,
      target: condId,
      markerEnd: { type: 'arrowclosed', color: '#f59e0b' },
      style: { stroke: '#f59e0b', strokeWidth: 2 },
    });
    currentY += 140;

    const trueId = 'node-true-0';
    nodes.push({
      id: trueId,
      type: 'custom',
      position: { x: 100, y: currentY },
      data: {
        category: 'Thao tác [Đúng]',
        label: c.trueActions.join('\n'),
        subtext: 'Điều kiện thỏa mãn -> Thực hiện biến đổi / cập nhật',
        type: 'stack',
      },
    });

    const falseId = 'node-false-0';
    nodes.push({
      id: falseId,
      type: 'custom',
      position: { x: 540, y: currentY },
      data: {
        category: 'Thao tác [Sai]',
        label: c.falseActions.join('\n'),
        subtext: 'Không thỏa mãn -> Giữ nguyên và duyệt tiếp',
        type: 'stack',
      },
    });

    edges.push({
      id: `e-${condId}-${trueId}`,
      source: condId,
      target: trueId,
      label: '✓ Đúng',
      labelStyle: { fill: '#10b981', fontWeight: 700, fontSize: 11 },
      labelBgStyle: { fill: '#064e3b', fillOpacity: 0.85, rx: 6, ry: 6 },
      labelBgPadding: [6, 4],
      markerEnd: { type: 'arrowclosed', color: '#10b981' },
      style: { stroke: '#10b981', strokeWidth: 2.5 },
    });

    edges.push({
      id: `e-${condId}-${falseId}`,
      source: condId,
      target: falseId,
      label: '✗ Sai',
      labelStyle: { fill: '#ef4444', fontWeight: 700, fontSize: 11 },
      labelBgStyle: { fill: '#450a0a', fillOpacity: 0.85, rx: 6, ry: 6 },
      labelBgPadding: [6, 4],
      markerEnd: { type: 'arrowclosed', color: '#ef4444' },
      style: { stroke: '#ef4444', strokeWidth: 2 },
    });
    currentY += 160;
  } else if (conditions.length > 1) {
    // Nhiều nhánh điều kiện (như DEMKTSO: if chữ số, if chữ cái)
    const colWidth = 440 / conditions.length;
    const condIds = [];
    const actIds = [];

    for (let cIdx = 0; cIdx < conditions.length; cIdx++) {
      const c = conditions[cIdx];
      const posX = 80 + cIdx * 440;
      const cId = `node-cond-${cIdx}`;
      const aId = `node-act-${cIdx}`;
      condIds.push(cId);
      actIds.push(aId);

      nodes.push({
        id: cId,
        type: 'custom',
        position: { x: posX, y: currentY },
        data: {
          category: `Điều kiện ${cIdx + 1}`,
          label: c.cond,
          subtext: `Kiểm tra điều kiện nhánh ${cIdx + 1}`,
          type: 'condition',
        },
      });

      edges.push({
        id: `e-${loopId}-${cId}`,
        source: loopId,
        target: cId,
        label: `Nhánh ${cIdx + 1}`,
        labelStyle: { fill: '#38bdf8', fontWeight: 600, fontSize: 11 },
        labelBgStyle: { fill: '#082f49', fillOpacity: 0.85, rx: 6, ry: 6 },
        labelBgPadding: [6, 4],
        markerEnd: { type: 'arrowclosed', color: '#38bdf8' },
        style: { stroke: '#38bdf8', strokeWidth: 2 },
      });
    }
    currentY += 140;

    for (let cIdx = 0; cIdx < conditions.length; cIdx++) {
      const c = conditions[cIdx];
      const posX = 80 + cIdx * 440;
      const aId = actIds[cIdx];
      const cId = condIds[cIdx];

      nodes.push({
        id: aId,
        type: 'custom',
        position: { x: posX, y: currentY },
        data: {
          category: `Thao tác [Đúng ${cIdx + 1}]`,
          label: c.trueActions.join('\n'),
          subtext: `Thực hiện khi Điều kiện ${cIdx + 1} thỏa mãn`,
          type: 'stack',
        },
      });

      edges.push({
        id: `e-${cId}-${aId}`,
        source: cId,
        target: aId,
        label: '✓ Đúng',
        labelStyle: { fill: '#10b981', fontWeight: 700, fontSize: 11 },
        labelBgStyle: { fill: '#064e3b', fillOpacity: 0.85, rx: 6, ry: 6 },
        labelBgPadding: [6, 4],
        markerEnd: { type: 'arrowclosed', color: '#10b981' },
        style: { stroke: '#10b981', strokeWidth: 2.5 },
      });
    }
    currentY += 160;
  }

  // Node Xuất kết quả
  const outId = 'node-output';
  const outLabel = outputParts.length > 0 ? outputParts.join('\n') : `cout << result;`;
  nodes.push({
    id: outId,
    type: 'custom',
    position: { x: centerX, y: currentY },
    data: {
      category: 'Xuất kết quả',
      label: outLabel,
      subtext: `In kết quả tính toán ra tệp ${upperCode}.OUT`,
      type: 'end',
    },
  });

  edges.push({
    id: `e-${loopId}-${outId}`,
    source: loopId,
    target: outId,
    label: '⚡ Khi hoàn tất duyệt',
    labelStyle: { fill: '#38bdf8', fontWeight: 600, fontSize: 11 },
    labelBgStyle: { fill: '#082f49', fillOpacity: 0.85, rx: 6, ry: 6 },
    labelBgPadding: [8, 4],
    markerEnd: { type: 'arrowclosed', color: '#38bdf8' },
    style: { stroke: '#38bdf8', strokeWidth: 2 },
  });

  return { nodes, edges };
}

const thaytheCode = `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    freopen("thaythe.inp", "r", stdin);
    freopen("thaythe.out", "w", stdout);
    string n;
    getline(cin, n);
    for (int i = 0; i < n.size() - 2; i++) {
        if (n[i] == 'a' && n[i+1] == 'n' && n[i+2] == 'h') {
            n[i] = 'e';
            n[i+1] = 'm';
            n.erase(i + 2, 1);
        }
    }
    cout << n;
    return 0;
}`;

const fc = generateUniversalFlowchart(thaytheCode, 'THAYTHE');
console.log('THAYTHE Universal Flowchart Nodes:');
console.log(JSON.stringify(fc.nodes.map(n => ({ id: n.id, cat: n.data.category, label: n.data.label })), null, 2));
