// ============================================
// Simulation Step Generator Engine
// Tự động phân tích code C++ & dữ liệu mẫu để sinh
// toàn bộ các bước chạy mô phỏng Dry-Run thời gian thực
// ============================================

export interface SimulationStep {
  step: number;
  nodeId: string;
  i: number;
  currentChar: string;
  primaryVarName: string;
  primaryVarValue: string | number;
  memoryItems: string[];
  memoryLabel: string;
  action: string;
  explanation: string;
}

/**
 * Tự động tạo mảng SimulationStep cho bất kỳ bài toán nào
 */
export function generateSimulationTrace(
  cppCode: string,
  problemCode: string = 'PROBLEM',
  sampleInput?: string
): SimulationStep[] {
  const codeLower = cppCode.toLowerCase();
  const upperProblemCode = problemCode.toUpperCase();

  const hasStack = codeLower.includes('stack<') || codeLower.includes('.pop()');
  const isStringFiltering =
    upperProblemCode === 'TAOXAU' ||
    ((codeLower.includes('string ') || codeLower.includes('char ')) &&
      (codeLower.includes('isdigit') || codeLower.includes("c >= '0'") || codeLower.includes("res +=") || codeLower.includes("h +=")));

  // Parse input data if available
  const inputLines = (sampleInput || '')
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  // ── TRƯỜNG HỢP 1: BÀI TOÁN XÂU KÝ TỰ / LỌC CHỮ SỐ (NHƯ TAOXAU) ─────────────
  if (isStringFiltering && !hasStack) {
    const rawStr = inputLines[0] || 'Abc 12a b3';
    const chars = rawStr.split('');
    let currentRes = '';
    const steps: SimulationStep[] = [];
    let stepNum = 1;

    // Bước 1: Khởi tạo
    steps.push({
      step: stepNum++,
      nodeId: 'node-init',
      i: -1,
      currentChar: '-',
      primaryVarName: 'res',
      primaryVarValue: '""',
      memoryItems: [],
      memoryLabel: 'Xâu kết quả (res)',
      action: 'Khởi tạo xâu',
      explanation: `Đọc dữ liệu xâu đầu vào: s = "${rawStr}". Khởi tạo xâu kết quả rỗng res = "".`,
    });

    // Duyệt qua từng ký tự
    for (let idx = 0; idx < chars.length; idx++) {
      const c = chars[idx];
      const isDigit = c >= '0' && c <= '9';

      // 1. Duyệt vòng lặp
      steps.push({
        step: stepNum++,
        nodeId: 'node-loop',
        i: idx,
        currentChar: c === ' ' ? '␣ (khoảng trắng)' : c,
        primaryVarName: 'res',
        primaryVarValue: currentRes ? `"${currentRes}"` : '""',
        memoryItems: currentRes ? currentRes.split('') : [],
        memoryLabel: 'Xâu kết quả (res)',
        action: `Duyệt ký tự c = '${c}'`,
        explanation: `Đang xét ký tự tại vị trí ${idx}: '${c}'. Tiến hành kiểm tra xem '${c}' có phải là chữ số không.`,
      });

      // 2. Rẽ nhánh kiểm tra
      if (isDigit) {
        currentRes += c;
        steps.push({
          step: stepNum++,
          nodeId: 'node-true-action',
          i: idx,
          currentChar: c,
          primaryVarName: 'res',
          primaryVarValue: `"${currentRes}"`,
          memoryItems: currentRes.split(''),
          memoryLabel: 'Xâu kết quả (res)',
          action: `ĐÚNG: Ghép '${c}' vào res`,
          explanation: `Ký tự '${c}' là chữ số hợp lệ -> Thêm vào kết quả: res += '${c}' => res = "${currentRes}".`,
        });
      } else {
        steps.push({
          step: stepNum++,
          nodeId: 'node-false-action',
          i: idx,
          currentChar: c === ' ' ? '␣' : c,
          primaryVarName: 'res',
          primaryVarValue: currentRes ? `"${currentRes}"` : '""',
          memoryItems: currentRes ? currentRes.split('') : [],
          memoryLabel: 'Xâu kết quả (res)',
          action: `SAI: Bỏ qua '${c}'`,
          explanation: `Ký tự '${c}' không phải là chữ số -> Bỏ qua và tiếp tục duyệt ký tự kế tiếp.`,
        });
      }
    }

    // Bước cuối: Xuất kết quả
    steps.push({
      step: stepNum++,
      nodeId: 'node-output',
      i: chars.length,
      currentChar: 'EOF',
      primaryVarName: 'res',
      primaryVarValue: `"${currentRes}"`,
      memoryItems: currentRes.split(''),
      memoryLabel: 'Xâu kết quả (res)',
      action: `Xuất kết quả: cout << "${currentRes}"`,
      explanation: `Đã duyệt xong toàn bộ xâu s. In xâu kết quả trích xuất được: "${currentRes}".`,
    });

    return steps;
  }

  // ── TRƯỜNG HỢP 2: BÀI TOÁN STACK / MONOTONIC (NHƯ STRNUM) ───────────────────
  if (hasStack) {
    const rawStr = inputLines[1] || (inputLines[0]?.length > 4 ? inputLines[0] : '88432334');
    const elements = rawStr.split('').slice(0, 8);
    const initialK = 4;
    let currentK = initialK;
    const stack: string[] = [];
    const steps: SimulationStep[] = [];
    let stepNum = 1;

    // Bước 1: Khởi tạo
    steps.push({
      step: stepNum++,
      nodeId: 'node-init',
      i: -1,
      currentChar: '-',
      primaryVarName: 'k',
      primaryVarValue: currentK,
      memoryItems: [],
      memoryLabel: 'Stack',
      action: 'Khởi tạo nạp dữ liệu',
      explanation: `Đọc dữ liệu đầu vào n=${elements.length}, k=${currentK}, chuỗi="${elements.join('')}". Chuẩn bị Stack rỗng.`,
    });

    // Các bước lặp
    for (let idx = 0; idx < elements.length; idx++) {
      const char = elements[idx];
      const top = stack[stack.length - 1];

      // Bước duyệt vòng lặp
      steps.push({
        step: stepNum++,
        nodeId: 'node-loop',
        i: idx,
        currentChar: char,
        primaryVarName: 'k',
        primaryVarValue: currentK,
        memoryItems: [...stack],
        memoryLabel: 'Stack',
        action: `Duyệt i=${idx}: s[${idx}]='${char}'`,
        explanation: `Đang xét phần tử s[${idx}]='${char}'. Tiến hành so sánh với đỉnh Stack hiện tại (${top ? `'${top}'` : 'rỗng'}).`,
      });

      // So sánh điều kiện pop
      if (top && char > top && currentK > 0) {
        steps.push({
          step: stepNum++,
          nodeId: 'node-true-action',
          i: idx,
          currentChar: char,
          primaryVarName: 'k',
          primaryVarValue: currentK,
          memoryItems: [...stack],
          memoryLabel: 'Stack',
          action: `Điều kiện Đúng: s[${idx}] > top`,
          explanation: `Vì '${char}' > '${top}' và k=${currentK} > 0 -> Thỏa mãn điều kiện tham lam, tiến hành POP!`,
        });

        stack.pop();
        currentK--;

        steps.push({
          step: stepNum++,
          nodeId: 'node-true-action',
          i: idx,
          currentChar: char,
          primaryVarName: 'k',
          primaryVarValue: currentK,
          memoryItems: [...stack],
          memoryLabel: 'Stack',
          action: `st.pop(); k-- (k còn ${currentK})`,
          explanation: `Đã loại bỏ chữ số '${top}' khỏi đỉnh Stack. Số lượt xóa còn lại: k=${currentK}.`,
        });
      }

      // Push vào stack
      stack.push(char);
      steps.push({
        step: stepNum++,
        nodeId: 'node-false-action',
        i: idx,
        currentChar: char,
        primaryVarName: 'k',
        primaryVarValue: currentK,
        memoryItems: [...stack],
        memoryLabel: 'Stack',
        action: `st.push('${char}')`,
        explanation: `Đẩy '${char}' vào Stack. Trạng thái Stack hiện tại: [${stack.join(', ')}].`,
      });
    }

    // Hoàn tất
    steps.push({
      step: stepNum++,
      nodeId: 'node-output',
      i: elements.length,
      currentChar: 'EOF',
      primaryVarName: 'k',
      primaryVarValue: currentK,
      memoryItems: [...stack],
      memoryLabel: 'Stack',
      action: `Xuất kết quả: "${stack.join('')}"`,
      explanation: `Đã duyệt hết dãy. Đọc các phần tử trong Stack để tạo thành số lớn nhất: "${stack.join('')}".`,
    });

    return steps;
  }

  // ── TRƯỜNG HỢP 3: CÁC THUẬT TOÁN TỔNG QUÁT KHÁC ─────────────────────────────
  const sampleArr = [12, 45, 7, 89, 23];
  const steps: SimulationStep[] = [];
  let stepNum = 1;
  let currentAns = 0;

  steps.push({
    step: stepNum++,
    nodeId: 'node-init',
    i: -1,
    currentChar: '-',
    primaryVarName: 'Ans',
    primaryVarValue: currentAns,
    memoryItems: [],
    memoryLabel: 'Bộ nhớ',
    action: 'Khởi tạo',
    explanation: `Nạp dữ liệu đầu vào. Thiết lập trạng thái ban đầu.`,
  });

  for (let idx = 0; idx < sampleArr.length; idx++) {
    const val = sampleArr[idx];
    steps.push({
      step: stepNum++,
      nodeId: 'node-loop',
      i: idx,
      currentChar: String(val),
      primaryVarName: 'Ans',
      primaryVarValue: currentAns,
      memoryItems: sampleArr.slice(0, idx + 1).map(String),
      memoryLabel: 'Tập dữ liệu',
      action: `Xét phần tử a[${idx}] = ${val}`,
      explanation: `Đang xử lý phần tử thứ ${idx} với giá trị ${val}.`,
    });

    if (val > currentAns) {
      currentAns = val;
      steps.push({
        step: stepNum++,
        nodeId: 'node-true-action',
        i: idx,
        currentChar: String(val),
        primaryVarName: 'Ans',
        primaryVarValue: currentAns,
        memoryItems: sampleArr.slice(0, idx + 1).map(String),
        memoryLabel: 'Tập dữ liệu',
        action: `Cập nhật nghiệm: Ans = ${currentAns}`,
        explanation: `Giá trị ${val} thỏa mãn điều kiện tối ưu -> Cập nhật kết quả.`,
      });
    }
  }

  steps.push({
    step: stepNum++,
    nodeId: 'node-output',
    i: sampleArr.length,
    currentChar: 'EOF',
    primaryVarName: 'Ans',
    primaryVarValue: currentAns,
    memoryItems: [String(currentAns)],
    memoryLabel: 'Kết quả',
    action: `In kết quả: ${currentAns}`,
    explanation: `Hoàn tất thuật toán. In kết quả tìm được ra màn hình.`,
  });

  return steps;
}
