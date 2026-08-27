// ============================================
// File Parser Utilities
// Xử lý cấu trúc thư mục Data/ và phân tích code
// Hỗ trợ đa nền tảng (Windows/Linux Case-Insensitive)
// Quy tắc cốt lõi: ĐUÔI TỆP quyết định loại tài nguyên, TÊN TỆP không quan trọng
//   - .pdf: Luôn là Đề bài
//   - .docx / .doc: Luôn là Hướng dẫn giải
//   - .cpp / .c / .cc / .cxx: Luôn là Code mẫu
// ============================================

import * as fs from 'fs';
import * as path from 'path';

// ── Types ─────────────────────────────────────

export interface ParsedTestCase {
  testNumber: number;
  inputData: string;
  outputData: string;
  folderName: string;
  /** Tên tệp dữ liệu vào gốc (ví dụ `STRNUM.INP`) — dùng để suy ra quy cách I/O */
  inputFileName: string;
}

export interface ParsedSolutionCode {
  fileName: string;
  sourceCode: string;
  label: string;
  isPrimary: boolean;
}

export interface ParsedProblem {
  code: string;                        // Mã bài
  pdfPath: string | null;              // Đường dẫn file PDF
  docxPath: string | null;             // Đường dẫn file DOCX
  solutionCodes: ParsedSolutionCode[]; // Danh sách code mẫu
  testCases: ParsedTestCase[];         // Danh sách test cases
  ioType: 'STANDARD' | 'FILE';         // Loại I/O
  ioFileName: string | null;           // Tên file I/O
}

/**
 * Tên thư mục tài liệu / thư mục test được chấp nhận.
 *
 * Trước đây mỗi chỗ tự liệt kê một danh sách khác nhau: `parseProblemDirectory`
 * nhận cả `Docs`/`DeBai`, còn `scanDataDirectory` chỉ nhận `Doc`/`doc` — nên một
 * gói đề dùng `Docs/` + `Tests/` bị bỏ qua âm thầm khi quét cả thư mục Data.
 * Nay chỉ có MỘT nguồn sự thật, dùng chung cho cả quét thư mục lẫn giải nén ZIP.
 */
export const DOC_DIR_NAMES = [
  'Doc',
  'Docs',
  'Document',
  'Documents',
  'DeBai',
  'De',
  'Đề',
  'ĐềBài',
  'Statement',
];

export const TEST_DIR_NAMES = [
  'Test',
  'Tests',
  'TestCase',
  'TestCases',
  'Testcase',
  'Data',
  'Dat',
];

// ── Helper: Tìm thư mục con không phân biệt hoa thường ───────

export function findSubdirectory(
  parentDir: string,
  candidateNames: string[],
): string | null {
  if (!fs.existsSync(parentDir)) return null;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(parentDir, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const name of candidateNames) {
    const found = entries.find(
      (e) => e.isDirectory() && e.name.toLowerCase() === name.toLowerCase(),
    );
    if (found) return path.join(parentDir, found.name);
  }
  return null;
}

/** Rác của hệ điều hành / tệp ẩn — không bao giờ là dữ liệu bài tập */
function isJunk(name: string): boolean {
  return (
    !name ||
    name.startsWith('.') ||
    name.startsWith('~$') ||
    name.toUpperCase().startsWith('__MACOSX') ||
    name.toLowerCase() === 'thumbs.db'
  );
}

// ── Helper: Tìm tất cả các file trong thư mục theo đuôi mở rộng ──

/**
 * Liệt kê tệp theo đuôi, có thể đi sâu vào thư mục con.
 *
 * `depth = 0` chỉ xét đúng thư mục đó (hành vi cũ). Bộ đề thật hay đặt lời giải
 * trong `Doc/BaiGiai/x.cpp`, nên khi tìm code mẫu ta đi sâu 2 cấp — thiếu điều
 * này thì bài có sẵn lời giải vẫn bị coi là "chưa có lời giải mẫu" và toàn bộ
 * sơ đồ thuật toán / mô phỏng ở giao diện không có gì để hiển thị.
 */
