/**
 * Sinh sơ đồ thuật toán (React Flow) từ mã C++ — bản viết lại theo cây khối.
 *
 * Bản trước dùng heuristic phẳng: xoá hết dấu `{`/`}` rồi quét một lượt, nên
 * (a) chỉ nhận `cin >>` có dấu cách — bỏ trắng lối viết thi đấu `cin>>n>>k;`,
 * (b) chỉ giữ vòng lặp ĐẦU TIÊN, (c) KHÔNG có nhánh `else` nên thân `else` bị
 * xoá và thay bằng câu bịa "// Không thỏa điều kiện", (d) không có cạnh quay
 * lại nên sơ đồ không đọc ra hình vòng lặp, và (e) bịa `cout << ans;` khi
 * không tìm thấy lệnh xuất. Học sinh học sai thuật toán của chính bài mình làm.
 *
 * Bản này:
 *   1. Quét ký tự có nhận biết chuỗi/ký tự/comment → đếm ngoặc ĐÚNG.
 *   2. Dựng cây khối thật: `if/else if/else`, `for`, `while`, `do…while`,
 *      `switch`, `break`, `continue`, lồng nhau bao nhiêu tầng cũng được.
 *   3. Bố cục đệ quy: mỗi nhánh chiếm một làn riêng nên không đè lên nhau;
 *      vòng lặp có cạnh quay lại; `if` không `else` có cạnh "Sai" đi tiếp.
 *   4. KHÔNG bịa thêm bất cứ câu lệnh nào. Không đọc được thì không vẽ.
 */

import type { Node, Edge } from 'reactflow';
import { MarkerType } from 'reactflow';

// ── Kiểu dữ liệu ──────────────────────────────

export type StmtRole = 'decl' | 'input' | 'output' | 'action' | 'jump';

/**
 * Cây khối của chương trình. `nodeId` được bố cục gán vào chính đối tượng khối,
 * nhờ đó `simulation-generator.ts` chạy thử code và biết ngay phải làm sáng khối
 * nào — không cần đoán tên khối rồi tra bảng alias như trước.
 */
export type CppBlock =
  | { kind: 'stmt'; text: string; role: StmtRole; nodeId?: string }
  | {
      kind: 'if';
      cond: string;
      then: CppBlock[];
      else: CppBlock[];
      nodeId?: string;
    }
  | {
      kind: 'loop';
      loopKind: 'for' | 'while' | 'dowhile';
      header: string;
      body: CppBlock[];
      nodeId?: string;
    }
  | { kind: 'group'; header: string; body: CppBlock[]; nodeId?: string };

type Block = CppBlock;

export interface FlowchartOptions {
  /** Bảng màu cạnh phải khớp chế độ Sáng/Tối đang bật */
  theme?: 'light' | 'dark';
  ioType?: 'FILE' | 'STANDARD';
  ioFileName?: string | null;
}

export interface FlowchartData {
  nodes: Node[];
  edges: Edge[];
  /**
   * Bản đồ tên khối "kiểu cũ" (`node-init`, `node-loop`, `node-true-0`…) sang
   * id thật của sơ đồ mới — giữ lại cho khối do người dùng tự thêm và cho mọi
   * chỗ còn phát ra tên cũ.
   */
  aliases: Record<string, string>;
  /** Cây khối đã gắn `nodeId` — đầu vào của bộ chạy thử ở tab ③. */
  program: CppBlock[];
  startNodeId?: string;
  endNodeId?: string;
}

// ── Bảng màu cạnh ─────────────────────────────

/**
 * Màu cạnh không thể để `var(--success)`: React Flow gắn màu mũi tên vào
 * thuộc tính `fill` của `<marker>` SVG, nơi `var()` không được thay thế. Nên ở
 * đây liệt kê đúng giá trị của token theme cho từng chế độ.
 */
type EdgeTone = 'flow' | 'true' | 'false' | 'back';

