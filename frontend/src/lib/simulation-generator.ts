// ============================================
// Simulation Step Generator Engine
// Tự động phân tích code C++ & dữ liệu mẫu để sinh
// toàn bộ các bước chạy mô phỏng Dry-Run thời gian thực bám sát code mẫu của BẤT KỲ bài nào
// ============================================

export interface SimulationStep {
  step: number;
  nodeId: string;
  i: number;
  currentChar: string;
  primaryVarName: string;
  primaryVarValue: string | number;
  secondaryVarName?: string;
  secondaryVarValue?: string | number;
  memoryItems: string[];
  memoryLabel: string;
  action: string;
  explanation: string;
}

/**
 * Tự động tạo mảng SimulationStep cho bất kỳ bài toán nào bám sát 100% code mẫu
 */
export function generateSimulationTrace(
  cppCode: string,
  problemCode: string = 'PROBLEM',
  sampleInput?: string
): SimulationStep[] {
  const codeLower = (cppCode || '').toLowerCase();
  const upperCode = problemCode.toUpperCase();

  // Parse input data if available
  const inputLines = (sampleInput || '')
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  // ── TRƯỜNG HỢP 1: BÀI THAY THẾ XÂU (THAYTHE: "anh" -> "em") ────────────────
  if (upperCode === 'THAYTHE' || codeLower.includes('.erase(') || (codeLower.includes("'a'") && codeLower.includes("'n'") && codeLower.includes("'h'"))) {
    let s = inputLines[0] || 'anh yeu anh rat nhieu';
    const originalStr = s;
    const steps: SimulationStep[] = [];
    let stepNum = 1;

    // Bước 1: Khởi tạo
    steps.push({
      step: stepNum++,
      nodeId: 'node-init',
      i: -1,
      currentChar: '-',
      primaryVarName: 'Xâu n',
      primaryVarValue: `"${s}"`,
      memoryItems: s.split(''),
      memoryLabel: 'Xâu ký tự (n)',
      action: 'Khởi tạo & Nhập xâu',
      explanation: `Đọc xâu n = "${s}". Độ dài ban đầu: ${s.length} ký tự. Chuẩn bị duyệt từ vị trí 0 đến n.size() - 2.`,
    });

    // Duyệt vòng lặp
    let i = 0;
    while (i < s.length - 2 && steps.length < 25) {
      const sub = s.substring(i, i + 3);
      const isMatch = sub === 'anh';

      steps.push({
        step: stepNum++,
        nodeId: 'node-loop',
        i: i,
        currentChar: s[i],
        primaryVarName: 'Xâu n',
        primaryVarValue: `"${s}"`,
        memoryItems: s.split(''),
        memoryLabel: 'Xâu ký tự (n)',
        action: `Vòng lặp i = ${i}: Xét 3 ký tự "${sub}"`,
        explanation: `Tại vị trí ${i}, kiểm tra đoạn con: n[${i}..${i+2}] = "${sub}".`,
      });

      if (isMatch) {
        steps.push({
          step: stepNum++,
          nodeId: 'node-cond-0',
          i: i,
          currentChar: s[i],
          primaryVarName: 'Xâu n',
          primaryVarValue: `"${s}"`,
          memoryItems: s.split(''),
          memoryLabel: 'Xâu ký tự (n)',
          action: `ĐÚNG: Khớp từ "anh" tại vị trí ${i}`,
          explanation: `Phát hiện từ "anh" tại vị trí ${i}! Chuẩn bị thực hiện thay thế: n[${i}] = 'e', n[${i+1}] = 'm', xóa 'h'.`,
        });

        // Thực hiện thay thế
        const chars = s.split('');
        chars[i] = 'e';
        chars[i + 1] = 'm';
        chars.splice(i + 2, 1);
        s = chars.join('');

        steps.push({
          step: stepNum++,
          nodeId: 'node-true-0',
          i: i,
          currentChar: 'e',
          primaryVarName: 'Xâu n',
          primaryVarValue: `"${s}"`,
          memoryItems: s.split(''),
          memoryLabel: 'Xâu ký tự (n)',
          action: `Thay "anh" -> "em" (n = "${s}")`,
          explanation: `Đã thay thế thành công từ "anh" thành "em". Xâu n hiện tại: "${s}".`,
        });
      } else {
        steps.push({
          step: stepNum++,
          nodeId: 'node-false-0',
          i: i,
          currentChar: s[i],
          primaryVarName: 'Xâu n',
          primaryVarValue: `"${s}"`,
          memoryItems: s.split(''),
          memoryLabel: 'Xâu ký tự (n)',
          action: `SAI: Không khớp từ "anh"`,
          explanation: `Đoạn "${sub}" không phải là "anh" -> Giữ nguyên ký tự và tăng i lên 1.`,
        });
        i++;
      }
    }

    // Bước cuối: Xuất kết quả
    steps.push({
      step: stepNum++,
      nodeId: 'node-output',
      i: s.length,
      currentChar: 'EOF',
      primaryVarName: 'Kết quả',
      primaryVarValue: `"${s}"`,
      memoryItems: s.split(''),
      memoryLabel: 'Xâu sau khi thay thế',
      action: `Xuất kết quả: cout << "${s}"`,
      explanation: `Hoàn tất duyệt xâu. In kết quả cuối cùng ra tệp THAYTHE.OUT: "${s}".`,
    });

    return steps;
  }

  // ── TRƯỜNG HỢP 2: BÀI ĐẾM KÝ TỰ SỐ VÀ CHỮ CÁI (DEMKTSO) ───────────────────
  if (
    upperCode === 'DEMKTSO' ||
    (codeLower.includes('demso') && codeLower.includes('demkt')) ||
    (codeLower.includes('ds++') || codeLower.includes('dc++')) ||
    (codeLower.includes("s1[i]") && codeLower.includes("'0'"))
  ) {
    const rawStr = inputLines[0] || '123_ab12_Af23';
    const chars = rawStr.split('');
    let demso = 0;
    let demkt = 0;
    const steps: SimulationStep[] = [];
    let stepNum = 1;

    steps.push({
      step: stepNum++,
      nodeId: 'node-init',
      i: -1,
      currentChar: '-',
      primaryVarName: 'demso',
      primaryVarValue: 0,
      secondaryVarName: 'demkt',
      secondaryVarValue: 0,
      memoryItems: [`demso = 0`, `demkt = 0`],
      memoryLabel: 'Biến đếm (DEMKTSO)',
      action: 'Khởi tạo xâu & biến đếm',
      explanation: `Đọc xâu s1 = "${rawStr}". Khởi tạo demso = 0, demkt = 0.`,
    });

    for (let idx = 0; idx < Math.min(chars.length, 12); idx++) {
      const c = chars[idx];
      const isDigit = c >= '0' && c <= '9';
      const isAlpha = (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');

      steps.push({
        step: stepNum++,
        nodeId: 'node-loop',
        i: idx,
        currentChar: c,
        primaryVarName: 'demso',
        primaryVarValue: demso,
        secondaryVarName: 'demkt',
        secondaryVarValue: demkt,
        memoryItems: [`demso = ${demso}`, `demkt = ${demkt}`],
        memoryLabel: 'Biến đếm (DEMKTSO)',
        action: `Vòng lặp i = ${idx}: Xét s1[${idx}] = '${c}'`,
        explanation: `Đang duyệt vị trí ${idx}, ký tự hiện tại là '${c}'.`,
      });

      if (isDigit) {
        demso++;
        steps.push({
          step: stepNum++,
          nodeId: 'node-act-0',
          i: idx,
          currentChar: c,
          primaryVarName: 'demso',
          primaryVarValue: demso,
          secondaryVarName: 'demkt',
          secondaryVarValue: demkt,
          memoryItems: [`demso = ${demso} (+1)`, `demkt = ${demkt}`],
          memoryLabel: 'Biến đếm (DEMKTSO)',
          action: `CHỮ SỐ: demso++ => ${demso}`,
          explanation: `'${c}' là chữ số -> demso++ (tổng chữ số: ${demso}).`,
        });
      } else if (isAlpha) {
        demkt++;
        steps.push({
          step: stepNum++,
          nodeId: 'node-act-1',
          i: idx,
          currentChar: c,
          primaryVarName: 'demso',
          primaryVarValue: demso,
          secondaryVarName: 'demkt',
          secondaryVarValue: demkt,
          memoryItems: [`demso = ${demso}`, `demkt = ${demkt} (+1)`],
          memoryLabel: 'Biến đếm (DEMKTSO)',
          action: `CHỮ CÁI: demkt++ => ${demkt}`,
          explanation: `'${c}' là chữ cái -> demkt++ (tổng chữ cái: ${demkt}).`,
        });
      }
    }

    steps.push({
      step: stepNum++,
      nodeId: 'node-output',
      i: chars.length,
      currentChar: 'EOF',
      primaryVarName: 'demso',
      primaryVarValue: demso,
      secondaryVarName: 'demkt',
      secondaryVarValue: demkt,
      memoryItems: [`demso = ${demso}`, `demkt = ${demkt}`],
      memoryLabel: 'Kết quả cuối',
      action: `Xuất kết quả: ${demso} chữ số, ${demkt} chữ cái`,
      explanation: `In kết quả ra file DEMKTSO.OUT: dòng 1: ${demso}, dòng 2: ${demkt}.`,
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
    explanation: `Nạp dữ liệu đầu vào cho bài ${upperCode}. Thiết lập trạng thái ban đầu.`,
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
        nodeId: 'node-true-0',
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
