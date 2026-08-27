// ============================================
// Dry-Run Engine — CHẠY THỬ mã C++ thật, không bịa dữ liệu
//
// Bản trước có hai nhánh cứng theo tên bài (THAYTHE, DEMKTSO) và một nhánh
// "tổng quát" bịa hẳn mảng [12,45,7,89,23] rồi mô phỏng thuật toán tìm max —
// bất kể code mẫu làm gì. Bài STRNUM (tham lam trên xâu) còn bị nhận vào nhánh
// THAYTHE chỉ vì trong code có `.erase(`, nên học sinh xem cảnh thay
// "anh" → "em" của một bài hoàn toàn khác.
//
// Bản này là một THÔNG DỊCH VIÊN C++ thu nhỏ: nhận cây khối do
// `cpp-to-flowchart.ts` dựng (đã gắn `nodeId`), thực thi từng câu lệnh với đúng
// dữ liệu test ví dụ của đề, rồi phát ra từng bước kèm giá trị biến THẬT.
// Không còn một dòng nào phụ thuộc vào tên bài.
//
// Phạm vi: int/long long/double/char/bool/string, mảng 1–2 chiều, vector,
// if/else, for/while/do…while, break/continue, cin/getline/scanf, cout/printf,
// và các hàm hay dùng (max, min, abs, sqrt, size, substr, erase, push_back,
// sort, swap, isdigit, toupper…). Gặp cú pháp ngoài phạm vi, engine DỪNG và nói
// rõ dừng ở đâu — thà thiếu còn hơn dạy sai.
// ============================================

import { generateFlowchartFromCpp, type CppBlock } from './cpp-to-flowchart';

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
  /**
   * `values` = chạy thử thật, có giá trị biến.
   * `structure` = chỉ đi bộ theo cấu trúc code (khi không có dữ liệu test ví dụ
   * hoặc code dùng cú pháp ngoài phạm vi thông dịch).
   */
  kind?: 'values' | 'structure';
  /** Nội dung chương trình đã in ra tới thời điểm này */
  printed?: string;
}

// ── Mô hình giá trị ───────────────────────────

/**
 * `char` của C++ phải tách khỏi `string`: nhờ vậy `s[i] - '0'` cho ra SỐ, còn
 * `res + s[i]` vẫn là phép nối xâu — đúng như C++ xử lý.
 */
class Chr {
  constructor(public c: string) {}
}

type Val = number | string | boolean | Chr | Val[];

type CType = 'int' | 'double' | 'char' | 'string' | 'bool' | 'array' | 'vector';

interface Cell {
  type: CType;
  /** Kiểu phần tử, dùng khi `type` là `array`/`vector` */
  elem: CType;
  value: Val;
}

/** Cú pháp ngoài phạm vi thông dịch → dừng trung thực, không đoán bừa. */
class Unsupported extends Error {}
/** Test ví dụ không còn dữ liệu để đọc */
class OutOfInput extends Error {}

class Env {
  private scopes: Map<string, Cell>[] = [new Map()];
  push(): void {
    this.scopes.push(new Map());
  }
  pop(): void {
    if (this.scopes.length > 1) this.scopes.pop();
  }
  declare(name: string, cell: Cell): void {
    this.scopes[this.scopes.length - 1].set(name, cell);
  }
  get(name: string): Cell | undefined {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      const c = this.scopes[i].get(name);
      if (c) return c;
    }
    return undefined;
  }
  /** Toàn bộ biến theo thứ tự khai báo — dùng cho bảng theo dõi biến */
  all(): [string, Cell][] {
    const out: [string, Cell][] = [];
    // `forEach` thay cho `for…of` trên Map: tsconfig của dự án nhắm ES5 nên
    // vòng lặp trên iterator cần cờ `downlevelIteration`.
    for (const s of this.scopes) s.forEach((cell, name) => out.push([name, cell]));
    return out;
  }
}

/** Bộ đọc dữ liệu vào — mô phỏng `cin >>` và `getline` trên test ví dụ. */
class Reader {
  private p = 0;
  constructor(private src: string) {}

  private static isWs(c: string): boolean {
    return c === ' ' || c === '\t' || c === '\n' || c === '\r';
  }

  hasToken(): boolean {
    let i = this.p;
    while (i < this.src.length && Reader.isWs(this.src[i])) i++;
    return i < this.src.length;
  }

  token(): string {
    while (this.p < this.src.length && Reader.isWs(this.src[this.p])) this.p++;
    if (this.p >= this.src.length) throw new OutOfInput('hết dữ liệu vào');
    const start = this.p;
    while (this.p < this.src.length && !Reader.isWs(this.src[this.p])) this.p++;
    return this.src.slice(start, this.p);
  }

  /** Một ký tự bất kỳ (kể cả khoảng trắng) — cho `cin.get()` / `%c` */
  char(): string {
    if (this.p >= this.src.length) throw new OutOfInput('hết dữ liệu vào');
    return this.src[this.p++];
  }

  line(): string {
    // `getline` ngay sau `cin >>`: phần đuôi dòng chỉ còn khoảng trắng thì bỏ
    // qua để lấy dòng thật — đúng như code có `cin.ignore()`.
    const nl0 = this.src.indexOf('\n', this.p);
    const rest = nl0 === -1 ? this.src.slice(this.p) : this.src.slice(this.p, nl0);
    if (this.p > 0 && this.src[this.p - 1] !== '\n' && rest.trim() === '') {
      this.p = nl0 === -1 ? this.src.length : nl0 + 1;
    }
    if (this.p >= this.src.length) throw new OutOfInput('hết dữ liệu vào');
    const nl = this.src.indexOf('\n', this.p);
    const raw = nl === -1 ? this.src.slice(this.p) : this.src.slice(this.p, nl);
    this.p = nl === -1 ? this.src.length : nl + 1;
    return raw.replace(/\r$/, '');
  }

  ignoreLine(): void {
    const nl = this.src.indexOf('\n', this.p);
    this.p = nl === -1 ? this.src.length : nl + 1;
  }
}

// ── Bộ tách token cho biểu thức ───────────────

interface Tok {
  t: 'num' | 'str' | 'chr' | 'id' | 'op';
  v: string;
  float?: boolean;
}

const OPS2 = [
  '++', '--', '<<', '>>', '<=', '>=', '==', '!=', '&&', '||',
  '+=', '-=', '*=', '/=', '%=', '->', '::',
];

const NUM_RE =
  /^(0[xX][0-9a-fA-F]+|[0-9]+\.[0-9]*([eE][+-]?[0-9]+)?|\.[0-9]+([eE][+-]?[0-9]+)?|[0-9]+([eE][+-]?[0-9]+)?)[uUlL]*/;

function decodeEscapes(s: string): string {
  return s.replace(/\\(.)/g, (_m, ch: string) =>
    ch === 'n' ? '\n' : ch === 't' ? '\t' : ch === 'r' ? '\r' : ch === '0' ? '\0' : ch,
  );
}

function lex(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      i++;
      continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      const m = NUM_RE.exec(src.slice(i));
      if (!m) throw new Unsupported(`số không đọc được ở "${src.slice(i, i + 12)}"`);
      const raw = m[0];
      const isHex = /^0[xX]/.test(raw);
      out.push({
        t: 'num',
        v: raw.replace(/[uUlL]*$/, ''),
        float: !isHex && /[.eE]/.test(raw.replace(/[uUlL]*$/, '')),
      });
      i += raw.length;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      let body = '';
      while (j < src.length && src[j] !== c) {
        if (src[j] === '\\') {
          body += src[j] + (src[j + 1] ?? '');
          j += 2;
          continue;
        }
        body += src[j];
        j++;
      }
      out.push({ t: c === '"' ? 'str' : 'chr', v: decodeEscapes(body) });
      i = j + 1;
      continue;
    }
    const idm = /^[A-Za-z_]\w*/.exec(src.slice(i));
    if (idm) {
      out.push({ t: 'id', v: idm[0] });
      i += idm[0].length;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (OPS2.includes(two)) {
      out.push({ t: 'op', v: two });
      i += 2;
      continue;
    }
    if ('+-*/%<>=!?:,.()[]&|^~;{}'.includes(c)) {
      out.push({ t: 'op', v: c });
      i++;
      continue;
    }
    throw new Unsupported(`ký tự lạ "${c}"`);
  }
  return out;
}

// ── Cây biểu thức ─────────────────────────────

type Expr =
  | { k: 'num'; v: number; float: boolean }
  | { k: 'str'; v: string }
  | { k: 'chr'; v: string }
  | { k: 'id'; name: string }
  | { k: 'bin'; op: string; l: Expr; r: Expr }
  | { k: 'un'; op: string; e: Expr }
  | { k: 'pre'; op: string; e: Expr }
  | { k: 'post'; op: string; e: Expr }
  | { k: 'assign'; op: string; target: Expr; e: Expr }
  | { k: 'index'; obj: Expr; idx: Expr }
  | { k: 'member'; obj: Expr; name: string }
  | { k: 'call'; fn: Expr; args: Expr[] }
  | { k: 'cond'; c: Expr; a: Expr; b: Expr }
  | { k: 'cast'; type: string; e: Expr };

const CAST_TYPES = [
  'int', 'char', 'double', 'float', 'long', 'bool', 'll', 'string', 'unsigned', 'short',
];

/** Chỉ những tên này được phép mang tham số khuôn mẫu `<...>` */
const TEMPLATE_NAMES = ['greater', 'less', 'vector', 'pair', 'set', 'map'];

const ASSIGN_OPS = ['=', '+=', '-=', '*=', '/=', '%='];

class Parser {
  private p = 0;
  constructor(private toks: Tok[]) {}

  private peek(o = 0): Tok | undefined {
    return this.toks[this.p + o];
  }
  private isOp(v: string, o = 0): boolean {
    const t = this.peek(o);
    return !!t && t.t === 'op' && t.v === v;
  }
  private eat(v: string): boolean {
    if (this.isOp(v)) {
      this.p++;
      return true;
    }
    return false;
  }
  private expect(v: string): void {
    if (!this.eat(v)) throw new Unsupported(`thiếu dấu "${v}"`);
  }
  atEnd(): boolean {
    return this.p >= this.toks.length;
  }

  parseExpr(): Expr {
    return this.assign();
  }