const PALETTE: Record<'light' | 'dark', Record<EdgeTone, string>> = {
  light: {
    flow: 'hsl(215.4 16.3% 46.9%)',
    true: 'hsl(142.1 76.2% 36.3%)',
    false: 'hsl(0 84.2% 60.2%)',
    back: 'hsl(32.1 94.6% 43.7%)',
  },
  dark: {
    flow: 'hsl(240 5% 64.9%)',
    true: 'hsl(142.1 70.6% 45.3%)',
    false: 'hsl(0 72.2% 50.6%)',
    back: 'hsl(37.7 92.1% 50.2%)',
  },
};

/**
 * Nhãn cạnh là huy hiệu bo góc nền tối ở CẢ hai chế độ màu: ô chữ nhật trắng
 * mặc định của React Flow chói mắt trên nền tối và làm rối sơ đồ ở nền sáng.
 * Chữ trên huy hiệu luôn dùng tông SÁNG (bảng `dark`) để đọc rõ trên nền tối.
 */
const BADGE_BG: Record<'light' | 'dark', string> = {
  light: 'hsl(222.2 47.4% 11.2%)',
  dark: 'hsl(240 6% 10%)',
};

// ── Bộ quét ký tự ─────────────────────────────

interface Cursor {
  src: string;
  i: number;
}

const isSpace = (c: string) => c === ' ' || c === '\t' || c === '\n' || c === '\r';

/** Bỏ qua khoảng trắng, comment và chỉ thị tiền xử lý tại vị trí hiện tại. */
function skipTrivia(c: Cursor): void {
  for (;;) {
    while (c.i < c.src.length && isSpace(c.src[c.i])) c.i++;
    if (c.src.startsWith('//', c.i)) {
      const nl = c.src.indexOf('\n', c.i);
      c.i = nl === -1 ? c.src.length : nl + 1;
      continue;
    }
    if (c.src.startsWith('/*', c.i)) {
      const end = c.src.indexOf('*/', c.i + 2);
      c.i = end === -1 ? c.src.length : end + 2;
      continue;
    }
    if (c.src[c.i] === '#') {
      const nl = c.src.indexOf('\n', c.i);
      c.i = nl === -1 ? c.src.length : nl + 1;
      continue;
    }
    return;
  }
}

/** Nhảy qua một hằng chuỗi/ký tự để dấu `{`, `}`, `;` bên trong không bị đếm. */
function skipString(c: Cursor): void {
  const quote = c.src[c.i];
  c.i++;
  while (c.i < c.src.length) {
    const ch = c.src[c.i];
    if (ch === '\\') {
      c.i += 2;
      continue;
    }
    c.i++;
    if (ch === quote) return;
  }
}

/** Gom nhiều dòng/comment thành một dòng gọn để in lên khối. */
function cleanText(raw: string): string {
  return raw
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Đọc thô đến khi gặp một trong `stops` ở độ sâu ngoặc 0.
 * Không consume ký tự dừng.
 */
function readRaw(c: Cursor, stops: string): string {
  const start = c.i;
  let depth = 0;
  while (c.i < c.src.length) {
    const ch = c.src[c.i];
    if (ch === '"' || ch === "'") {
      skipString(c);
      continue;
    }
    if (c.src.startsWith('//', c.i) || c.src.startsWith('/*', c.i)) {
      const before = c.i;
      skipTrivia(c);
      if (c.i === before) c.i++;
      continue;
    }
    if (ch === '(' || ch === '[') {
      depth++;
      c.i++;
      continue;
    }
    if (ch === ')' || ch === ']') {
      depth--;
      c.i++;
      continue;
    }
    if (ch === '{') {
      if (depth === 0 && stops.includes('{')) break;
      depth++;
      c.i++;
      continue;
    }
    if (ch === '}') {
      if (depth === 0 && stops.includes('}')) break;
      depth--;
      c.i++;
      continue;
    }
    if (depth === 0 && stops.includes(ch)) break;
    c.i++;
  }
  return c.src.slice(start, c.i);
}

/** Con trỏ đang ở `{` → nhảy qua đúng dấu `}` khớp cặp. */
function skipBalancedBraces(c: Cursor): void {
  if (c.src[c.i] !== '{') return;
  c.i++;
  let depth = 1;
  while (c.i < c.src.length && depth > 0) {
    const ch = c.src[c.i];
    if (ch === '"' || ch === "'") {
      skipString(c);
      continue;
    }
    if (c.src.startsWith('//', c.i) || c.src.startsWith('/*', c.i)) {
      const before = c.i;
      skipTrivia(c);
      if (c.i === before) c.i++;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    c.i++;
  }
}

function peekWord(c: Cursor): string {
  const m = /^[A-Za-z_]\w*/.exec(c.src.slice(c.i, c.i + 32));
  return m ? m[0] : '';
}

/** Con trỏ ở (hoặc trước) `(` → trả về nội dung trong ngoặc, đã consume `)`. */
function readParen(c: Cursor): string {
  skipTrivia(c);
  if (c.src[c.i] !== '(') return '';
  c.i++;
  const start = c.i;
  let depth = 1;
  while (c.i < c.src.length) {
    const ch = c.src[c.i];
    if (ch === '"' || ch === "'") {
      skipString(c);
      continue;
    }
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) break;
    }
    c.i++;
  }
  const text = c.src.slice(start, c.i);
  if (c.src[c.i] === ')') c.i++;
  return cleanText(text);
}

