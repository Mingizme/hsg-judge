/**
 * Sinh bài tập "Code khuyết" (fill-in-the-blank) TRỰC TIẾP từ lời giải mẫu C++
 * của giáo viên.
 *
 * Trước đây phần này chỉ có hai bộ đề viết cứng cho TAOXAU và STRNUM; mọi bài
 * khác nhận một chỗ trống vô nghĩa với đáp án ['true', '1', 'i < n', 'k > 0'] và
 * mẫu code KHÔNG hề bị khoét lỗ nào. Nay toàn bộ chỗ trống được khoét từ chính
 * mã nguồn lời giải: đáp án luôn đúng với bài đang học, và bài nào cũng dùng
 * được mà không cần cấu hình thêm.
 */

export type ScaffoldDifficulty = 'Dễ' | 'Trung bình' | 'Khó';

export interface ScaffoldBlank {
  id: string;
  label: string;
  /** Các biến thể được chấp nhận (đã gồm nguyên văn lời giải) */
  correctAnswer: string[];
  hint: string;
  placeholder: string;
}

export interface ScaffoldLevel {
  id: number;
  title: string;
  difficulty: ScaffoldDifficulty;
  description: string;
  blanks: ScaffoldBlank[];
  /** Mã nguồn đã khoét lỗ, chỗ trống đánh dấu bằng `[BLANK_1]`, `[BLANK_2]`… */
  codeTemplate: string;
}

/** Loại chỗ trống — quyết định nhãn, gợi ý và độ khó */
type HoleKind =
  | 'input'
  | 'output'
  | 'update'
  | 'call'
  | 'forCond'
  | 'ifCond'
  | 'whileCond';

interface Candidate {
  start: number;
  end: number;
  text: string;
  kind: HoleKind;
  line: number;
}

/** 1 = dễ nhất (in/nhập/cập nhật), 3 = khó nhất (điều kiện vòng lặp cốt lõi) */
const KIND_WEIGHT: Record<HoleKind, number> = {
  output: 1,
  input: 1,
  update: 1,
  call: 2,
  forCond: 2,
  ifCond: 2,
  whileCond: 3,
};

const KIND_LABEL: Record<HoleKind, string> = {
  input: 'Câu lệnh đọc dữ liệu',
  output: 'Giá trị cần in ra',
  update: 'Câu lệnh cập nhật giá trị',
  call: 'Thao tác trên cấu trúc dữ liệu',
  forCond: 'Điều kiện vòng lặp for',
  ifCond: 'Điều kiện rẽ nhánh if',
  whileCond: 'Điều kiện vòng lặp while',
};

const KIND_HINT: Record<HoleKind, string> = {
  input:
    'Đọc vào đúng các biến, theo đúng thứ tự mà phần Input của đề bài mô tả.',
  output:
    'In ra đúng đại lượng mà phần Output của đề bài yêu cầu (chú ý thứ tự và định dạng).',
  update:
    'Xác định biến nào thay đổi sau mỗi bước và thay đổi theo công thức nào.',
  call: 'Thao tác thêm / bớt phần tử trên cấu trúc dữ liệu đang dùng.',
  forCond:
    'Vòng lặp for chạy khi điều kiện này còn đúng — hãy kiểm tra biến đếm còn nằm trong phạm vi dữ liệu hay chưa.',
  ifCond:
    'Biểu thức logic quyết định rẽ nhánh. Đọc lại đề để biết trường hợp nào phải xử lý riêng.',
  whileCond:
    'while chỉ chạy khi điều kiện này còn đúng. Hãy nghĩ xem thuật toán phải dừng ở thời điểm nào.',
};

const KIND_PLACEHOLDER: Record<HoleKind, string> = {
  input: 'Nhập câu lệnh đọc dữ liệu…',
  output: 'Nhập biểu thức cần in…',
  update: 'Nhập câu lệnh cập nhật…',
  call: 'Nhập lời gọi thao tác…',
  forCond: 'Nhập biểu thức điều kiện…',
  ifCond: 'Nhập biểu thức điều kiện…',
  whileCond: 'Nhập biểu thức điều kiện…',
};

/** So khớp đáp án: bỏ mọi khoảng trắng, bỏ `;` cuối, không phân biệt hoa/thường */
export function normalizeAnswer(value: string): string {
  return value.replace(/\s+/g, '').replace(/;+$/, '').toLowerCase();
}