  private binLevel(ops: string[], next: () => Expr): Expr {
    let l = next.call(this);
    for (;;) {
      const t = this.peek();
      if (t && t.t === 'op' && ops.includes(t.v)) {
        this.p++;
        l = { k: 'bin', op: t.v, l, r: next.call(this) };
        continue;
      }
      return l;
    }
  }

  private assign(): Expr {
    const left = this.ternary();
    const t = this.peek();
    if (t && t.t === 'op' && ASSIGN_OPS.includes(t.v)) {
      this.p++;
      return { k: 'assign', op: t.v, target: left, e: this.assign() };
    }
    return left;
  }

  private ternary(): Expr {
    const c = this.logOr();
    if (this.eat('?')) {
      const a = this.assign();
      this.expect(':');
      return { k: 'cond', c, a, b: this.assign() };
    }
    return c;
  }

  private logOr(): Expr {
    return this.binLevel(['||'], this.logAnd);
  }
  private logAnd(): Expr {
    return this.binLevel(['&&'], this.bitOr);
  }
  private bitOr(): Expr {
    return this.binLevel(['|'], this.bitXor);
  }
  private bitXor(): Expr {
    return this.binLevel(['^'], this.bitAnd);
  }
  private bitAnd(): Expr {
    return this.binLevel(['&'], this.equality);
  }
  private equality(): Expr {
    return this.binLevel(['==', '!='], this.relational);
  }
  private relational(): Expr {
    return this.binLevel(['<', '>', '<=', '>='], this.shift);
  }
  private shift(): Expr {
    return this.binLevel(['<<', '>>'], this.additive);
  }
  private additive(): Expr {
    return this.binLevel(['+', '-'], this.multiplicative);
  }
  private multiplicative(): Expr {
    return this.binLevel(['*', '/', '%'], this.unary);
  }

  private unary(): Expr {
    const t = this.peek();
    // `&` (địa chỉ, cho `scanf`) và `*` được nhận để không làm sập bộ phân tích;
    // khi tính giá trị chúng được coi như chính toán hạng.
    if (t && t.t === 'op' && ['!', '-', '+', '~', '&', '*'].includes(t.v)) {
      this.p++;
      return { k: 'un', op: t.v, e: this.unary() };
    }
    if (t && t.t === 'op' && (t.v === '++' || t.v === '--')) {
      this.p++;
      return { k: 'pre', op: t.v, e: this.unary() };
    }
    // Ép kiểu kiểu C: `(int)x`, `(long long)x`, `(char)(a+1)`
    if (t && t.t === 'op' && t.v === '(') {
      const n1 = this.peek(1);
      if (n1 && n1.t === 'id' && CAST_TYPES.includes(n1.v)) {
        let k = 2;
        while (this.peek(k)?.t === 'id') k++;
        if (this.isOp(')', k)) {
          this.p += k + 1;
          return { k: 'cast', type: n1.v, e: this.unary() };
        }
      }
    }
    return this.postfix();
  }

  private postfix(): Expr {
    let e = this.primary();
    for (;;) {
      if (this.eat('[')) {
        const idx = this.assign();
        this.expect(']');
        e = { k: 'index', obj: e, idx };
        continue;
      }
      if (this.isOp('(')) {
        this.p++;
        const args: Expr[] = [];
        if (!this.isOp(')')) {
          for (;;) {
            args.push(this.assign());
            if (this.eat(',')) continue;
            break;
          }
        }
        this.expect(')');
        e = { k: 'call', fn: e, args };
        continue;
      }
      if (this.eat('.') || this.eat('->')) {
        const t = this.peek();
        if (!t || t.t !== 'id') throw new Unsupported('thiếu tên thành phần sau dấu "."');
        this.p++;
        e = { k: 'member', obj: e, name: t.v };
        continue;
      }
      const t = this.peek();
      if (t && t.t === 'op' && (t.v === '++' || t.v === '--')) {
        this.p++;
        e = { k: 'post', op: t.v, e };
        continue;
      }
      return e;
    }
  }

  /** Bỏ qua `<int>` của `greater<int>()` — chỉ cho những tên khuôn mẫu đã biết. */
  private skipTemplateArgs(): void {
    let k = 0;
    let depth = 0;
    for (;;) {
      const t = this.peek(k);
      if (!t || t.t !== 'op' && t.t !== 'id') return;
      if (t.t === 'op' && t.v === '<') depth++;
      else if (t.t === 'op' && t.v === '>') {
        depth--;
        if (depth === 0) {
          this.p += k + 1;
          return;
        }
      } else if (t.t === 'op' && !['::', ',', '*'].includes(t.v)) return;
      k++;
      if (k > 12) return;
    }
  }

  private primary(): Expr {
    const t = this.peek();
    if (!t) throw new Unsupported('biểu thức bị cắt giữa dòng');
    if (t.t === 'num') {
      this.p++;
      return { k: 'num', v: Number(t.v), float: !!t.float };
    }
    if (t.t === 'str') {
      this.p++;
      return { k: 'str', v: t.v };
    }
    if (t.t === 'chr') {
      this.p++;
      return { k: 'chr', v: t.v };
    }
    if (t.t === 'id') {
      this.p++;
      let name = t.v;
      while (this.isOp('::')) {
        this.p++;
        const n = this.peek();
        if (n && n.t === 'id') {
          name = n.v;
          this.p++;
        } else break;
      }
      if (this.isOp('<') && TEMPLATE_NAMES.includes(name)) this.skipTemplateArgs();
      return { k: 'id', name };
    }
    if (t.t === 'op' && t.v === '(') {
      this.p++;
      const e = this.assign();
      this.expect(')');
      return e;
    }
    throw new Unsupported(`không hiểu ký hiệu "${t.v}"`);
  }
}

function parseExpression(src: string): Expr {
  const p = new Parser(lex(src));
  const e = p.parseExpr();
  return e;
}

// ── Tiện ích giá trị ──────────────────────────

function toNum(v: Val): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v instanceof Chr) return v.c ? v.c.charCodeAt(0) : 0;
  if (typeof v === 'string') {
    const n = Number(v);
    if (v.trim() !== '' && !Number.isNaN(n)) return n;
    throw new Unsupported(`không đổi xâu "${v}" thành số được`);
  }
  throw new Unsupported('không đổi mảng thành số được');
}

function truthy(v: Val): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (v instanceof Chr) return v.c !== '' && v.c !== '\0';
  if (typeof v === 'string') return v.length > 0;
  return true;
}

/** In giá trị theo lối `cout` của C++ */
function fmt(v: Val): string {
  if (typeof v === 'number') {
    return Number.isInteger(v) ? String(v) : String(Number(v.toPrecision(6)));
  }
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (v instanceof Chr) return v.c;
  if (typeof v === 'string') return v;
  return v.map(fmt).join(' ');
}

/** Hiện giá trị trong bảng theo dõi biến */
function display(v: Val): string {
  if (typeof v === 'string') return `"${v}"`;
  if (v instanceof Chr) return `'${v.c}'`;
  if (Array.isArray(v)) {
    // Mảng hai chiều: liệt kê từng ô sẽ tràn màn hình, chỉ nói kích thước.
    const first = v.find((x) => x !== undefined);
    if (Array.isArray(first)) return `bảng ${v.length}×${first.length}`;
    const head = v.slice(0, 10).map((x) => (x === undefined ? '·' : fmt(x)));
    return `[${head.join(',')}${v.length > 10 ? ',…' : ''}]`;
  }
  return fmt(v);
}

function defaultOf(t: CType): Val {
  if (t === 'string') return '';
  if (t === 'char') return new Chr('');
  if (t === 'bool') return false;
  if (t === 'array' || t === 'vector') return [];
  return 0;
}

function coerce(t: CType, v: Val): Val {
  if (t === 'int') return Math.trunc(toNum(v));
  if (t === 'double') return toNum(v);
  if (t === 'bool') return truthy(v);
  if (t === 'char') return v instanceof Chr ? v : new Chr(fmt(v).slice(0, 1));
  if (t === 'string') return fmt(v);
  return v;
}

// ── Ô nhớ ghi được (lvalue) ───────────────────

type LV =
  | { kind: 'var'; name: string; cell: Cell }
  | { kind: 'elem'; arr: Val[]; idx: number; elem: CType }
  /** `s[i]` của `string` — C++ cho phép GHI vào đây, nên phải cắt ghép lại xâu */
  | { kind: 'char'; base: LV; idx: number };

function lvElem(lv: LV): CType {
  if (lv.kind === 'var') return lv.cell.elem;
  if (lv.kind === 'elem') return lv.elem;
  return 'char';
}

function lvGet(lv: LV): Val {
  if (lv.kind === 'var') return lv.cell.value;
  if (lv.kind === 'elem') {
    const v = lv.arr[lv.idx];
    return v === undefined ? defaultOf(lv.elem) : v;
  }
  const s = lvGet(lv.base);
  if (typeof s !== 'string') throw new Unsupported('lấy ký tự của thứ không phải xâu');
  return new Chr(s[lv.idx] ?? '');
}

/** Ghi thẳng, không ép kiểu — dùng khi tự tạo mảng con cho mảng hai chiều */
function lvSetRaw(lv: LV, v: Val): void {
  if (lv.kind === 'var') lv.cell.value = v;
  else if (lv.kind === 'elem') lv.arr[lv.idx] = v;
  else throw new Unsupported('không ghi được vào ký tự này');
}

function lvSet(lv: LV, v: Val): Val {
  if (lv.kind === 'var') {
    lv.cell.value = coerce(lv.cell.type, v);
    return lv.cell.value;
  }
  if (lv.kind === 'elem') {
    const nv = coerce(lv.elem, v);
    lv.arr[lv.idx] = nv;
    return nv;
  }
  const s = lvGet(lv.base);
  if (typeof s !== 'string') throw new Unsupported('không ghi được ký tự vào thứ không phải xâu');
  if (lv.idx < 0 || lv.idx >= s.length) throw new Unsupported('ghi ký tự ra ngoài xâu');
  const ch = fmt(v).slice(0, 1) || '\0';
  lvSetRaw(lv.base, s.slice(0, lv.idx) + ch + s.slice(lv.idx + 1));
  return new Chr(ch);
}