export function findFilesByExtension(
  dirPath: string | null,
  extensions: string[],
  depth = 0,
): string[] {
  if (!dirPath || !fs.existsSync(dirPath)) return [];
  const lowerExts = extensions.map((e) =>
    e.startsWith('.') ? e.toLowerCase() : `.${e.toLowerCase()}`,
  );

  const results: string[] = [];

  const walk = (dir: string, left: number) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (isJunk(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isFile()) {
        if (lowerExts.includes(path.extname(entry.name).toLowerCase())) {
          results.push(fullPath);
        }
      } else if (entry.isDirectory() && left > 0) {
        // Không lạc vào thư mục test: ở đó chỉ có .inp/.out, không có tài liệu
        const isTestDir = TEST_DIR_NAMES.some(
          (t) => t.toLowerCase() === entry.name.toLowerCase(),
        );
        if (!isTestDir) walk(fullPath, left - 1);
      }
    }
  };

  walk(dirPath, depth);
  // Sắp xếp để kết quả ổn định giữa các hệ điều hành (readdir không bảo đảm thứ tự)
  return results.sort((a, b) =>
    a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' }),
  );
}

// ── Detect I/O Type ───────────────────────────

/**
 * Nhận diện bài dùng tệp hay dùng bàn phím/màn hình.
 *
 * Không chỉ có `freopen(".inp","r",stdin)`: bộ đề HSG còn dùng `.in`, `.txt`,
 * `ifstream fin("BAI.INP")`, hoặc chỉ ghi ra tệp bằng `freopen(...stdout)`.
 * Trước đây mọi dạng đó đều bị xếp là STANDARD, khiến khối "Bắt đầu" trên sơ đồ
 * nói sai quy cách nhập/xuất và học sinh nộp bài theo hướng dẫn sai.
 */