/** `a < b` cũng đúng khi đáp án mẫu là `b > a` */
function mirrorComparison(text: string): string | null {
  const m = text.match(/^([^<>=!]+?)\s*(<=|>=|<|>)\s*([^<>=!]+)$/);
  if (!m) return null;
  const flip: Record<string, string> = { '<': '>', '>': '<', '<=': '>=', '>=': '<=' };
  return `${m[3].trim()} ${flip[m[2]]} ${m[1].trim()}`;
}

function buildVariants(text: string): string[] {
  const base = text.trim().replace(/;+$/, '').trim();
  const variants = new Set<string>([base]);
  const mirrored = mirrorComparison(base);
  if (mirrored) variants.add(mirrored);
  return Array.from(variants);
}

/** Tìm dấu `)` khớp với dấu `(` tại `openIdx` */
function matchParen(src: string, openIdx: number): number {
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'") {
      const quote = c;
      i++;
      while (i < src.length && src[i] !== quote) {
        if (src[i] === '\\') i++;
        i++;
      }
      continue;
    }
    if (c === '(') depth++;
    else if (c === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** Cắt nội dung trong `(...)` của `for` thành 3 phần theo `;` ở mức ngoài cùng */
function splitForParts(inner: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const c of inner) {
    if (c === '(' || c === '[' || c === '{') depth++;
    if (c === ')' || c === ']' || c === '}') depth--;
    if (c === ';' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += c;
  }
  parts.push(current);
  return parts;
}

const SKIP_LINE =
  /^\s*(?:#|\/\/|\/\*|\*|using\s+namespace|return\s+0\s*;|\}|\{|ios_base|cin\s*\.\s*tie|cout\s*\.\s*tie|freopen)/;

/** Bỏ phần bình luận `//` ở cuối dòng khi dò ứng viên */
function stripLineComment(line: string): string {
  const idx = line.indexOf('//');
  return idx >= 0 ? line.slice(0, idx) : line;
}

/**
 * Dò toàn bộ vị trí có thể khoét lỗ trong mã nguồn. Làm việc trên chỉ số ký tự
 * của chuỗi gốc để mẫu code sinh ra giữ nguyên định dạng lời giải của giáo viên.
 */
function collectCandidates(src: string): Candidate[] {
  const found: Candidate[] = [];
  const lines = src.split('\n');
  let offset = 0;

  lines.forEach((rawLine, idx) => {
    const lineStart = offset;
    offset += rawLine.length + 1;

    const line = stripLineComment(rawLine);
    if (!line.trim() || SKIP_LINE.test(line)) return;

    const lineNo = idx + 1;
    const push = (start: number, end: number, kind: HoleKind) => {
      const text = src.slice(start, end).trim();
      // Bỏ chỗ trống rỗng hoặc quá dài (cả một biểu thức khổng lồ)
      if (text.length < 1 || text.length > 90) return;
      const trimStart = start + (src.slice(start, end).length - src.slice(start, end).trimStart().length);
      found.push({ start: trimStart, end: trimStart + text.length, text, kind, line: lineNo });
    };

    // for (init; ĐIỀU KIỆN; step)
    const forMatch = line.match(/\bfor\s*\(/);
    if (forMatch && forMatch.index !== undefined) {
      const open = lineStart + line.indexOf('(', forMatch.index);
      const close = matchParen(src, open);
      if (close > open) {
        const inner = src.slice(open + 1, close);
        const parts = splitForParts(inner);
        if (parts.length >= 2 && parts[1].trim()) {
          const condStart = open + 1 + parts[0].length + 1;
          push(condStart, condStart + parts[1].length, 'forCond');
        }
      }
      return;
    }

    // while (ĐIỀU KIỆN)
    const whileMatch = line.match(/\bwhile\s*\(/);
    if (whileMatch && whileMatch.index !== undefined) {
      const open = lineStart + line.indexOf('(', whileMatch.index);
      const close = matchParen(src, open);
      if (close > open) push(open + 1, close, 'whileCond');
      return;
    }

    // if (ĐIỀU KIỆN) — bỏ qua `else if` lồng quá sâu vẫn không sao
    const ifMatch = line.match(/\bif\s*\(/);
    if (ifMatch && ifMatch.index !== undefined) {
      const open = lineStart + line.indexOf('(', ifMatch.index);
      const close = matchParen(src, open);
      if (close > open) push(open + 1, close, 'ifCond');
      return;
    }

    // cout << … ; (khoét phần cần in, giữ lại `<< endl` để lộ định dạng)
    const coutMatch = line.match(/\b(?:cout|fout|cerr)\s*<</);
    if (coutMatch && coutMatch.index !== undefined) {
      const exprStart = lineStart + coutMatch.index + coutMatch[0].length;
      const semi = line.indexOf(';', coutMatch.index);
      let exprEnd = semi >= 0 ? lineStart + semi : lineStart + line.length;
      const tail = src.slice(exprStart, exprEnd).match(/\s*<<\s*(?:endl|"\\n"|'\\n')\s*$/);
      if (tail) exprEnd -= tail[0].length;
      push(exprStart, exprEnd, 'output');
      return;
    }

    // getline(cin, s);
    const getlineMatch = line.match(/\bgetline\s*\(/);
    if (getlineMatch && getlineMatch.index !== undefined) {
      const open = lineStart + line.indexOf('(', getlineMatch.index);
      const close = matchParen(src, open);
      if (close > open) {
        push(lineStart + getlineMatch.index, close + 1, 'input');
        return;
      }
    }

    // cin >> a >> b ;
    const cinMatch = line.match(/\b(?:cin|fin)\s*>>/);
    if (cinMatch && cinMatch.index !== undefined) {
      const exprStart = lineStart + cinMatch.index + cinMatch[0].length;
      const semi = line.indexOf(';', cinMatch.index);
      const exprEnd = semi >= 0 ? lineStart + semi : lineStart + line.length;
      push(exprStart, exprEnd, 'input');
      return;
    }

    // st.push(x); v.push_back(x); q.pop();
    const callMatch = line.match(
      /\b\w+\s*\.\s*(?:push_back|push|pop_back|pop|insert|emplace_back|emplace|erase)\s*\(/,
    );
    if (callMatch && callMatch.index !== undefined) {
      const open = lineStart + line.indexOf('(', callMatch.index);
      const close = matchParen(src, open);
      if (close > open) {
        push(lineStart + callMatch.index, close + 1, 'call');
        return;
      }
    }

    // res += x;  ans = ans * 2 + 1;  cnt++;
    const assign = line.match(
      /^\s*(?!(?:int|long|double|float|char|bool|string|auto|vector|stack|queue|deque|set|map|pair|const)\b)([A-Za-z_]\w*(?:\s*\[[^\]]*\])*)\s*(\+=|-=|\*=|\/=|%=|\|=|&=|=)([^;]+);/,
    );
    if (assign && assign.index !== undefined) {
      // Khoét cả câu lệnh (`res += c`) chứ không chỉ phần bên phải: vế phải
      // thường chỉ dài một ký tự nên tách riêng ra sẽ thành câu hỏi vô nghĩa.
      const stmtStart = lineStart + line.indexOf(assign[1], assign.index);
      push(stmtStart, lineStart + assign[0].length - 1, 'update');
      return;
    }

    const incr = line.match(/^\s*([A-Za-z_]\w*)\s*(\+\+|--)\s*;/);
    if (incr && incr.index !== undefined) {
      const start = lineStart + line.indexOf(incr[1], incr.index);
      push(start, lineStart + line.indexOf(';', incr.index), 'update');
    }
  });

  return found;
}

/** Bỏ ứng viên chồng lấn nhau (ví dụ `for` init vừa là câu lệnh gán) */
function pickNonOverlapping(sorted: Candidate[], max: number): Candidate[] {
  const chosen: Candidate[] = [];
  for (const c of sorted) {
    if (chosen.length >= max) break;
    const clash = chosen.some((o) => c.start < o.end && o.start < c.end);
    if (!clash) chosen.push(c);
  }
  return chosen;
}

interface LevelSpec {
  id: number;
  difficulty: ScaffoldDifficulty;
  title: string;
  description: string;
  maxWeight: number;
  maxBlanks: number;
}

const LEVEL_SPECS: LevelSpec[] = [
  {
    id: 1,
    difficulty: 'Dễ',
    title: 'Mức 1: Nhập / xuất & cập nhật giá trị',
    description:
      'Khởi động: điền lại các câu lệnh đọc dữ liệu, in kết quả và cập nhật biến. Đây là những dòng bám sát phần Input / Output của đề bài.',
    maxWeight: 1,
    maxBlanks: 2,
  },
  {
    id: 2,
    difficulty: 'Trung bình',
    title: 'Mức 2: Điều kiện rẽ nhánh & vòng lặp',
    description:
      'Bổ sung thêm các biểu thức điều kiện. Hãy xác định vòng lặp chạy trong phạm vi nào và trường hợp nào cần xử lý riêng.',
    maxWeight: 2,
    maxBlanks: 4,
  },
  {
    id: 3,
    difficulty: 'Khó',
    title: 'Mức 3: Dựng lại toàn bộ lõi thuật toán',
    description:
      'Thử thách cuối: nhiều chỗ trống nằm ở đúng phần cốt lõi của thuật toán. Chỉ còn bộ khung chương trình, phần tư duy là của bạn.',
    maxWeight: 3,
    maxBlanks: 6,
  },
];

/** Xếp hạng ứng viên cho một mức: ưu tiên loại phù hợp, sau đó theo thứ tự dòng */
function rankForLevel(all: Candidate[], spec: LevelSpec): Candidate[] {
  const eligible = all.filter((c) => KIND_WEIGHT[c.kind] <= spec.maxWeight);
  const pool = eligible.length > 0 ? eligible : all;
  return [...pool].sort((a, b) => {
    // Mức khó ưu tiên chỗ trống nặng ký; mức dễ ưu tiên chỗ trống nhẹ
    const wa = KIND_WEIGHT[a.kind];
    const wb = KIND_WEIGHT[b.kind];
    if (wa !== wb) return spec.maxWeight >= 3 ? wb - wa : wa - wb;
    return a.start - b.start;
  });
}

function buildLevel(src: string, all: Candidate[], spec: LevelSpec): ScaffoldLevel | null {
  const picked = pickNonOverlapping(rankForLevel(all, spec), spec.maxBlanks);
  if (picked.length === 0) return null;

  // Đánh số chỗ trống theo thứ tự xuất hiện trong mã nguồn cho dễ đọc
  const ordered = [...picked].sort((a, b) => a.start - b.start);
  const blanks: ScaffoldBlank[] = ordered.map((c, i) => ({
    id: `BLANK_${i + 1}`,
    label: `${KIND_LABEL[c.kind]} (dòng ${c.line})`,
    correctAnswer: buildVariants(c.text),
    hint: KIND_HINT[c.kind],
    placeholder: KIND_PLACEHOLDER[c.kind],
  }));

  // Thay thế từ cuối về đầu để chỉ số của các chỗ trống trước không bị lệch
  let template = src;
  for (let i = ordered.length - 1; i >= 0; i--) {
    const c = ordered[i];
    template = template.slice(0, c.start) + `[BLANK_${i + 1}]` + template.slice(c.end);
  }

  return {
    id: spec.id,
    title: spec.title,
    difficulty: spec.difficulty,
    description: spec.description,
    blanks,
    codeTemplate: template,
  };
}

/**
 * Sinh các mức "Code khuyết" từ lời giải mẫu. Trả về `[]` khi không có lời giải
 * hoặc không tìm được chỗ trống nào có ý nghĩa — phía UI hiển thị trạng thái
 * rỗng trung thực thay vì bịa ra bài tập sai.
 */
export function generateScaffoldLevels(source: string): ScaffoldLevel[] {
  const src = (source || '').replace(/\r\n/g, '\n');
  if (!src.trim()) return [];

  const all = collectCandidates(src);
  if (all.length === 0) return [];

  const levels: ScaffoldLevel[] = [];
  for (const spec of LEVEL_SPECS) {
    const level = buildLevel(src, all, spec);
    if (!level) continue;
    // Không thêm mức trùng lặp y hệt mức trước (lời giải quá ngắn)
    const prev = levels[levels.length - 1];
    if (prev && prev.codeTemplate === level.codeTemplate) continue;
    levels.push({ ...level, id: levels.length + 1 });
  }

  return levels;
}