// ── Trạng thái máy ảo ─────────────────────────

/** `break` / `continue` / `return` được truyền bằng ngoại lệ, gọn hơn cờ trạng thái */
class BreakSig extends Error {}
class ContinueSig extends Error {}
class ReturnSig extends Error {}
/** Hết ngân sách bước — dừng êm, không phải lỗi */
class Budget extends Error {}

const MAX_STEPS = 220;
const MAX_OPS = 60000;

interface LoopFrame {
  /** Tên biến đếm của vòng lặp, để hiện `i = …` ở thanh theo dõi */
  varName?: string;
}

interface State {
  env: Env;
  reader: Reader;
  steps: SimulationStep[];
  /** Toàn bộ nội dung đã in ra */
  out: string;
  ops: number;
  loops: LoopFrame[];
  /**
   * Tên biến xâu/mảng đang là "nhân vật chính" của bài — dùng để vẽ dãy ô nhớ và
   * lấy `s[i]`. Suy ra từ dữ liệu vào, không gán cứng theo tên bài.
   */
  focus?: string;
  /** Biến vừa bị câu lệnh hiện tại thay đổi — cột "Biến theo dõi" */
  touched: string[];
  truncated: boolean;
  /** `cout << fixed << setprecision(2)` — trạng thái in số thực */
  fixed: boolean;
  prec: number;
  /**
   * Mã nguồn gốc, dùng để biết code có thật sự truy cập `xâu[biến_lặp]` hay
   * không. Thiếu kiểm tra này, thanh theo dõi hiện `s[i] = 'b'` ngay cả trong
   * vòng lặp `do { dem--; } while (dem > 0)` — nơi `dem` chẳng liên quan gì tới
   * xâu, khiến học sinh hiểu sai là thuật toán đang duyệt ký tự.
   */
  src: string;
}

// ── Tính biểu thức ────────────────────────────

/**
 * `float` đi kèm giá trị vì C++ phân biệt `7/2 = 3` (số nguyên) với `7.0/2 = 3.5`.
 * Nếu chỉ nhìn giá trị JS thì `7.0` cũng là số nguyên nên phép chia sẽ sai.
 */
interface EV {
  v: Val;
  float: boolean;
}

const INT = (v: Val): EV => ({ v, float: false });
const FLT = (v: number): EV => ({ v, float: true });

function isText(v: Val): boolean {
  return typeof v === 'string';
}

/** So sánh theo lối C++: xâu/ký tự so theo từ điển, còn lại so theo số */
function cmp(a: Val, b: Val): number {
  const at = typeof a === 'string' || a instanceof Chr;
  const bt = typeof b === 'string' || b instanceof Chr;
  if (at && bt) {
    const x = a instanceof Chr ? a.c : (a as string);
    const y = b instanceof Chr ? b.c : (b as string);
    return x < y ? -1 : x > y ? 1 : 0;
  }
  const x = toNum(a);
  const y = toNum(b);
  return x < y ? -1 : x > y ? 1 : 0;
}

function binApply(op: string, a: EV, b: EV): EV {
  switch (op) {
    case '+':
      // `res + s[i]` là nối xâu, `s[i] + 1` là phép cộng số — khác nhau ở đây.
      if (isText(a.v) || isText(b.v)) return INT(fmt(a.v) + fmt(b.v));
      return { v: toNum(a.v) + toNum(b.v), float: a.float || b.float };
    case '-':
      return { v: toNum(a.v) - toNum(b.v), float: a.float || b.float };
    case '*':
      return { v: toNum(a.v) * toNum(b.v), float: a.float || b.float };
    case '/': {
      const d = toNum(b.v);
      if (d === 0) throw new Unsupported('chia cho 0');
      const q = toNum(a.v) / d;
      return a.float || b.float ? FLT(q) : INT(Math.trunc(q));
    }
    case '%': {
      const d = toNum(b.v);
      if (d === 0) throw new Unsupported('lấy dư cho 0');
      return INT(Math.trunc(toNum(a.v)) % Math.trunc(d));
    }
    case '<':
      return INT(cmp(a.v, b.v) < 0);
    case '>':
      return INT(cmp(a.v, b.v) > 0);
    case '<=':
      return INT(cmp(a.v, b.v) <= 0);
    case '>=':
      return INT(cmp(a.v, b.v) >= 0);
    case '==':
      return INT(cmp(a.v, b.v) === 0);
    case '!=':
      return INT(cmp(a.v, b.v) !== 0);
    case '&':
      return INT(Math.trunc(toNum(a.v)) & Math.trunc(toNum(b.v)));
    case '|':
      return INT(Math.trunc(toNum(a.v)) | Math.trunc(toNum(b.v)));
    case '^':
      return INT(Math.trunc(toNum(a.v)) ^ Math.trunc(toNum(b.v)));
    case '<<':
      return INT(Math.trunc(toNum(a.v)) << Math.trunc(toNum(b.v)));
    case '>>':
      return INT(Math.trunc(toNum(a.v)) >> Math.trunc(toNum(b.v)));
    default:
      throw new Unsupported(`chưa hỗ trợ phép "${op}"`);
  }
}

/** Tên biến gốc của một biểu thức truy cập (`a[i][j]` → `a`) */
function rootName(e: Expr): string | undefined {
  if (e.k === 'id') return e.name;
  if (e.k === 'index') return rootName(e.obj);
  if (e.k === 'member') return rootName(e.obj);
  return undefined;
}

function resolveLV(e: Expr, st: State): LV {
  if (e.k === 'id') {
    const cell = st.env.get(e.name);
    if (!cell) throw new Unsupported(`biến "${e.name}" chưa được khai báo`);
    return { kind: 'var', name: e.name, cell };
  }
  if (e.k === 'index') {
    const base = resolveLV(e.obj, st);
    const idx = Math.trunc(toNum(ev(e.idx, st).v));
    if (idx < 0) throw new Unsupported('chỉ số âm');
    const cur = lvGet(base);
    if (typeof cur === 'string') return { kind: 'char', base, idx };
    if (Array.isArray(cur)) return { kind: 'elem', arr: cur, idx, elem: lvElem(base) };
    // Mảng nhiều chiều: hàng chưa có nội dung thì tạo hàng mới rồi ghi vào.
    const fresh: Val[] = [];
    lvSetRaw(base, fresh);
    return { kind: 'elem', arr: fresh, idx, elem: lvElem(base) };
  }
  throw new Unsupported('vế trái của phép gán không phải biến hay phần tử mảng');
}

/** Cố lấy ô nhớ ghi được; trả `undefined` nếu biểu thức chỉ là giá trị tạm */
function lvTry(e: Expr, st: State): LV | undefined {
  if (e.k !== 'id' && e.k !== 'index') return undefined;
  try {
    return resolveLV(e, st);
  } catch (err) {
    if (err instanceof Unsupported) return undefined;
    throw err;
  }
}

function floatOfCell(c: Cell): boolean {
  return c.type === 'double' || (c.type !== 'int' && c.elem === 'double');
}

const CONSTS: Record<string, EV> = {
  true: INT(true),
  false: INT(false),
  // `string::npos` → bộ phân tích thu về `npos`. Cho bằng -1 để so sánh với giá
  // trị trả về của `find` (cũng -1) luôn đúng như C++.
  npos: INT(-1),
  endl: INT('\n'),
  INT_MAX: INT(2147483647),
  INT_MIN: INT(-2147483648),
  LLONG_MAX: INT(Number.MAX_SAFE_INTEGER),
  LLONG_MIN: INT(-Number.MAX_SAFE_INTEGER),
};

function ev(e: Expr, st: State): EV {
  st.ops++;
  if (st.ops > MAX_OPS) throw new Budget('chương trình chạy quá lâu để mô phỏng');

  switch (e.k) {
    case 'num':
      return { v: e.v, float: e.float };
    case 'str':
      return INT(e.v);
    case 'chr':
      return INT(new Chr(e.v));

    case 'id': {
      const cell = st.env.get(e.name);
      if (cell) return { v: cell.value, float: floatOfCell(cell) };
      const c = CONSTS[e.name];
      if (c) return c;
      throw new Unsupported(`biến "${e.name}" chưa được khai báo`);
    }

    case 'bin': {
      if (e.op === '&&') {
        const l = ev(e.l, st);
        if (!truthy(l.v)) return INT(false);
        return INT(truthy(ev(e.r, st).v));
      }
      if (e.op === '||') {
        const l = ev(e.l, st);
        if (truthy(l.v)) return INT(true);
        return INT(truthy(ev(e.r, st).v));
      }
      return binApply(e.op, ev(e.l, st), ev(e.r, st));
    }

    case 'un': {
      // `&x` (địa chỉ) và `*p` được xem như chính toán hạng: chương trình luyện
      // thi hầu như chỉ dùng chúng ở `scanf("%d", &n)`.
      if (e.op === '&' || e.op === '*') return ev(e.e, st);
      const x = ev(e.e, st);
      if (e.op === '!') return INT(!truthy(x.v));
      if (e.op === '-') return { v: -toNum(x.v), float: x.float };
      if (e.op === '+') return { v: toNum(x.v), float: x.float };
      return INT(~Math.trunc(toNum(x.v)));
    }

    case 'pre': {
      const lv = resolveLV(e.e, st);
      const cur = ev(e.e, st);
      const nv = binApply(e.op === '++' ? '+' : '-', cur, INT(1));
      const out = lvSet(lv, nv.v);
      note(st, e.e);
      return { v: out, float: cur.float };
    }

    case 'post': {
      const lv = resolveLV(e.e, st);
      const cur = ev(e.e, st);
      const nv = binApply(e.op === '++' ? '+' : '-', cur, INT(1));
      lvSet(lv, nv.v);
      note(st, e.e);
      return cur;
    }

    case 'assign': {
      const lv = resolveLV(e.target, st);
      const rhs = ev(e.e, st);
      const val =
        e.op === '='
          ? rhs
          : binApply(e.op.slice(0, 1), ev(e.target, st), rhs);
      const out = lvSet(lv, val.v);
      note(st, e.target);
      return { v: out, float: val.float };
    }

    case 'index': {
      const lv = resolveLV(e, st);
      const v = lvGet(lv);
      return { v, float: lvElem(lv) === 'double' };
    }

    case 'cond':
      return truthy(ev(e.c, st).v) ? ev(e.a, st) : ev(e.b, st);

    case 'cast': {
      const x = ev(e.e, st);
      if (e.type === 'double' || e.type === 'float') return FLT(toNum(x.v));
      if (e.type === 'char') return INT(coerce('char', x.v));
      if (e.type === 'string') return INT(fmt(x.v));
      if (e.type === 'bool') return INT(truthy(x.v));
      return INT(Math.trunc(toNum(x.v)));
    }

    case 'call':
      return callExpr(e, st);

    case 'member':
      // `.first` / `.second` của `pair` chưa nằm trong phạm vi thông dịch.
      throw new Unsupported(`chưa hỗ trợ truy cập thành phần ".${e.name}"`);
  }
}