// ── Phân loại câu lệnh ────────────────────────

/** Câu lệnh khung chương trình, không thuộc thuật toán → không vẽ. */
const NOISE_RE =
  /^(using\s+namespace|ios_base|ios::|std::ios|cin\.tie|cout\.tie|cin\.sync|sync_with_stdio|freopen|fclose|fflush|fopen|srand|setlocale|system\s*\()/i;

const DECL_RE =
  /^(const\s+|static\s+|unsigned\s+|signed\s+|long\s+|short\s+)*(int|char|bool|float|double|long|short|string|void|auto|vector|pair|map|unordered_map|set|unordered_set|multiset|queue|deque|stack|priority_queue|ll|lli|ull|size_t|bitset|array|tuple)\b/;

function classify(text: string): StmtRole {
  if (/^(break|continue)\b/.test(text)) return 'jump';
  // Không dùng khoảng trắng làm mốc: `cin>>n>>k;` phải nhận ra được.
  if (/\b(cin|scanf|getline|gets|fscanf)\b/.test(text)) return 'input';
  if (/\b(cout|printf|puts|fprintf|cerr)\b/.test(text)) return 'output';
  if (DECL_RE.test(text)) return 'decl';
  return 'action';
}

function makeStmt(raw: string): Block | null {
  const text = cleanText(raw);
  if (!text) return null;
  if (NOISE_RE.test(text)) return null;
  // `return` trong `main` chỉ là điểm kết — đã có khối "Kết thúc" lo phần này.
  if (/^return\b/.test(text)) return null;
  const role = classify(text);
  // `readRaw` dừng TRƯỚC dấu `;`, trả lại để nhãn đọc ra đúng câu lệnh C++.
  return { kind: 'stmt', text: text.endsWith(';') ? text : `${text};`, role };
}

// ── Bộ phân tích cú pháp ──────────────────────

function parseStatements(c: Cursor, stopAtBrace: boolean): Block[] {
  const out: Block[] = [];
  for (;;) {
    skipTrivia(c);
    if (c.i >= c.src.length) break;
    const ch = c.src[c.i];
    if (ch === '}') {
      if (stopAtBrace) c.i++;
      break;
    }
    if (ch === ';') {
      c.i++;
      continue;
    }
    if (ch === '{') {
      c.i++;
      out.push(...parseStatements(c, true));
      continue;
    }
    const kw = peekWord(c);
    if (kw === 'if') {
      const ifBlock = parseIf(c);
      if (ifBlock.kind === 'if' && (ifBlock.then.length > 0 || ifBlock.else.length > 0)) {
        out.push(ifBlock);
      }
      continue;
    }
    if (kw === 'for' || kw === 'while') {
      out.push(parseLoop(c, kw));
      continue;
    }
    if (kw === 'do') {
      out.push(parseDoWhile(c));
      continue;
    }
    if (kw === 'switch') {
      out.push(parseSwitch(c));
      continue;
    }
    if (kw === 'else') {
      // `else` mồ côi (thân `if` không ngoặc đã ăn mất) — bỏ từ khoá, đọc thân.
      c.i += 4;
      out.push(...parseBody(c));
      continue;
    }
    // Dừng cả ở `}`: gặp câu lệnh thiếu `;` thì vẫn không ăn lẹm sang khối ngoài.
    const stmt = makeStmt(readRaw(c, ';}'));
    if (c.src[c.i] === ';') c.i++;
    if (stmt) out.push(stmt);
  }
  return out;
}

/** Thân của `if`/`for`/`while`: có ngoặc `{}` hay chỉ một câu lệnh đều nhận. */
function parseBody(c: Cursor): Block[] {
  skipTrivia(c);
  if (c.src[c.i] === '{') {
    c.i++;
    return parseStatements(c, true);
  }
  const kw = peekWord(c);
  if (kw === 'if') return [parseIf(c)];
  if (kw === 'for' || kw === 'while') return [parseLoop(c, kw)];
  if (kw === 'do') return [parseDoWhile(c)];
  if (kw === 'switch') return [parseSwitch(c)];
  const stmt = makeStmt(readRaw(c, ';}'));
  if (c.src[c.i] === ';') c.i++;
  return stmt ? [stmt] : [];
}

function parseIf(c: Cursor): Block {
  c.i += 2;
  const cond = readParen(c);
  const thenBody = parseBody(c);
  let elseBody: Block[] = [];
  const save = c.i;
  skipTrivia(c);
  if (peekWord(c) === 'else') {
    c.i += 4;
    // `else if (...)` tự động thành khối `if` lồng trong nhánh Sai.
    elseBody = parseBody(c);
  } else {
    c.i = save;
  }
  return { kind: 'if', cond, then: thenBody, else: elseBody };
}

function parseLoop(c: Cursor, kw: 'for' | 'while'): Block {
  c.i += kw.length;
  const head = readParen(c);
  const body = parseBody(c);
  return { kind: 'loop', loopKind: kw, header: `${kw} (${head})`, body };
}

function parseDoWhile(c: Cursor): Block {
  c.i += 2;
  const body = parseBody(c);
  skipTrivia(c);
  let cond = '';
  if (peekWord(c) === 'while') {
    c.i += 5;
    cond = readParen(c);
  }
  skipTrivia(c);
  if (c.src[c.i] === ';') c.i++;
  return { kind: 'loop', loopKind: 'dowhile', header: `while (${cond})`, body };
}

function parseSwitch(c: Cursor): Block {
  c.i += 6;
  const cond = readParen(c);
  const body = parseBody(c);
  return { kind: 'group', header: `switch (${cond})`, body };
}

/** Lấy đúng phần thân trong `int main() { … }`, kèm vị trí bắt đầu của `main`. */
function extractMainBody(src: string): { body: string; at: number } | null {
  const m = /\bmain\s*\(/.exec(src);
  if (!m) return null;
  const c: Cursor = { src, i: m.index + m[0].length - 1 };
  readParen(c);
  skipTrivia(c);
  if (src[c.i] !== '{') return null;
  const start = c.i + 1;
  skipBalancedBraces(c);
  return { body: src.slice(start, Math.max(start, c.i - 1)), at: m.index };
}

/**
 * Khai báo toàn cục trước `main` (VD `int n,k; string s;`) là trạng thái của
 * thuật toán nên vẫn phải lên sơ đồ; thân các hàm khác thì bỏ qua.
 */
function parseGlobals(src: string): Block[] {
  const c: Cursor = { src, i: 0 };
  const out: Block[] = [];
  while (c.i < src.length) {
    skipTrivia(c);
    if (c.i >= src.length) break;
    if (src[c.i] === '}' || src[c.i] === ';') {
      c.i++;
      continue;
    }
    const raw = readRaw(c, ';{');
    if (src[c.i] === '{') {
      skipBalancedBraces(c);
      skipTrivia(c);
      if (src[c.i] === ';') c.i++;
      continue;
    }
    // Không có `;` kết thúc thì đây là mảnh cắt dở (VD chữ `int` của
    // `int main`) — bỏ, tránh sinh ra khối khai báo rỗng nghĩa.
    if (src[c.i] !== ';') break;
    c.i++;
    const stmt = makeStmt(raw);
    if (stmt && stmt.kind === 'stmt' && stmt.role === 'decl') out.push(stmt);
  }
  return out;
}

/**
 * Gộp các khai báo liền nhau vào một khối — đúng quy ước vẽ sơ đồ và tránh một
 * dãy 6 hộp chỉ để nói "khai báo biến".
 */
function mergeDecls(blocks: Block[]): Block[] {
  const out: Block[] = [];
  for (const raw of blocks) {
    // Gộp cả trong thân vòng lặp / nhánh điều kiện, không chỉ ở cấp ngoài.
    const b: Block =
      raw.kind === 'if'
        ? { ...raw, then: mergeDecls(raw.then), else: mergeDecls(raw.else) }
        : raw.kind === 'loop' || raw.kind === 'group'
          ? { ...raw, body: mergeDecls(raw.body) }
          : { ...raw };
    const prev = out[out.length - 1];
    if (
      b.kind === 'stmt' &&
      b.role === 'decl' &&
      prev &&
      prev.kind === 'stmt' &&
      prev.role === 'decl' &&
      prev.text.split('\n').length < 5
    ) {
      prev.text = `${prev.text}\n${b.text}`;
      continue;
    }
    out.push(b);
  }
  return out;
}

// ── Bố cục ────────────────────────────────────

const SLOT_W = 320;
const ROW_H = 122;
const NODE_W = 230;

interface Exit {
  id: string;
  label?: string;
  tone?: EdgeTone;
  sourceHandle?: string;
  targetHandle?: string;
}

interface PlaceResult {
  y: number;
  exits: Exit[];
  /** Khối đầu tiên của nhánh — dùng cho cạnh quay lại và bản đồ alias */
  entry?: string;
}

interface Ctx {
  nodes: Node[];
  edges: Edge[];
  counters: Record<string, number>;
  palette: Record<EdgeTone, string>;
  /** Nền huy hiệu nhãn cạnh (luôn tối) */
  badgeBg: string;
  loopStack: { id: string; breaks: Exit[] }[];
  aliases: Record<string, string>;
}

/** Số "làn" ngang một khối cần để nhánh Đúng/Sai không đè lên nhau. */
function measureBlock(b: Block): number {
  if (b.kind === 'if') {
    return measureList(b.then) + (b.else.length ? measureList(b.else) : 1);
  }
  if (b.kind === 'loop' || b.kind === 'group') return measureList(b.body);
  return 1;
}

function measureList(blocks: Block[]): number {
  let m = 1;
  for (const b of blocks) m = Math.max(m, measureBlock(b));
  return m;
}

const CATEGORY: Record<StmtRole, string> = {
  decl: 'Khai báo & Khởi tạo',
  input: 'Nhập dữ liệu',
  output: 'Xuất kết quả',
  action: 'Xử lý',
  jump: 'Điều khiển vòng lặp',
};

/** Cắt nhãn quá dài để hộp không phình ra đè cạnh bên. */
function trimLabel(text: string): string {
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
}

function addNode(
  ctx: Ctx,
  role: string,
  x: number,
  y: number,
  data: Record<string, unknown>,
): string {
  const n = ctx.counters[role] ?? 0;
  ctx.counters[role] = n + 1;
  const id = `node-${role}-${n}`;
  ctx.nodes.push({
    id,
    type: 'custom',
    position: { x: Math.round(x), y: Math.round(y) },
    data,
  });
  return id;
}

function connect(ctx: Ctx, from: Exit[], to: string): void {
  const seen = new Set<string>();

  for (const ex of from) {
    const tone: EdgeTone = ex.tone ?? 'flow';
    const color = ctx.palette[tone];
    // Chữ nhãn dùng tông sáng vì huy hiệu luôn nền tối.
    const ink = PALETTE.dark[tone];

    const sourceHandle =
      ex.sourceHandle ??
      (tone === 'back'
        ? 'left-source'
        : tone === 'true'
          ? 'left-source'
          : tone === 'false'
            ? 'right-source'
            : 'bottom-source');

    const targetHandle =
      ex.targetHandle ??
      (tone === 'back' ? 'left-target' : 'top-target');

    // Chống tạo trùng lặp các cạnh giống hệt nhau hoặc đè nhãn lên cùng một đường
    const edgeKey = `${ex.id}__${to}__${sourceHandle}__${targetHandle}`;
    if (seen.has(edgeKey)) continue;
    seen.add(edgeKey);

    ctx.edges.push({
      id: `e-${ex.id}__${to}__${ctx.edges.length}`,
      source: ex.id,
      target: to,
      sourceHandle,
      targetHandle,
      type: 'smoothstep',
      animated: tone === 'back',
      label: ex.label,
      // Huy hiệu bo góc nền tối thay cho ô chữ nhật trắng mặc định.
      labelShowBg: Boolean(ex.label),
      labelBgPadding: [8, 4],
      labelBgBorderRadius: 8,
      labelBgStyle: { fill: ctx.badgeBg, fillOpacity: 0.95, stroke: color, strokeWidth: 1 },
      labelStyle: { fill: ink, fontSize: 10, fontWeight: 700 },
      style: { stroke: color, strokeWidth: tone === 'flow' ? 1.6 : 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color,
        width: 16,
        height: 16,
      },
    });
  }
}

function centerX(left: number, span: number): number {
  return left * SLOT_W + (span * SLOT_W) / 2 - NODE_W / 2;
}

function placeList(
  ctx: Ctx,
  blocks: Block[],
  left: number,
  span: number,
  y: number,
  incoming: Exit[],
): PlaceResult {
  let cur = incoming;
  let curY = y;
  let entry: string | undefined;

  for (const b of blocks) {
    const bSpan = measureBlock(b);
    const bLeft = left + (span - bSpan) / 2;
    const r = placeBlock(ctx, b, bLeft, bSpan, curY, cur);
    if (!entry) entry = r.entry;
    cur = r.exits;
    curY = r.y;
    // `break`/`continue` cắt luồng: các câu sau nó không bao giờ chạy tới.
    if (cur.length === 0) break;
  }

  return { y: curY, exits: cur, entry };
}

function placeBlock(
  ctx: Ctx,
  b: Block,
  left: number,
  span: number,
  y: number,
  incoming: Exit[],
): PlaceResult {
  const x = centerX(left, span);

  if (b.kind === 'stmt') {
    if (b.role === 'jump') {
      const isContinue = /^continue\b/.test(b.text);
      const id = addNode(ctx, 'jump', x, y, {
        category: CATEGORY.jump,
        label: b.text,
        subtext: isContinue ? 'Sang ngay lượt lặp kế tiếp' : 'Thoát khỏi vòng lặp',
        type: 'condition',
      });
      b.nodeId = id;
      connect(ctx, incoming, id);
      const loop = ctx.loopStack[ctx.loopStack.length - 1];
      if (loop) {
        if (isContinue) {
          connect(
            ctx,
            [{ id, label: '↻ Quay lại', tone: 'back', sourceHandle: 'left-source', targetHandle: 'left-target' }],
            loop.id,
          );
        } else {
          loop.breaks.push({ id, tone: 'false', sourceHandle: 'right-source', targetHandle: 'top-target' });
        }
      }
      return { y: y + ROW_H, exits: [], entry: id };
    }

    const id = addNode(ctx, b.role, x, y, {
      category: CATEGORY[b.role],
      label: trimLabel(b.text),
      type: b.role === 'decl' ? 'decl' : b.role,
    });
    b.nodeId = id;
    connect(ctx, incoming, id);
    if (b.role === 'input' && !ctx.aliases['node-init']) {
      ctx.aliases['node-init'] = id;
    }
    if (b.role === 'output' && !ctx.aliases['node-output']) {
      ctx.aliases['node-output'] = id;
    }
    if (b.role === 'action') {
      const n = (ctx.counters.action ?? 1) - 1;
      if (n <= 1) ctx.aliases[`node-act-${n}`] = id;
    }
    return { y: y + ROW_H, exits: [{ id, sourceHandle: 'bottom-source', targetHandle: 'top-target' }], entry: id };
  }

  if (b.kind === 'if') {
    const id = addNode(ctx, 'cond', x, y, {
      category: 'Kiểm tra điều kiện',
      label: trimLabel(`if (${b.cond})`),
      subtext: b.else.length
        ? 'Đúng → nhánh trái, Sai → nhánh phải'
        : 'Sai thì bỏ qua, đi tiếp xuống dưới',
      type: 'condition',
    });
    b.nodeId = id;
    connect(ctx, incoming, id);

    const thenSpan = measureList(b.then);
    const elseSpan = b.else.length ? measureList(b.else) : 1;
    const bodyY = y + ROW_H;

    if (b.then.length > 0) {
      const t = placeList(ctx, b.then, left, thenSpan, bodyY, [
        { id, label: '✓ Đúng', tone: 'true' as EdgeTone, sourceHandle: 'left-source', targetHandle: 'top-target' },
      ]);
      let exits = [...t.exits];
      let maxY = t.y;

      if (b.else.length > 0) {
        const e = placeList(ctx, b.else, left + thenSpan, elseSpan, bodyY, [
          { id, label: '✗ Sai', tone: 'false' as EdgeTone, sourceHandle: 'right-source', targetHandle: 'top-target' },
        ]);
        exits = exits.concat(e.exits);
        maxY = Math.max(maxY, e.y);
        if (!ctx.aliases['node-false-0'] && e.entry) {
          ctx.aliases['node-false-0'] = e.entry;
        }
      } else {
        // Không có `else` → cạnh "Sai" rẽ sang phải rồi đi xuống khối kế tiếp.
        exits.push({ id, label: '✗ Sai', tone: 'false' as EdgeTone, sourceHandle: 'right-source', targetHandle: 'top-target' });
      }

      if (!ctx.aliases['node-cond-0']) ctx.aliases['node-cond-0'] = id;
      if (!ctx.aliases['node-true-0'] && t.entry) {
        ctx.aliases['node-true-0'] = t.entry;
      }

      return { y: maxY, exits, entry: id };
    } else if (b.else.length > 0) {
      const e = placeList(ctx, b.else, left + thenSpan, elseSpan, bodyY, [
        { id, label: '✗ Sai', tone: 'false' as EdgeTone, sourceHandle: 'right-source', targetHandle: 'top-target' },
      ]);
      const exits: Exit[] = [
        ...e.exits,
        { id, label: '✓ Đúng', tone: 'true' as EdgeTone, sourceHandle: 'left-source', targetHandle: 'top-target' },
      ];
      return { y: e.y, exits, entry: id };
    } else {
      return { y: y + ROW_H, exits: [{ id, sourceHandle: 'bottom-source', targetHandle: 'top-target' }], entry: id };
    }
  }

  if (b.kind === 'loop') {
    const id = addNode(ctx, 'loop', x, y, {
      category:
        b.loopKind === 'for'
          ? 'Vòng lặp for'
          : b.loopKind === 'dowhile'
            ? 'Vòng lặp do…while'
            : 'Vòng lặp while',
      label: trimLabel(b.header),
      subtext:
        b.loopKind === 'dowhile'
          ? 'Thân vòng chạy trước, kiểm tra điều kiện sau'
          : 'Còn thoả điều kiện thì lặp lại thân vòng',
      type: 'loop',
    });
    b.nodeId = id;
    connect(ctx, incoming, id);
    if (!ctx.aliases['node-loop']) ctx.aliases['node-loop'] = id;

    const frame = { id, breaks: [] as Exit[] };
    ctx.loopStack.push(frame);
    const body = placeList(ctx, b.body, left, span, y + ROW_H, [
      {
        id,
        label: b.loopKind === 'for' ? '✓ Mỗi lượt lặp' : '✓ Còn đúng',
        tone: 'true' as EdgeTone,
        sourceHandle: 'bottom-source',
        targetHandle: 'top-target',
      },
    ]);
    ctx.loopStack.pop();

    // Cạnh quay lại — lấy các điểm thoát từ thân vòng lặp quay về đầu vòng lặp
    // Chỉ kết nối các node thực sự trong thân (khác id vòng lặp)
    const validBackExits = body.exits.filter((e) => e.id !== id);
    if (validBackExits.length > 0) {
      connect(
        ctx,
        validBackExits.map((e) => ({
          id: e.id,
          label: '↻ Quay lại',
          tone: 'back' as EdgeTone,
          sourceHandle: 'left-source',
          targetHandle: 'left-target',
        })),
        id,
      );
    }

    return {
      y: body.y + 28,
      exits: [
        { id, label: '✗ Hết vòng lặp', tone: 'false' as EdgeTone, sourceHandle: 'right-source', targetHandle: 'top-target' },
        ...frame.breaks,
      ],
      entry: id,
    };
  }

  // switch (…) — rẽ nhiều nhánh, thân vẽ tuần tự bên dưới
  const id = addNode(ctx, 'cond', x, y, {
    category: 'Rẽ nhiều nhánh',
    label: trimLabel(b.header),
    type: 'condition',
  });
  b.nodeId = id;
  connect(ctx, incoming, id);
  const r = placeList(ctx, b.body, left, span, y + ROW_H, [{ id, tone: 'true' as EdgeTone, sourceHandle: 'bottom-source' }]);
  return { y: r.y, exits: r.exits.length ? r.exits : [{ id, sourceHandle: 'bottom-source' }], entry: id };
}

// ── Điểm vào công khai ────────────────────────

/** Mô tả cách bài đọc/ghi dữ liệu — lấy từ chính `freopen` trong code. */
function describeIo(src: string, options: FlowchartOptions): string {
  const files: string[] = [];
  const re = /freopen\s*\(\s*"([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) files.push(m[1]);

  if (files.length > 0) {
    return `Đọc/ghi tệp: ${Array.from(new Set(files)).join(' · ')}`;
  }
  if (options.ioType === 'FILE' && options.ioFileName) {
    const base = options.ioFileName.replace(/\.(inp|out|txt)$/i, '');
    return `Đọc/ghi tệp ${base}.INP → ${base}.OUT`;
  }
  return 'Đọc từ bàn phím (stdin), in ra màn hình (stdout)';
}

export function generateFlowchartFromCpp(
  cppCode: string,
  problemCode: string = 'PROBLEM',
  options: FlowchartOptions = {},
): FlowchartData {
  const src = cppCode || '';
  const empty: FlowchartData = { nodes: [], edges: [], aliases: {}, program: [] };
  if (!src.trim()) return empty;

  const main = extractMainBody(src);
  const inMain = parseStatements({ src: main ? main.body : src, i: 0 }, false);
  const blocks = mergeDecls([
    // Biến toàn cục chỉ lấy khi tách được `main`, nếu không sẽ đếm trùng.
    ...(main ? parseGlobals(src.slice(0, main.at)) : []),
    ...inMain,
  ]);

  if (blocks.length === 0) return empty;

  const theme = options.theme === 'light' ? 'light' : 'dark';
  const ctx: Ctx = {
    nodes: [],
    edges: [],
    counters: {},
    palette: PALETTE[theme],
    badgeBg: BADGE_BG[theme],
    loopStack: [],
    aliases: {},
  };

  const span = measureList(blocks);
  const startId = addNode(ctx, 'start', centerX(0, span), 0, {
    category: 'Bắt đầu',
    label: `${(problemCode || 'PROGRAM').toUpperCase()} — main()`,
    subtext: describeIo(src, options),
    type: 'start',
  });

  const body = placeList(ctx, blocks, 0, span, ROW_H, [{ id: startId }]);

  const endId = addNode(ctx, 'end', centerX(0, span), body.y, {
    category: 'Kết thúc',
    label: 'Kết thúc chương trình',
    type: 'end',
  });
  connect(ctx, body.exits, endId);

  // Bản đồ alias cho `simulation-generator.ts` (vẫn dùng tên khối kiểu cũ).
  const firstDecl = ctx.nodes.find((n) => n.id.startsWith('node-decl-'));
  ctx.aliases['node-init'] =
    ctx.aliases['node-init'] || firstDecl?.id || startId;
  ctx.aliases['node-output'] = ctx.aliases['node-output'] || endId;
  ctx.aliases['node-loop'] = ctx.aliases['node-loop'] || startId;
  ctx.aliases['node-start'] = startId;
  ctx.aliases['node-end'] = endId;

  return {
    nodes: ctx.nodes,
    edges: ctx.edges,
    aliases: ctx.aliases,
    program: blocks,
    startNodeId: startId,
    endNodeId: endId,
  };
}