export function detectIOType(sourceCode: string): {
  ioType: 'STANDARD' | 'FILE';
  ioFileName: string | null;
} {
  // Bỏ phần bị chú thích để không nhận diện theo code đã tắt
  const code = sourceCode
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ');

  const patterns: RegExp[] = [
    // freopen("BAI.INP", "r", stdin)
    /freopen\s*\(\s*["']([^"']+?)\.(?:inp|in|txt)["']\s*,\s*["']r[b+]*["']\s*,\s*stdin\s*\)/i,
    // freopen("BAI.OUT", "w", stdout) — vẫn là bài dùng tệp
    /freopen\s*\(\s*["']([^"']+?)\.(?:out|ans|txt)["']\s*,\s*["']w[b+]*["']\s*,\s*stdout\s*\)/i,
    // ifstream fin("BAI.INP") / fin.open("BAI.INP")
    /(?:ifstream\s+\w+\s*\(|\w+\s*\.\s*open\s*\()\s*["']([^"']+?)\.(?:inp|in|txt)["']/i,
    // ofstream fout("BAI.OUT")
    /(?:ofstream\s+\w+\s*\(|\w+\s*\.\s*open\s*\()\s*["']([^"']+?)\.(?:out|ans)["']/i,
  ];

  for (const re of patterns) {
    const m = code.match(re);
    if (m) {
      // Bỏ đường dẫn thư mục nếu code ghi "Test/BAI.INP"
      const base = m[1].replace(/\\/g, '/').split('/').pop() || m[1];
      return { ioType: 'FILE', ioFileName: base };
    }
  }

  return { ioType: 'STANDARD', ioFileName: null };
}

// ── Parse Test Folders ────────────────────────

const IN_EXTS = ['.inp', '.in'];
const OUT_EXTS = ['.out', '.ans', '.exp', '.res', '.kq'];

/**
 * Phân loại một tệp trong thư mục test là dữ liệu vào hay kết quả ra.
 *
 * Chỉ xét ĐUÔI tệp, không xét cả tên. Bộ luật cũ dùng `!/out|ans/i.test(f)` trên
 * toàn bộ tên nên bài tên `LAYOUT.INP` chứa chuỗi "out" bị loại — cả thư mục test
 * bị bỏ qua và bài trở thành 0 test. Riêng `.txt` mới cần đọc tên để đoán vai trò.
 */
function classifyTestFile(fileName: string): 'in' | 'out' | null {
  const ext = path.extname(fileName).toLowerCase();
  if (IN_EXTS.includes(ext)) return 'in';
  if (OUT_EXTS.includes(ext)) return 'out';
  if (ext === '.txt') {
    const stem = path.basename(fileName, ext).toLowerCase();
    if (/(^|[^a-z])(out|output|ans|answer|kq|ketqua|ra)([^a-z]|$)/.test(stem)) {
      return 'out';
    }
    if (/(^|[^a-z])(in|inp|input|vao)([^a-z]|$)/.test(stem)) return 'in';
  }
  return null;
}

const byNaturalName = (a: string, b: string) =>
  a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' });

/**
 * Ghép các cặp (vào, ra) trong MỘT thư mục.
 *
 * Thư mục test HSG thường chỉ có một cặp, nhưng cũng có gói đặt phẳng nhiều cặp
 * `BAI1.INP/BAI1.OUT/BAI2.INP/BAI2.OUT` trong cùng thư mục — nên ghép theo thứ
 * tự tự nhiên của tên để không mất test nào.
 */
function pairTestFiles(dirPath: string): { inp: string; out: string }[] {
  let files: string[];
  try {
    files = fs
      .readdirSync(dirPath, { withFileTypes: true })
      .filter((e) => e.isFile() && !isJunk(e.name))
      .map((e) => e.name);
  } catch {
    return [];
  }

  const ins = files.filter((f) => classifyTestFile(f) === 'in').sort(byNaturalName);
  const outs = files.filter((f) => classifyTestFile(f) === 'out').sort(byNaturalName);

  const pairs: { inp: string; out: string }[] = [];
  const n = Math.min(ins.length, outs.length);
  for (let i = 0; i < n; i++) {
    pairs.push({
      inp: path.join(dirPath, ins[i]),
      out: path.join(dirPath, outs[i]),
    });
  }
  return pairs;
}

export function parseTestFolders(testDir: string | null): ParsedTestCase[] {
  if (!testDir || !fs.existsSync(testDir)) return [];

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(testDir, { withFileTypes: true });
  } catch {
    return [];
  }

  // Lấy tất cả các thư mục test (Test01, test1, 01, 1...) theo đúng thứ tự số
  const testFolders = entries
    .filter((d) => d.isDirectory() && !isJunk(d.name))
    .map((d) => {
      const match = d.name.match(/\d+/);
      return {
        name: d.name,
        order: match ? parseInt(match[0], 10) : Number.MAX_SAFE_INTEGER,
      };
    })
    .sort((a, b) => a.order - b.order || byNaturalName(a.name, b.name));

  const results: ParsedTestCase[] = [];

  const push = (inp: string, out: string, folderName: string) => {
    try {
      results.push({
        testNumber: results.length + 1,
        inputData: normalizeLineEndings(fs.readFileSync(inp, 'utf-8')),
        outputData: normalizeLineEndings(fs.readFileSync(out, 'utf-8')),
        folderName,
        inputFileName: path.basename(inp),
      });
    } catch (readErr) {
      console.warn(`  ⚠️ Lỗi đọc test trong ${folderName}:`, readErr);
    }
  };

  for (const folder of testFolders) {
    const folderPath = path.join(testDir, folder.name);
    const pairs = pairTestFiles(folderPath);
    if (pairs.length === 0) {
      console.warn(`  ⚠️ Bỏ qua thư mục ${folder.name}: thiếu tệp .inp hoặc .out`);
      continue;
    }
    for (const p of pairs) push(p.inp, p.out, folder.name);
  }

  // Bố cục phẳng: các cặp .INP/.OUT nằm thẳng trong thư mục Test, không có thư
  // mục con. Trước đây dạng này cho ra 0 test mà không báo gì.
  if (results.length === 0) {
    for (const p of pairTestFiles(testDir)) {
      push(p.inp, p.out, path.basename(testDir));
    }
  }

  return results;
}

// ── Parse Solution Codes (.cpp) ───────────────
// Mọi file đuôi .cpp / .c / .cc / .cxx BẤT KỂ TÊN GÌ ĐỀU LÀ CODE MẪU

const CPP_EXTS = ['.cpp', '.c', '.cc', '.cxx', '.c++', '.cp'];

export function parseSolutionCodes(
  searchDirs: (string | null)[],
  problemCode: string,
): ParsedSolutionCode[] {
  const allCppFiles: string[] = [];

  for (const dir of searchDirs) {
    if (dir && fs.existsSync(dir)) {
      allCppFiles.push(...findFilesByExtension(dir, CPP_EXTS, 2));
    }
  }

  // Loại bỏ file trùng lặp (thư mục cha và thư mục Doc có thể trỏ cùng một tệp)
  const uniqueFiles = Array.from(new Set(allCppFiles.map((f) => path.resolve(f))));
  if (uniqueFiles.length === 0) return [];

  const cleanProblemCode = problemCode.trim().toLowerCase();

  const entries = uniqueFiles.map((filePath) => {
    const fileName = path.basename(filePath);
    // Bỏ phần đuôi mở rộng bất kể hoa thường (.cpp, .CPP, .c...)
    const baseName = fileName.replace(/\.(cpp|c|cc|cxx|c\+\+|cp)$/i, '');
    return {
      filePath,
      fileName,
      baseName,
      sourceCode: normalizeLineEndings(fs.readFileSync(filePath, 'utf-8')),
    };
  });

  /**
   * CHỌN ĐÚNG MỘT lời giải chính.
   *
   * Bộ luật cũ gán `isPrimary` cho cả tệp đầu tiên LẪN mọi tệp tên
   * `solution`/`main`/trùng mã bài — nên một gói có `strnum.cpp` + `main.cpp` sinh
   * ra HAI lời giải chính. Giao diện chỉ lấy `find(isPrimary)` nên bài mở ra lúc
   * thì hiện cách giải này, lúc thì cách khác.
   */
  const score = (e: { baseName: string; sourceCode: string }): number => {
    const b = e.baseName.trim().toLowerCase();
    if (b === cleanProblemCode) return 100;
    if (b === 'solution' || b === 'main' || b === 'sol') return 80;
    if (b.includes(cleanProblemCode) && cleanProblemCode.length >= 3) return 60;
    // Tệp có hàm main thật vẫn hơn một tệp chỉ chứa hàm phụ
    if (/\bint\s+main\s*\(/.test(e.sourceCode)) return 40;
    return 10;
  };

  let bestIndex = 0;
  let bestScore = -1;
  entries.forEach((e, i) => {
    const s = score(e);
    if (s > bestScore) {
      bestScore = s;
      bestIndex = i;
    }
  });

  return entries.map((e, index) => {
    const isPrimary = index === bestIndex;
    return {
      fileName: e.fileName,
      sourceCode: e.sourceCode,
      label: isPrimary
        ? `Lời giải chính (${e.fileName})`
        : `Cách giải: ${e.baseName}`,
      isPrimary,
    };
  });
}

// ── Find Document Files (PDF & DOCX) ──────────
// Tên file không quan trọng, chỉ quan trọng loại tệp (.pdf là đề bài, .docx là hướng dẫn)

/**
 * Chọn tài liệu ưu tiên: tệp trùng mã bài trước, rồi mới tới thứ tự tên.
 *
 * Trước đây lấy thẳng `pdfs[0]` theo thứ tự `readdir` — cùng một gói đề mà nạp
 * trên Windows và Linux có thể ra hai tệp đề khác nhau.
 */
function preferDocument(files: string[], problemCode: string): string | null {
  if (files.length === 0) return null;
  const code = problemCode.trim().toLowerCase();
  if (code) {
    const exact = files.find(
      (f) => path.basename(f, path.extname(f)).trim().toLowerCase() === code,
    );
    if (exact) return exact;
    const partial = files.find((f) =>
      path.basename(f).toLowerCase().includes(code),
    );
    if (partial) return partial;
  }
  return files[0];
}

export function findDocumentFiles(
  searchDirs: (string | null)[],
  problemCode = '',
): { pdfPath: string | null; docxPath: string | null } {
  const pdfs: string[] = [];
  const docxs: string[] = [];
  const docs: string[] = [];

  for (const dir of searchDirs) {
    if (!dir || !fs.existsSync(dir)) continue;
    pdfs.push(...findFilesByExtension(dir, ['.pdf'], 2));
    docxs.push(...findFilesByExtension(dir, ['.docx'], 2));
    docs.push(...findFilesByExtension(dir, ['.doc'], 2));
  }

  const uniq = (xs: string[]) => Array.from(new Set(xs.map((f) => path.resolve(f))));

  // `.docx` luôn ưu tiên hơn `.doc`: mammoth chỉ đọc được OOXML, đưa `.doc` nhị
  // phân vào sẽ ném lỗi và mất luôn tab Hướng dẫn.
  const docxList = uniq(docxs);
  const docList = uniq(docs);

  return {
    pdfPath: preferDocument(uniq(pdfs), problemCode),
    docxPath: preferDocument(docxList.length > 0 ? docxList : docList, problemCode),
  };
}

// ── Parse Full Problem Directory ──────────────

export function parseProblemDirectory(
  problemDir: string,
  overrideCode?: string,
): ParsedProblem {
  const code = (overrideCode || path.basename(problemDir)).toUpperCase();
  const docDir = findSubdirectory(problemDir, DOC_DIR_NAMES);
  const testDir = findSubdirectory(problemDir, TEST_DIR_NAMES);

  const candidateDocDirs = [docDir, problemDir].filter(Boolean) as string[];

  // 1. Parse documents (PDF = Đề bài, DOCX = Hướng dẫn)
  const { pdfPath, docxPath } = findDocumentFiles(candidateDocDirs, code);

  // 2. Parse solution codes (.cpp = Code mẫu)
  const solutionCodes = parseSolutionCodes(candidateDocDirs, code);

  // 3. Parse test cases
  const testCases = parseTestFolders(testDir);

  // 4. Detect I/O type from primary solution code
  const primaryCode = solutionCodes.find((s) => s.isPrimary) || solutionCodes[0];
  let ioType: 'STANDARD' | 'FILE' = 'STANDARD';
  let ioFileName: string | null = null;

  if (primaryCode) {
    const detected = detectIOType(primaryCode.sourceCode);
    ioType = detected.ioType;
    ioFileName = detected.ioFileName;
  }

  // Không có lời giải nào để đọc `freopen`: suy ra từ chính tên tệp test. Bộ đề
  // dùng tệp bao giờ cũng đặt `Test01/BAI.INP`, còn bài nhập bàn phím thì tên
  // tệp test là `input.txt`/`test.inp` chẳng liên quan tới mã bài.
  if (!primaryCode && testCases.length > 0) {
    const inp = testCases[0].inputFileName;
    const stem = inp ? path.basename(inp, path.extname(inp)) : '';
    if (stem && stem.toUpperCase() === code) {
      ioType = 'FILE';
      ioFileName = `${code}.INP`;
    }
  }

  return {
    code,
    pdfPath,
    docxPath,
    solutionCodes,
    testCases,
    ioType,
    ioFileName,
  };
}

// ── Scan Data Directory ───────────────────────

/** Thư mục này có giống một gói bài tập không? */
export function looksLikeProblemDir(dir: string): boolean {
  if (Boolean(findSubdirectory(dir, DOC_DIR_NAMES))) return true;
  if (Boolean(findSubdirectory(dir, TEST_DIR_NAMES))) return true;
  // Gói phẳng: PDF/DOCX/CPP nằm ngay trong thư mục bài
  return (
    findFilesByExtension(dir, ['.pdf', '.docx', '.doc', ...CPP_EXTS], 0).length > 0
  );
}

export function scanDataDirectory(dataDir: string): string[] {
  if (!fs.existsSync(dataDir)) {
    throw new Error(`Data directory not found: ${dataDir}`);
  }

  return fs
    .readdirSync(dataDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !isJunk(d.name))
    .map((d) => path.join(dataDir, d.name))
    .filter((dir) => looksLikeProblemDir(dir))
    .sort(byNaturalName);
}

// ── Normalize Line Endings ────────────────────

export function normalizeLineEndings(content: string): string {
  return content
    // BOM của tệp test xuất từ Windows sẽ lọt vào số đầu tiên nếu không bỏ.
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n+$/, '');
}

// ── Extract Problem Code ──────────────────────

export function extractProblemCode(dirName: string): string {
  return path.basename(dirName).toUpperCase();
}