/** Ghi nhận biến vừa bị thay đổi để hiện ở thanh theo dõi biến */
function note(st: State, target: Expr): void {
  const n = rootName(target);
  if (n && !st.touched.includes(n)) st.touched.push(n);
}

// ── Sắp xếp / đảo trên khoảng ─────────────────

interface Range {
  arr: Val[];
  idx: number;
}

/** Hiểu `v.begin()`, `v.end()`, `a`, `a + 1`, `a + n`, `v.end() - 1` */
function rangeOf(e: Expr, st: State): Range {
  if (e.k === 'bin' && (e.op === '+' || e.op === '-')) {
    const base = rangeOf(e.l, st);
    const d = Math.trunc(toNum(ev(e.r, st).v));
    return { arr: base.arr, idx: base.idx + (e.op === '+' ? d : -d) };
  }
  if (e.k === 'call' && e.fn.k === 'member' && (e.fn.name === 'begin' || e.fn.name === 'end')) {
    const v = valueOf(e.fn.obj, st);
    if (!Array.isArray(v)) throw new Unsupported('khoảng lặp không phải mảng/vector');
    return { arr: v, idx: e.fn.name === 'begin' ? 0 : v.length };
  }
  if (e.k === 'id' || e.k === 'index') {
    const v = valueOf(e, st);
    if (!Array.isArray(v)) throw new Unsupported('khoảng lặp không phải mảng/vector');
    return { arr: v, idx: 0 };
  }
  throw new Unsupported('chưa hiểu khoảng dữ liệu truyền vào');
}

function valueOf(e: Expr, st: State): Val {
  const lv = lvTry(e, st);
  return lv ? lvGet(lv) : ev(e, st).v;
}

/** `sort(s.begin(), s.end())` trên `string`: LV của xâu để ghi lại sau khi xếp */
function stringTarget(e: Expr, st: State): LV | undefined {
  const inner =
    e.k === 'call' && e.fn.k === 'member' && (e.fn.name === 'begin' || e.fn.name === 'end')
      ? e.fn.obj
      : undefined;
  if (!inner) return undefined;
  const lv = lvTry(inner, st);
  if (lv && typeof lvGet(lv) === 'string') return lv;
  return undefined;
}

/** `greater<int>()` → xếp giảm dần; không có tham số thứ ba → tăng dần */
function isDescending(cmpArg: Expr | undefined): boolean {
  if (!cmpArg) return false;
  const name =
    cmpArg.k === 'call' && cmpArg.fn.k === 'id'
      ? cmpArg.fn.name
      : cmpArg.k === 'id'
        ? cmpArg.name
        : undefined;
  if (name === 'greater') return true;
  if (name === 'less') return false;
  throw new Unsupported('chưa hỗ trợ hàm so sánh tự viết khi sắp xếp');
}

function sortCall(args: Expr[], st: State): void {
  if (args.length < 2) throw new Unsupported('sort thiếu tham số');
  const desc = isDescending(args[2]);
  const target = stringTarget(args[0], st);
  if (target) {
    const s = lvGet(target) as string;
    const chars = s.split('').sort();
    if (desc) chars.reverse();
    lvSetRaw(target, chars.join(''));
    return;
  }
  const a = rangeOf(args[0], st);
  const b = rangeOf(args[1], st);
  const part = a.arr.slice(a.idx, b.idx).sort((x, y) => cmp(x, y));
  if (desc) part.reverse();
  for (let k = 0; k < part.length; k++) a.arr[a.idx + k] = part[k];
}

function reverseCall(args: Expr[], st: State): void {
  const target = stringTarget(args[0], st);
  if (target) {
    const s = lvGet(target) as string;
    lvSetRaw(target, s.split('').reverse().join(''));
    return;
  }
  const a = rangeOf(args[0], st);
  const b = rangeOf(args[1], st);
  const part = a.arr.slice(a.idx, b.idx).reverse();
  for (let k = 0; k < part.length; k++) a.arr[a.idx + k] = part[k];
}

// ── Gọi hàm ───────────────────────────────────

/** Hàm toán một tham số, luôn trả số thực */
const MATH1: Record<string, (x: number) => number> = {
  sqrt: Math.sqrt,
  fabs: Math.abs,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  log: Math.log,
  log2: Math.log2,
  log10: Math.log10,
  exp: Math.exp,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
};

const CHAR_TESTS: Record<string, (c: string) => boolean> = {
  isdigit: (c) => /^[0-9]$/.test(c),
  isalpha: (c) => /^[A-Za-z]$/.test(c),
  isalnum: (c) => /^[0-9A-Za-z]$/.test(c),
  isupper: (c) => /^[A-Z]$/.test(c),
  islower: (c) => /^[a-z]$/.test(c),
  isspace: (c) => /^[ \t\n\r\f\v]$/.test(c),
  ispunct: (c) => /^[!-/:-@[-`{-~]$/.test(c),
};

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.trunc(a));
  let y = Math.abs(Math.trunc(b));
  while (y) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

type CallExpr = Extract<Expr, { k: 'call' }>;

function callExpr(e: CallExpr, st: State): EV {
  if (e.fn.k === 'member') return callMethod(e.fn.obj, e.fn.name, e.args, st);
  if (e.fn.k !== 'id') throw new Unsupported('chưa hỗ trợ cách gọi hàm này');
  return callFree(e.fn.name, e.args, st);
}

function callFree(name: string, args: Expr[], st: State): EV {
  switch (name) {
    case 'max':
    case 'min': {
      const xs = args.map((a) => ev(a, st));
      if (xs.length < 2) throw new Unsupported(`hàm ${name} cần hai tham số`);
      const best = xs.reduce((acc, cur) => {
        const c = cmp(cur.v, acc.v);
        return (name === 'max' ? c > 0 : c < 0) ? cur : acc;
      });
      return { v: best.v, float: xs.some((x) => x.float) };
    }

    case 'abs': {
      const x = ev(args[0], st);
      return { v: Math.abs(toNum(x.v)), float: x.float };
    }

    case 'pow':
      return FLT(Math.pow(toNum(ev(args[0], st).v), toNum(ev(args[1], st).v)));

    case '__gcd':
      return INT(gcd(toNum(ev(args[0], st).v), toNum(ev(args[1], st).v)));

    case 'to_string':
      return INT(fmt(ev(args[0], st).v));

    case 'stoi':
    case 'stoll':
    case 'atoi': {
      const n = parseInt(fmt(ev(args[0], st).v).trim(), 10);
      if (Number.isNaN(n)) throw new Unsupported('stoi trên xâu không phải số');
      return INT(n);
    }

    case 'stod':
    case 'stof':
    case 'atof': {
      const n = parseFloat(fmt(ev(args[0], st).v).trim());
      if (Number.isNaN(n)) throw new Unsupported('stod trên xâu không phải số');
      return FLT(n);
    }

    case 'swap': {
      const l1 = resolveLV(args[0], st);
      const l2 = resolveLV(args[1], st);
      const a1 = lvGet(l1);
      const a2 = lvGet(l2);
      lvSet(l1, a2);
      lvSet(l2, a1);
      note(st, args[0]);
      note(st, args[1]);
      return INT(0);
    }

    case 'sort':
      sortCall(args, st);
      note(st, args[0]);
      return INT(0);

    case 'reverse':
      reverseCall(args, st);
      note(st, args[0]);
      return INT(0);

    default:
      return callFree2(name, args, st);
  }
}

/** Phần còn lại của thư viện chuẩn, tách ra cho dễ đọc */
function callFree2(name: string, args: Expr[], st: State): EV {
  if (CHAR_TESTS[name]) {
    const v = ev(args[0], st).v;
    const c = v instanceof Chr ? v.c : fmt(v).slice(0, 1);
    return INT(CHAR_TESTS[name](c) ? 1 : 0);
  }

  // C++ trả về `int`, nhưng học sinh luôn dùng như ký tự (`s[i] = toupper(s[i])`).
  // Trả về `char` để bảng theo dõi và kết quả in ra đọc được.
  if (name === 'toupper' || name === 'tolower') {
    const v = ev(args[0], st).v;
    const c = v instanceof Chr ? v.c : fmt(v).slice(0, 1);
    return INT(new Chr(name === 'toupper' ? c.toUpperCase() : c.toLowerCase()));
  }

  if (MATH1[name]) return FLT(MATH1[name](toNum(ev(args[0], st).v)));

  switch (name) {
    case 'getline': {
      // `getline(cin, s)` — tham số đầu là luồng vào, không phải giá trị.
      const lv = resolveLV(args[1], st);
      try {
        lvSet(lv, st.reader.line());
      } catch (err) {
        if (err instanceof OutOfInput) return INT(false);
        throw err;
      }
      note(st, args[1]);
      return INT(true);
    }

    case 'fill': {
      const a = rangeOf(args[0], st);
      const b = rangeOf(args[1], st);
      const v = ev(args[2], st).v;
      for (let k = a.idx; k < b.idx; k++) a.arr[k] = v;
      note(st, args[0]);
      return INT(0);
    }

    case 'memset': {
      // `memset(a, 0, sizeof(a))`: ô chưa gán vốn đã mang giá trị mặc định 0,
      // nên chỉ cần xoá phần đã dùng.
      const v = ev(args[1], st).v;
      const target = valueOf(args[0], st);
      if (Array.isArray(target)) {
        for (let k = 0; k < target.length; k++) target[k] = toNum(v);
      }
      note(st, args[0]);
      return INT(0);
    }

    case 'accumulate': {
      const a = rangeOf(args[0], st);
      const b = rangeOf(args[1], st);
      let acc = args[2] ? ev(args[2], st) : INT(0);
      for (let k = a.idx; k < b.idx; k++) {
        acc = binApply('+', acc, INT(a.arr[k] ?? 0));
      }
      return acc;
    }

    case 'count': {
      const a = rangeOf(args[0], st);
      const b = rangeOf(args[1], st);
      const x = ev(args[2], st).v;
      let c = 0;
      for (let k = a.idx; k < b.idx; k++) if (cmp(a.arr[k] ?? 0, x) === 0) c++;
      return INT(c);
    }

    case 'size':
      return INT(lenOf(valueOf(args[0], st)));

    default:
      throw new Unsupported(`chưa hỗ trợ hàm "${name}()"`);
  }
}

function lenOf(v: Val): number {
  if (typeof v === 'string') return v.length;
  if (Array.isArray(v)) return v.length;
  throw new Unsupported('lấy độ dài của thứ không phải xâu/mảng');
}

// ── Phương thức của string / vector ───────────

/** Có phải một "con trỏ vị trí" kiểu `v.begin() + i`? Nếu có, trả về vị trí. */
function iterIndex(e: Expr, st: State): number | undefined {
  const hasIter = (x: Expr): boolean => {
    if (x.k === 'call' && x.fn.k === 'member') return x.fn.name === 'begin' || x.fn.name === 'end';
    if (x.k === 'bin') return hasIter(x.l) || hasIter(x.r);
    return false;
  };
  if (!hasIter(e)) return undefined;
  return rangeOf(e, st).idx;
}

function callMethod(objExpr: Expr, name: string, args: Expr[], st: State): EV {
  const lv = lvTry(objExpr, st);
  const cur = lv ? lvGet(lv) : ev(objExpr, st).v;

  if (name === 'size' || name === 'length') return INT(lenOf(cur));
  if (name === 'empty') return INT(lenOf(cur) === 0);
  if (name === 'c_str' || name === 'data') return INT(cur);

  if (MUTATORS.has(name)) note(st, objExpr);
  if (typeof cur === 'string') return stringMethod(lv, cur, name, args, st);
  if (Array.isArray(cur)) return arrayMethod(lv, cur, name, args, st);
  throw new Unsupported(`chưa hỗ trợ phương thức ".${name}()" trên giá trị này`);
}

function stringMethod(
  lv: LV | undefined,
  s: string,
  name: string,
  args: Expr[],
  st: State,
): EV {
  const num = (k: number): number => Math.trunc(toNum(ev(args[k], st).v));
  const text = (k: number): string => fmt(ev(args[k], st).v);
  const write = (next: string): EV => {
    if (!lv) throw new Unsupported(`".${name}()" cần một biến xâu để ghi lại`);
    lvSetRaw(lv, next);
    return INT(next);
  };

  switch (name) {
    case 'substr':
      return INT(args.length >= 2 ? s.substr(num(0), num(1)) : s.substr(num(0)));
    case 'find': {
      const at = s.indexOf(text(0), args.length >= 2 ? num(1) : 0);
      return INT(at);
    }
    case 'rfind':
      return INT(s.lastIndexOf(text(0)));
    case 'at':
      return INT(new Chr(s[num(0)] ?? ''));
    case 'front':
      return INT(new Chr(s[0] ?? ''));
    case 'back':
      return INT(new Chr(s[s.length - 1] ?? ''));
    case 'erase': {
      if (args.length === 0) return write('');
      const it = iterIndex(args[0], st);
      const pos = it ?? num(0);
      const len = it !== undefined ? 1 : args.length >= 2 ? num(1) : s.length - pos;
      return write(s.slice(0, pos) + s.slice(pos + len));
    }
    case 'insert': {
      const it = iterIndex(args[0], st);
      const pos = it ?? num(0);
      return write(s.slice(0, pos) + text(1) + s.slice(pos));
    }
    case 'replace': {
      const pos = num(0);
      const len = num(1);
      return write(s.slice(0, pos) + text(2) + s.slice(pos + len));
    }
    case 'push_back':
    case 'append':
      return write(s + text(0));
    case 'pop_back':
      return write(s.slice(0, -1));
    case 'clear':
      return write('');
    case 'resize': {
      const n = num(0);
      const pad = args.length >= 2 ? text(1) : ' ';
      return write(n <= s.length ? s.slice(0, n) : s + pad.repeat(n - s.length));
    }
    case 'compare':
      return INT(cmp(s, text(0)));
    default:
      throw new Unsupported(`chưa hỗ trợ ".${name}()" của string`);
  }
}

function arrayMethod(
  lv: LV | undefined,
  arr: Val[],
  name: string,
  args: Expr[],
  st: State,
): EV {
  const elem: CType = lv ? lvElem(lv) : 'int';
  const num = (k: number): number => Math.trunc(toNum(ev(args[k], st).v));

  switch (name) {
    case 'push_back':
    case 'emplace_back':
      arr.push(coerce(elem, ev(args[0], st).v));
      return INT(0);
    case 'pop_back':
      arr.pop();
      return INT(0);
    case 'front':
      return INT(arr[0] ?? defaultOf(elem));
    case 'back':
      return INT(arr[arr.length - 1] ?? defaultOf(elem));
    case 'at':
      return INT(arr[num(0)] ?? defaultOf(elem));
    case 'clear':
      arr.length = 0;
      return INT(0);
    case 'resize': {
      const n = num(0);
      const pad = args.length >= 2 ? coerce(elem, ev(args[1], st).v) : defaultOf(elem);
      while (arr.length < n) arr.push(pad);
      arr.length = n;
      return INT(0);
    }
    case 'assign': {
      const n = num(0);
      const v = coerce(elem, ev(args[1], st).v);
      arr.length = 0;
      for (let k = 0; k < n; k++) arr.push(v);
      return INT(0);
    }
    case 'erase': {
      const from = iterIndex(args[0], st) ?? num(0);
      const to = args.length >= 2 ? (iterIndex(args[1], st) ?? num(1)) : from + 1;
      arr.splice(from, Math.max(0, to - from));
      return INT(0);
    }
    case 'insert': {
      const at = iterIndex(args[0], st) ?? num(0);
      arr.splice(at, 0, coerce(elem, ev(args[1], st).v));
      return INT(0);
    }
    default:
      throw new Unsupported(`chưa hỗ trợ ".${name}()" của vector/mảng`);
  }
}

/** Phương thức làm thay đổi dữ liệu — cần ghi vào danh sách biến theo dõi */
const MUTATORS = new Set([
  'push_back', 'emplace_back', 'pop_back', 'clear', 'resize', 'assign',
  'erase', 'insert', 'replace', 'append', 'sort',
]);

// ── Khai báo biến ─────────────────────────────

/** Cắt theo dấu phân cách ở độ sâu ngoặc 0, bỏ qua nội dung xâu/ký tự */
function splitTop(src: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'") {
      const q = c;
      cur += c;
      i++;
      while (i < src.length && src[i] !== q) {
        if (src[i] === '\\') {
          cur += src[i];
          i++;
        }
        cur += src[i];
        i++;
      }
      cur += q;
      continue;
    }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    if (c === sep && depth === 0) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

const TYPE_MAP: Record<string, CType> = {
  int: 'int',
  long: 'int',
  short: 'int',
  ll: 'int',
  lli: 'int',
  ull: 'int',
  unsigned: 'int',
  signed: 'int',
  size_t: 'int',
  double: 'double',
  float: 'double',
  char: 'char',
  bool: 'bool',
  string: 'string',
};

interface DeclHead {
  base: CType;
  elem: CType;
  rest: string;
}

/** Tìm dấu đóng khớp với dấu mở ở vị trí 0 */
function matchClose(s: string, open: string, close: string): number {
  let depth = 0;
  for (let k = 0; k < s.length; k++) {
    if (s[k] === open) depth++;
    else if (s[k] === close) {
      depth--;
      if (depth === 0) return k;
    }
  }
  return -1;
}

/** Đọc phần kiểu ở đầu câu lệnh; `undefined` nghĩa là không phải khai báo */
function readDeclHead(text: string): DeclHead | undefined {
  let s = text.trim();
  for (;;) {
    const m = /^(const|static|register|volatile|unsigned|signed)\s+/.exec(s);
    if (!m) break;
    s = s.slice(m[0].length);
  }

  if (/^(vector|deque)\s*</.test(s)) {
    const open = s.indexOf('<');
    const end = matchClose(s.slice(open), '<', '>');
    if (end < 0) return undefined;
    const inner = s.slice(open + 1, open + end).trim();
    const elem: CType = /^(vector|deque)\s*</.test(inner)
      ? 'vector'
      : (readDeclHead(`${inner} _`)?.base ?? 'int');
    return { base: 'vector', elem, rest: s.slice(open + end + 1).trim() };
  }

  const tm = /^(long\s+long|long\s+double|[A-Za-z_]\w*)\s+/.exec(s);
  if (!tm) return undefined;
  const word = tm[1].trim().split(/\s+/).pop() as string;
  const base = TYPE_MAP[word];
  if (!base) return undefined;
  let rest = s.slice(tm[0].length);
  // `long long int x`, `unsigned long x` — nuốt hết các từ kiểu còn lại
  for (;;) {
    const m2 = /^(int|long|double|char|short|unsigned|signed)\s+/.exec(rest);
    if (!m2) break;
    rest = rest.slice(m2[0].length);
  }
  return { base, elem: base, rest: rest.trim() };
}

interface Declarator {
  name: string;
  dims: string[];
  ctor?: string[];
  init?: string;
}

function parseDeclarator(src: string): Declarator | undefined {
  let s = src.trim().replace(/^[*&\s]+/, '');
  const m = /^[A-Za-z_]\w*/.exec(s);
  if (!m) return undefined;
  const name = m[0];
  s = s.slice(m[0].length).trim();

  const dims: string[] = [];
  while (s.startsWith('[')) {
    const close = matchClose(s, '[', ']');
    if (close < 0) return undefined;
    dims.push(s.slice(1, close).trim());
    s = s.slice(close + 1).trim();
  }

  let ctor: string[] | undefined;
  if (s.startsWith('(')) {
    const close = matchClose(s, '(', ')');
    if (close < 0) return undefined;
    const inner = s.slice(1, close).trim();
    ctor = inner === '' ? [] : splitTop(inner, ',').map((x) => x.trim());
    s = s.slice(close + 1).trim();
  }

  let init: string | undefined;
  if (s.startsWith('=')) init = s.slice(1).trim();
  return { name, dims, ctor, init };
}

/** `{1, 2, 3}` → danh sách giá trị */
function braceList(src: string, st: State): Val[] {
  const inner = src.slice(1, matchClose(src, '{', '}')).trim();
  if (!inner) return [];
  return splitTop(inner, ',').map((x) => ev(parseExpression(x.trim()), st).v);
}

/** Mảng nhiều chiều: mỗi hàng phải là một mảng RIÊNG, không dùng chung */
function makeArray(size: number, fill: Val): Val[] {
  const out: Val[] = [];
  for (let k = 0; k < size; k++) out.push(Array.isArray(fill) ? fill.slice() : fill);
  return out;
}

/** Không tạo sẵn mảng triệu phần tử: ô chưa dùng vẫn trả giá trị mặc định */
const PREFILL_MAX = 5000;

function declareOne(head: DeclHead, d: Declarator, st: State): void {
  const size = (s: string): number =>
    s.trim() === '' ? 0 : Math.trunc(toNum(ev(parseExpression(s), st).v));

  if (head.base === 'vector') {
    let value: Val = [];
    if (d.ctor && d.ctor.length > 0) {
      const n = Math.min(size(d.ctor[0]), PREFILL_MAX);
      const fill = d.ctor[1]
        ? ev(parseExpression(d.ctor[1]), st).v
        : defaultOf(head.elem);
      value = makeArray(Math.max(0, n), fill);
    } else if (d.init && d.init.startsWith('{')) {
      value = braceList(d.init, st);
    }
    st.env.declare(d.name, { type: 'vector', elem: head.elem, value });
  } else if (d.dims.length > 0) {
    let value: Val[] = [];
    if (d.init && d.init.startsWith('{')) {
      value = braceList(d.init, st);
    } else if (d.dims.length === 1) {
      const n = size(d.dims[0]);
      value = n > 0 && n <= PREFILL_MAX ? makeArray(n, defaultOf(head.base)) : [];
    } else {
      const n = size(d.dims[0]);
      const m = size(d.dims[1]);
      value =
        n > 0 && m > 0 && n * m <= 40000
          ? makeArray(n, makeArray(m, defaultOf(head.base)))
          : [];
    }
    st.env.declare(d.name, { type: 'array', elem: head.base, value });
  } else if (head.base === 'string' && d.ctor && d.ctor.length === 2) {
    // `string s(n, '0')` — xâu gồm n ký tự giống nhau
    const n = Math.max(0, Math.min(size(d.ctor[0]), PREFILL_MAX));
    const ch = fmt(ev(parseExpression(d.ctor[1]), st).v).slice(0, 1) || ' ';
    st.env.declare(d.name, { type: 'string', elem: 'string', value: ch.repeat(n) });
  } else {
    const value =
      d.init !== undefined
        ? coerce(head.base, ev(parseExpression(d.init), st).v)
        : d.ctor && d.ctor.length === 1
          ? coerce(head.base, ev(parseExpression(d.ctor[0]), st).v)
          : defaultOf(head.base);
    st.env.declare(d.name, { type: head.base, elem: head.base, value });
  }
  if (!st.touched.includes(d.name)) st.touched.push(d.name);
}

/** Thực hiện một câu lệnh khai báo; `false` nếu dòng này không phải khai báo */
function execDecl(line: string, st: State): boolean {
  const head = readDeclHead(line);
  if (!head || head.rest === '') return false;
  // `int f(int x)` — nguyên mẫu hàm, không phải biến
  if (/^[A-Za-z_]\w*\s*\([^)]*\b(int|long|double|char|bool|string)\b/.test(head.rest)) {
    throw new Unsupported('chương trình có hàm tự viết — chưa mô phỏng được');
  }
  for (const part of splitTop(head.rest, ',')) {
    const d = parseDeclarator(part);
    if (!d) throw new Unsupported(`chưa đọc được khai báo "${part.trim()}"`);
    declareOne(head, d, st);
  }
  return true;
}

// ── Nhập / xuất ───────────────────────────────

/** Đọc một giá trị từ test ví dụ vào ô nhớ, đúng kiểu của ô đó */
function readInto(lv: LV, st: State): void {
  const want = lv.kind === 'var' ? lv.cell.type : lvElem(lv);
  if (want === 'string' || want === 'array' || want === 'vector') {
    // `char s[100]; cin >> s;` — coi như một xâu, đúng cách học sinh dùng nó
    lvSetRaw(lv, st.reader.token());
    return;
  }
  if (want === 'char') {
    lvSet(lv, new Chr(st.reader.token().slice(0, 1)));
    return;
  }
  const raw = st.reader.token();
  const n = Number(raw);
  if (Number.isNaN(n)) throw new Unsupported(`dữ liệu vào "${raw}" không phải số`);
  lvSet(lv, want === 'int' ? Math.trunc(n) : n);
}

/** `cin >> n >> a[i];` */
function execCin(line: string, st: State): void {
  const parts = splitTop(line, '>').filter((x) => x.trim() !== '');
  // Sau khi cắt theo '>', chuỗi "cin >> n >> m" cho ra ['cin ', '', ' n ', '', ' m']
  const targets = parts.slice(1).map((x) => x.trim()).filter((x) => x !== '');
  if (targets.length === 0) throw new Unsupported('lệnh cin không có biến nào');
  for (const t of targets) {
    const lv = resolveLV(parseExpression(t), st);
    readInto(lv, st);
    const n = rootName(parseExpression(t));
    if (n && !st.touched.includes(n)) st.touched.push(n);
  }
}

/**
 * Ghép giá trị theo trạng thái `fixed`/`setprecision` đang bật.
 * Chỉ SỐ THỰC bị ảnh hưởng: `cout << fixed << setprecision(2) << 89` trong C++
 * vẫn in `89`, không phải `89.00`.
 */
function printVal(x: EV, st: State): string {
  if (typeof x.v === 'number' && x.float) {
    if (st.fixed) return x.v.toFixed(Math.max(0, st.prec < 0 ? 6 : st.prec));
    if (st.prec >= 0) return String(Number(x.v.toPrecision(Math.max(1, st.prec))));
  }
  return fmt(x.v);
}

/** `cout << "kq: " << x << endl;` */
function execCout(line: string, st: State): void {
  const parts = splitTop(line, '<').filter((x) => x.trim() !== '');
  for (const raw of parts.slice(1)) {
    const it = raw.trim();
    if (it === '') continue;
    if (it === 'endl' || it === 'flush') {
      st.out += '\n';
      continue;
    }
    if (it === 'fixed') {
      st.fixed = true;
      continue;
    }
    const sp = /^setprecision\s*\(([\s\S]*)\)$/.exec(it);
    if (sp) {
      st.prec = Math.trunc(toNum(ev(parseExpression(sp[1]), st).v));
      continue;
    }
    if (/^(setw|setfill)\s*\(/.test(it)) continue;
    st.out += printVal(ev(parseExpression(it), st), st);
  }
}

/** Bỏ lớp `&`/`*` để lấy đúng biến cần ghi */
function deref(e: Expr): Expr {
  return e.k === 'un' && (e.op === '&' || e.op === '*') ? deref(e.e) : e;
}

const PRINTF_SPEC = /%[-+ 0#]*\d*(?:\.\d+)?(?:ll|l|h)?[diufgGsceoxX%]/g;

function execPrintf(args: Expr[], st: State): void {
  const head = args[0];
  if (!head || head.k !== 'str') throw new Unsupported('printf cần xâu định dạng');
  let k = 1;
  st.out += head.v.replace(PRINTF_SPEC, (spec) => {
    if (spec.endsWith('%')) return '%';
    const a = args[k++];
    if (!a) return '';
    const v = ev(a, st).v;
    if (/[fgG]$/.test(spec)) {
      const p = /\.(\d+)/.exec(spec);
      return toNum(v).toFixed(p ? Number(p[1]) : 6);
    }
    if (spec.endsWith('s')) return fmt(v);
    if (spec.endsWith('c')) return v instanceof Chr ? v.c : fmt(v).slice(0, 1);
    return String(Math.trunc(toNum(v)));
  });
}

function execScanf(args: Expr[], st: State): void {
  const head = args[0];
  if (!head || head.k !== 'str') throw new Unsupported('scanf cần xâu định dạng');
  const specs = head.v.match(/%\d*(?:ll|l|h)?[diufgsc]/g) ?? [];
  for (let k = 0; k < specs.length; k++) {
    const a = args[k + 1];
    if (!a) break;
    const target = deref(a);
    const lv = resolveLV(target, st);
    if (specs[k].endsWith('c')) lvSet(lv, new Chr(st.reader.char()));
    else readInto(lv, st);
    note(st, target);
  }
}

// ── Phát ra từng bước cho giao diện ───────────

function shorten(s: string, n = 26): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

/** Bọc tên biến để ghép an toàn vào biểu thức chính quy */
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * "Nhân vật chính" của bài: xâu dữ liệu vào (ưu tiên) hoặc mảng/vector đầu tiên
 * có dữ liệu. Nhờ vậy dãy ô nhớ dưới sơ đồ luôn là thứ học sinh cần nhìn, mà
 * không cần biết bài này tên gì.
 */
function focusOf(st: State): { name: string; cell: Cell } | undefined {
  let box: { name: string; cell: Cell } | undefined;
  for (const [name, cell] of st.env.all()) {
    if (cell.type === 'string' && typeof cell.value === 'string' && cell.value.length > 0) {
      return { name, cell };
    }
    if (
      !box &&
      (cell.type === 'array' || cell.type === 'vector') &&
      Array.isArray(cell.value) &&
      cell.value.length > 0
    ) {
      box = { name, cell };
    }
  }
  return box;
}

function memoryOf(st: State): { label: string; items: string[] } {
  const f = focusOf(st);
  if (!f) return { label: 'Bộ nhớ', items: [] };
  const v = f.cell.value;
  if (typeof v === 'string') {
    return { label: `Xâu ${f.name}`, items: v.slice(0, 24).split('') };
  }
  if (Array.isArray(v)) {
    return {
      label: `${f.cell.type === 'vector' ? 'Vector' : 'Mảng'} ${f.name}`,
      items: v.slice(0, 24).map((x) => (x === undefined ? '·' : fmt(x).slice(0, 3))),
    };
  }
  return { label: 'Bộ nhớ', items: [] };
}

function pickWatch(st: State, action = ''): { name: string; value: string } {
  for (const n of [...st.touched].reverse()) {
    const c = st.env.get(n);
    if (c) return { name: n, value: shorten(display(c.value)) };
  }
  const lv = st.loops[st.loops.length - 1]?.varName;
  if (lv) {
    const c = st.env.get(lv);
    if (c) return { name: lv, value: shorten(display(c.value)) };
  }
  // Không có biến nào vừa đổi (ví dụ câu lệnh `cout`): ưu tiên biến được nhắc
  // trong chính câu lệnh đó. Nếu bốc biến đầu tiên trong bộ nhớ thì bước in
  // `cout << "Max = " << mx` lại hiện `n = 5`, chẳng liên quan gì tới việc in.
  let first: { name: string; value: string } | undefined;
  for (const [n, c] of st.env.all()) {
    if (c.type === 'array' || c.type === 'vector') continue;
    const item = { name: n, value: shorten(display(c.value)) };
    if (!first) first = item;
    if (action && new RegExp(`\\b${escapeRe(n)}\\b`).test(action)) return item;
  }
  return first ?? { name: '—', value: '—' };
}

function emit(st: State, block: CppBlock, action: string, explanation: string): void {
  if (st.steps.length >= MAX_STEPS) {
    st.truncated = true;
    throw new Budget('đã đủ số bước để hiểu thuật toán');
  }
  const mem = memoryOf(st);
  const watch = pickWatch(st, action);
  const loopVar = st.loops[st.loops.length - 1]?.varName;
  const iCell = loopVar ? st.env.get(loopVar) : undefined;
  const i =
    iCell && typeof iCell.value === 'number' ? Math.trunc(iCell.value) : -1;
  const f = focusOf(st);
  const focusStr = f && typeof f.cell.value === 'string' ? f.cell.value : '';
  // Chỉ hiện ký tự đang xét khi code THẬT SỰ viết `s[i]` (hoặc `s.at(i)`,
  // `s[i + 1]`…) với đúng biến lặp hiện tại. Nếu không, ô `s[i]` là suy diễn
  // sai lệch nên để trống.
  const indexesFocus =
    !!f &&
    !!loopVar &&
    new RegExp(
      `\\b${escapeRe(f.name)}\\s*(\\[\\s*${escapeRe(loopVar)}\\b|\\.\\s*at\\s*\\(\\s*${escapeRe(loopVar)}\\b)`,
    ).test(st.src);
  const secondary =
    loopVar && loopVar !== watch.name && iCell
      ? { name: loopVar, value: display(iCell.value) }
      : undefined;

  st.steps.push({
    step: st.steps.length + 1,
    nodeId: block.nodeId ?? '',
    i,
    currentChar:
      indexesFocus && i >= 0 && i < focusStr.length ? focusStr[i] : '-',
    primaryVarName: watch.name,
    primaryVarValue: watch.value,
    secondaryVarName: secondary?.name,
    secondaryVarValue: secondary?.value,
    memoryItems: mem.items,
    memoryLabel: mem.label,
    action: shorten(action, 60),
    explanation,
    kind: 'values',
    printed: st.out,
  });
}

// ── Thực hiện câu lệnh ────────────────────────

/** Câu lệnh cấu hình luồng vào/ra — không ảnh hưởng thuật toán */
const IO_NOISE =
  /^(ios_base|ios::|std::ios|cout\s*\.\s*tie|cin\s*\.\s*tie|cin\s*\.\s*sync|sync_with_stdio|freopen|fclose|fflush|fopen|srand|setlocale|system\s*\(|return\b)/;

function execLine(raw: string, st: State): void {
  const line = raw.trim().replace(/;+$/, '').trim();
  if (!line) return;
  if (IO_NOISE.test(line)) return;

  const ig = /^cin\s*\.\s*(ignore|get)\s*\(/.exec(line);
  if (ig) {
    if (ig[1] === 'ignore') st.reader.ignoreLine();
    else st.reader.char();
    return;
  }
  if (/^cin\b/.test(line)) {
    execCin(line, st);
    return;
  }
  if (/^(cout|cerr|clog)\b/.test(line)) {
    execCout(line, st);
    return;
  }
  if (execDecl(line, st)) return;

  const e = parseExpression(line);
  if (e.k === 'call' && e.fn.k === 'id') {
    if (e.fn.name === 'printf') {
      execPrintf(e.args, st);
      return;
    }
    if (e.fn.name === 'scanf') {
      execScanf(e.args, st);
      return;
    }
    if (e.fn.name === 'puts') {
      st.out += `${fmt(ev(e.args[0], st).v)}\n`;
      return;
    }
  }
  ev(e, st);
}

/** Bỏ cặp ngoặc bao ngoài nếu có */
function stripParen(s: string): string {
  let t = s.trim();
  while (t.startsWith('(') && matchClose(t, '(', ')') === t.length - 1) {
    t = t.slice(1, -1).trim();
  }
  return t;
}

/** "s = "abc", i = 2" — mô tả các biến vừa thay đổi */
function describe(st: State, names: string[]): string {
  const parts: string[] = [];
  for (const n of names.slice(0, 3)) {
    const c = st.env.get(n);
    if (c) parts.push(`${n} = ${shorten(display(c.value), 20)}`);
  }
  return parts.join(', ');
}

type StmtBlock = Extract<CppBlock, { kind: 'stmt' }>;
type IfBlock = Extract<CppBlock, { kind: 'if' }>;
type LoopBlock = Extract<CppBlock, { kind: 'loop' }>;

function runStmt(b: StmtBlock, st: State): void {
  const text = b.text.trim();
  st.touched = [];

  if (b.role === 'jump') {
    if (/^break\b/.test(text)) {
      emit(st, b, 'break;', 'Thoát khỏi vòng lặp ngay lập tức');
      throw new BreakSig();
    }
    if (/^continue\b/.test(text)) {
      emit(st, b, 'continue;', 'Bỏ qua phần còn lại, sang lượt lặp kế tiếp');
      throw new ContinueSig();
    }
    return;
  }

  const before = st.out;
  for (const ln of b.text.split('\n')) execLine(ln, st);
  const printed = st.out.slice(before.length);
  const changed = describe(st, st.touched);

  let why: string;
  if (b.role === 'output') {
    why =
      printed.replace(/\n/g, '') === ''
        ? 'In ra một dòng trống (xuống dòng)'
        : `Đã in ra: "${printed.replace(/\n/g, '⏎')}"`;
  } else if (b.role === 'input') {
    why = changed ? `Đọc từ dữ liệu vào: ${changed}` : 'Đọc dữ liệu vào';
  } else if (b.role === 'decl') {
    why = changed ? `Khai báo: ${changed}` : 'Khai báo & khởi tạo biến';
  } else {
    why = changed ? `Cập nhật: ${changed}` : 'Thực hiện phép tính';
  }

  emit(st, b, text.replace(/\n/g, ' · '), shorten(why, 140));
}

function runIf(b: IfBlock, st: State): void {
  st.touched = [];
  const cond = stripParen(b.cond);
  const ok = truthy(ev(parseExpression(cond), st).v);
  emit(
    st,
    b,
    `if (${cond})`,
    `Xét điều kiện ${cond} → ${ok ? '✓ Đúng, đi vào nhánh này' : '✗ Sai, bỏ qua nhánh này'}`,
  );
  runList(ok ? b.then : b.else, st);
}

/** Tên biến đếm của `for (int i = 0; …)` hoặc `for (i = 0; …)` */
function loopVarOf(init: string): string | undefined {
  const head = readDeclHead(init);
  if (head) return parseDeclarator(splitTop(head.rest, ',')[0])?.name;
  const m = /^\s*([A-Za-z_]\w*)\s*=/.exec(init);
  return m ? m[1] : undefined;
}

/** Với `while (i < n)`, biến `i` chính là thứ cần hiện ở ô "i =" */
function guessLoopVar(cond: string, st: State): string | undefined {
  for (const id of cond.match(/[A-Za-z_]\w*/g) ?? []) {
    const c = st.env.get(id);
    if (c && c.type === 'int') return id;
  }
  return st.loops[st.loops.length - 1]?.varName;
}

/** `while (cin >> x)` vừa đọc dữ liệu vừa là điều kiện dừng */
function evalLoopCond(cond: string, st: State): boolean {
  const src = cond.trim();
  if (src === '') return true;
  if (/^cin\s*>>/.test(src)) {
    try {
      if (!st.reader.hasToken()) return false;
      execCin(src, st);
      return true;
    } catch (err) {
      if (err instanceof OutOfInput) return false;
      throw err;
    }
  }
  try {
    return truthy(ev(parseExpression(src), st).v);
  } catch (err) {
    if (err instanceof OutOfInput) return false;
    throw err;
  }
}

/** Chạy thân vòng lặp; trả `false` khi gặp `break` */
function runBody(body: CppBlock[], st: State): boolean {
  try {
    runList(body, st);
  } catch (err) {
    if (err instanceof BreakSig) return false;
    if (!(err instanceof ContinueSig)) throw err;
  }
  return true;
}

function runFor(b: LoopBlock, parts: string[], st: State): void {
  st.env.push();
  st.touched = [];
  try {
    if (parts[0].trim()) execLine(parts[0], st);
    st.loops.push({ varName: loopVarOf(parts[0]) });
    try {
      const cond = parts[1].trim();
      const step = parts.slice(2).join(';').trim();
      for (;;) {
        const ok = cond === '' ? true : truthy(ev(parseExpression(cond), st).v);
        emit(
          st,
          b,
          b.header,
          ok
            ? `Điều kiện ${cond || 'luôn đúng'} còn thoả → chạy một lượt lặp`
            : `Điều kiện ${cond} không còn thoả → kết thúc vòng lặp`,
        );
        if (!ok) break;
        if (!runBody(b.body, st)) break;
        st.touched = [];
        if (step) for (const s of splitTop(step, ',')) execLine(s, st);
      }
    } finally {
      st.loops.pop();
    }
  } finally {
    st.env.pop();
  }
}

function runWhile(b: LoopBlock, cond: string, st: State): void {
  st.loops.push({ varName: guessLoopVar(cond, st) });
  try {
    for (;;) {
      st.touched = [];
      const ok = evalLoopCond(cond, st);
      emit(
        st,
        b,
        b.header,
        ok
          ? `Điều kiện ${cond} còn thoả → chạy một lượt lặp`
          : `Điều kiện ${cond} không còn thoả → kết thúc vòng lặp`,
      );
      if (!ok) break;
      if (!runBody(b.body, st)) break;
    }
  } finally {
    st.loops.pop();
  }
}

function runDoWhile(b: LoopBlock, cond: string, st: State): void {
  st.loops.push({ varName: guessLoopVar(cond, st) });
  try {
    for (;;) {
      if (!runBody(b.body, st)) break;
      st.touched = [];
      const ok = evalLoopCond(cond, st);
      emit(
        st,
        b,
        b.header,
        ok
          ? `Kiểm tra sau thân vòng: ${cond} còn thoả → lặp lại`
          : `Kiểm tra sau thân vòng: ${cond} sai → kết thúc vòng lặp`,
      );
      if (!ok) break;
    }
  } finally {
    st.loops.pop();
  }
}

/** `for (char c : s)` — duyệt từng phần tử của xâu / mảng / vector */
function runRangeFor(b: LoopBlock, declPart: string, contPart: string, st: State): void {
  const container = valueOf(parseExpression(contPart.trim()), st);
  let items: Val[];
  if (typeof container === 'string') items = container.split('').map((c) => new Chr(c));
  else if (Array.isArray(container)) items = container.slice();
  else throw new Unsupported('for-range trên giá trị không duyệt được');

  const nameM = /([A-Za-z_]\w*)\s*$/.exec(declPart.trim());
  if (!nameM) throw new Unsupported('for-range thiếu tên biến');
  const name = nameM[1];
  const head = readDeclHead(`${declPart.trim()} `);
  const first = items[0];
  const type: CType = head
    ? head.base
    : first instanceof Chr
      ? 'char'
      : typeof first === 'string'
        ? 'string'
        : 'int';

  st.env.push();
  const cell: Cell = { type, elem: type, value: defaultOf(type) };
  st.env.declare(name, cell);
  st.loops.push({ varName: undefined });
  try {
    let broke = false;
    for (let k = 0; k < items.length; k++) {
      cell.value = items[k] === undefined ? defaultOf(type) : items[k];
      st.touched = [name];
      emit(st, b, b.header, `Lấy phần tử thứ ${k}: ${name} = ${display(cell.value)}`);
      if (!runBody(b.body, st)) {
        broke = true;
        break;
      }
    }
    if (!broke) {
      st.touched = [];
      emit(st, b, b.header, 'Đã duyệt hết dãy → kết thúc vòng lặp');
    }
  } finally {
    st.loops.pop();
    st.env.pop();
  }
}

function runLoop(b: LoopBlock, st: State): void {
  const inner = stripParen(b.header.replace(/^(for|while)\s*/, ''));
  if (b.loopKind === 'for') {
    const parts = splitTop(inner, ';');
    if (parts.length >= 3) {
      runFor(b, parts, st);
      return;
    }
    const rf = splitTop(inner, ':');
    if (rf.length === 2) {
      runRangeFor(b, rf[0], rf[1], st);
      return;
    }
    throw new Unsupported('vòng for có cú pháp chưa hỗ trợ');
  }
  if (b.loopKind === 'dowhile') runDoWhile(b, inner, st);
  else runWhile(b, inner, st);
}

function runBlock(b: CppBlock, st: State): void {
  st.ops++;
  if (st.ops > MAX_OPS) throw new Budget('chương trình chạy quá lâu để mô phỏng');
  if (b.kind === 'stmt') runStmt(b, st);
  else if (b.kind === 'if') runIf(b, st);
  else if (b.kind === 'loop') runLoop(b, st);
  else throw new Unsupported('chưa mô phỏng được switch…case');
}

function runList(list: CppBlock[], st: State): void {
  for (const b of list) runBlock(b, st);
}

// ── Đi bộ theo cấu trúc (khi không chạy thử được) ──

const ROLE_LABEL: Record<string, string> = {
  decl: 'Khai báo & khởi tạo biến',
  input: 'Đọc dữ liệu vào theo quy cách của đề',
  output: 'In kết quả ra',
  action: 'Xử lý / cập nhật giá trị',
  jump: 'Rẽ hướng điều khiển',
};

function structuralSteps(program: CppBlock[], reason: string): SimulationStep[] {
  const steps: SimulationStep[] = [];

  const push = (b: CppBlock, action: string, why: string): void => {
    if (steps.length >= MAX_STEPS) return;
    steps.push({
      step: steps.length + 1,
      nodeId: b.nodeId ?? '',
      i: -1,
      currentChar: '-',
      primaryVarName: 'Khối',
      primaryVarValue: `${steps.length + 1}`,
      memoryItems: [],
      memoryLabel: 'Loại khối',
      action: shorten(action, 60),
      explanation: why,
      kind: 'structure',
    });
  };

  const walk = (list: CppBlock[]): void => {
    for (const b of list) {
      if (b.kind === 'stmt') {
        push(b, b.text.replace(/\n/g, ' · '), ROLE_LABEL[b.role] ?? 'Câu lệnh');
      } else if (b.kind === 'if') {
        push(b, `if (${stripParen(b.cond)})`, 'Rẽ nhánh: đúng đi một đường, sai đi đường khác');
        walk(b.then);
        walk(b.else);
      } else if (b.kind === 'loop') {
        push(b, b.header, 'Vòng lặp: thân vòng chạy lại khi điều kiện còn thoả');
        walk(b.body);
      } else {
        push(b, b.header, 'Chọn nhánh theo giá trị');
        walk(b.body);
      }
    }
  };

  walk(program);
  if (steps.length > 0) {
    steps[0].explanation = `${reason} — chỉ đi theo cấu trúc chương trình. ${steps[0].explanation}`;
  }
  return steps;
}

// ── Điểm vào ──────────────────────────────────

/** Thêm một bước ghi chú, dùng lại khối của bước trước để sơ đồ không nhảy lung tung */
function pushNote(st: State, action: string, explanation: string): void {
  const last = st.steps[st.steps.length - 1];
  st.steps.push({
    step: st.steps.length + 1,
    nodeId: last?.nodeId ?? '',
    i: -1,
    currentChar: '-',
    primaryVarName: last?.primaryVarName ?? '—',
    primaryVarValue: last?.primaryVarValue ?? '—',
    memoryItems: last?.memoryItems ?? [],
    memoryLabel: last?.memoryLabel ?? 'Bộ nhớ',
    action,
    explanation,
    kind: 'values',
    printed: st.out,
  });
}

/**
 * Sinh các bước chạy thử cho tab "Sơ đồ thuật toán".
 *
 * @param cppCode    Lời giải mẫu (.cpp) của chính bài đang xem
 * @param problemCode Chỉ dùng để sinh lại sơ đồ khi không truyền `program`
 * @param sampleInput Input của test ví dụ — nguồn dữ liệu DUY NHẤT, không bịa
 * @param program    Cây khối đã gắn `nodeId` do `generateFlowchartFromCpp` trả về
 */
export function generateSimulationTrace(
  cppCode: string,
  problemCode: string = 'PROBLEM',
  sampleInput?: string,
  program?: CppBlock[],
): SimulationStep[] {
  const code = (cppCode || '').trim();
  if (!code) return [];

  const tree =
    program && program.length > 0
      ? program
      : generateFlowchartFromCpp(code, problemCode).program;
  if (!tree || tree.length === 0) return [];

  const input = (sampleInput ?? '').replace(/\r\n/g, '\n');
  if (input.trim() === '') {
    return structuralSteps(tree, 'Bài này chưa có test ví dụ để chạy thử');
  }

  const st: State = {
    env: new Env(),
    reader: new Reader(input),
    steps: [],
    out: '',
    ops: 0,
    loops: [],
    touched: [],
    truncated: false,
    fixed: false,
    prec: -1,
    src: cppCode,
  };

  try {
    runList(tree, st);
  } catch (err) {
    if (err instanceof Budget) {
      if (st.truncated) {
        pushNote(
          st,
          'Tạm dừng mô phỏng',
          `Đã đi qua ${MAX_STEPS} bước — đủ để thấy quy luật của thuật toán, phần còn lại lặp tương tự.`,
        );
      }
    } else if (err instanceof OutOfInput) {
      if (st.steps.length === 0) {
        return structuralSteps(tree, 'Test ví dụ không đủ dữ liệu để chạy thử');
      }
      pushNote(st, 'Hết dữ liệu vào', 'Test ví dụ đã đọc hết — dừng tại đây.');
    } else if (err instanceof Unsupported) {
      // Thà dừng và nói rõ còn hơn hiển thị số liệu bịa.
      if (st.steps.length < 3) {
        return structuralSteps(tree, `Chưa chạy thử được (${err.message})`);
      }
      pushNote(st, 'Dừng chạy thử', `Gặp cú pháp ngoài phạm vi mô phỏng: ${err.message}.`);
    } else if (err instanceof BreakSig || err instanceof ContinueSig || err instanceof ReturnSig) {
      // `break`/`continue` ngoài vòng lặp: coi như chương trình kết thúc
    } else {
      if (st.steps.length === 0) {
        return structuralSteps(tree, 'Không chạy thử được mã nguồn này');
      }
      pushNote(st, 'Dừng chạy thử', 'Gặp tình huống ngoài dự kiến khi mô phỏng.');
    }
  }

  if (st.steps.length === 0) {
    return structuralSteps(tree, 'Không sinh được bước chạy thử nào');
  }

  pushNote(
    st,
    'Kết thúc',
    st.out.trim() === ''
      ? 'Chương trình kết thúc.'
      : `Chương trình kết thúc. Kết quả in ra: "${shorten(st.out.trim().replace(/\n/g, '⏎'), 80)}"`,
  );
  return st.steps;
}
