// ============================================
// File Parser Utilities
// Xử lý cấu trúc thư mục Data/ và phân tích code
// ============================================

import * as fs from 'fs';
import * as path from 'path';

// ── Types ─────────────────────────────────────

export interface ParsedTestCase {
  testNumber: number;
  inputData: string;
  outputData: string;
  folderName: string;
}

export interface ParsedSolutionCode {
  fileName: string;
  sourceCode: string;
  label: string;
  isPrimary: boolean;
}

export interface ParsedProblem {
  code: string;                        // Mã bài (tên thư mục)
  pdfPath: string | null;              // Đường dẫn file PDF
  docxPath: string | null;             // Đường dẫn file DOCX
  solutionCodes: ParsedSolutionCode[]; // Danh sách code mẫu
  testCases: ParsedTestCase[];         // Danh sách test cases
  ioType: 'STANDARD' | 'FILE';        // Loại I/O
  ioFileName: string | null;           // Tên file I/O (không có .inp/.out)
}

// ── Detect I/O Type ───────────────────────────

/**
 * Phân tích source code C++ để phát hiện loại I/O:
 * - Nếu có `freopen` → FILE I/O, trích xuất tên file
 * - Nếu không → STANDARD I/O (cin/cout)
 */
export function detectIOType(sourceCode: string): {
  ioType: 'STANDARD' | 'FILE';
  ioFileName: string | null;
} {
  // Regex bắt freopen("filename.inp", "r", stdin)
  const freopenMatch = sourceCode.match(
    /freopen\s*\(\s*"([^"]+)\.inp"\s*,\s*"r"\s*,\s*stdin\s*\)/i,
  );

  if (freopenMatch) {
    return {
      ioType: 'FILE',
      ioFileName: freopenMatch[1], // "strnum" (không có .inp)
    };
  }

  return { ioType: 'STANDARD', ioFileName: null };
}

// ── Parse Test Folders ────────────────────────

/**
 * Đọc tất cả thư mục Test01..TestN, sắp xếp theo số thứ tự,
 * trả về danh sách cặp input/output.
 *
 * Hỗ trợ cả UPPER và lowercase filename:
 * - STRNUM.INP / STRNUM.OUT (chuẩn bài tập HSG)
 * - strnum.inp / strnum.out
 * - *.INP / *.OUT (bất kỳ tên nào, miễn đúng extension)
 */
export function parseTestFolders(testDir: string): ParsedTestCase[] {
  if (!fs.existsSync(testDir)) {
    return [];
  }

  const testFolders = fs
    .readdirSync(testDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^Test\d+$/i.test(d.name))
    .sort((a, b) => {
      const numA = parseInt(a.name.replace(/^Test/i, ''), 10);
      const numB = parseInt(b.name.replace(/^Test/i, ''), 10);
      return numA - numB;
    });

  const results: ParsedTestCase[] = [];

  for (const folder of testFolders) {
    const folderPath = path.join(testDir, folder.name);
    const files = fs.readdirSync(folderPath);

    // Tìm file .INP và .OUT (case-insensitive)
    const inpFile = files.find((f) => /\.inp$/i.test(f));
    const outFile = files.find((f) => /\.out$/i.test(f));

    if (!inpFile || !outFile) {
      console.warn(
        `  ⚠️ Skipping ${folder.name}: missing .INP or .OUT file`,
      );
      continue;
    }

    const inputData = normalizeLineEndings(
      fs.readFileSync(path.join(folderPath, inpFile), 'utf-8'),
    );
    const outputData = normalizeLineEndings(
      fs.readFileSync(path.join(folderPath, outFile), 'utf-8'),
    );

    const testNumber = parseInt(folder.name.replace(/^Test/i, ''), 10);

    results.push({
      testNumber,
      inputData,
      outputData,
      folderName: folder.name,
    });
  }

  return results;
}

// ── Parse Solution Codes ──────────────────────

/**
 * Đọc tất cả file .cpp trong thư mục Doc/
 * File cùng tên với mã bài → isPrimary = true
 * File khác → label = tên file (không extension)
 */
export function parseSolutionCodes(
  docDir: string,
  problemCode: string,
): ParsedSolutionCode[] {
  if (!fs.existsSync(docDir)) {
    return [];
  }

  const cppFiles = fs
    .readdirSync(docDir)
    .filter((f) => /\.cpp$/i.test(f));

  return cppFiles.map((fileName) => {
    const sourceCode = fs.readFileSync(
      path.join(docDir, fileName),
      'utf-8',
    );

    const baseName = path.basename(fileName, '.cpp').toLowerCase();
    const isPrimary = baseName === problemCode.toLowerCase();

    // Tạo label thân thiện
    let label: string;
    if (isPrimary) {
      label = 'Lời giải chính';
    } else {
      // "strnum_stack" → "Stack"
      const suffix = baseName
        .replace(problemCode.toLowerCase(), '')
        .replace(/^[_-]/, '');
      label = suffix
        ? `Cách giải: ${suffix.charAt(0).toUpperCase() + suffix.slice(1)}`
        : `Lời giải: ${baseName}`;
    }

    return { fileName, sourceCode, label, isPrimary };
  });
}

// ── Find Document Files ───────────────────────

/**
 * Tìm file PDF và DOCX trong thư mục Doc/
 */
export function findDocumentFiles(docDir: string): {
  pdfPath: string | null;
  docxPath: string | null;
} {
  if (!fs.existsSync(docDir)) {
    return { pdfPath: null, docxPath: null };
  }

  const files = fs.readdirSync(docDir);
  const pdfFile = files.find((f) => /\.pdf$/i.test(f));
  const docxFile = files.find((f) => /\.docx$/i.test(f));

  return {
    pdfPath: pdfFile ? path.join(docDir, pdfFile) : null,
    docxPath: docxFile ? path.join(docDir, docxFile) : null,
  };
}

// ── Parse Full Problem Directory ──────────────

/**
 * Phân tích toàn bộ một thư mục bài tập:
 * Data/STRNUM/ → ParsedProblem
 */
export function parseProblemDirectory(problemDir: string): ParsedProblem {
  const code = path.basename(problemDir).toUpperCase();
  const docDir = path.join(problemDir, 'Doc');
  const testDir = path.join(problemDir, 'Test');

  // 1. Parse documents (PDF, DOCX)
  const { pdfPath, docxPath } = findDocumentFiles(docDir);

  // 2. Parse solution codes (.cpp)
  const solutionCodes = parseSolutionCodes(docDir, code);

  // 3. Parse test cases
  const testCases = parseTestFolders(testDir);

  // 4. Detect I/O type from primary solution code
  const primaryCode = solutionCodes.find((s) => s.isPrimary);
  let ioType: 'STANDARD' | 'FILE' = 'STANDARD';
  let ioFileName: string | null = null;

  if (primaryCode) {
    const detected = detectIOType(primaryCode.sourceCode);
    ioType = detected.ioType;
    ioFileName = detected.ioFileName;
  } else if (solutionCodes.length > 0) {
    // Fallback: dùng code đầu tiên
    const detected = detectIOType(solutionCodes[0].sourceCode);
    ioType = detected.ioType;
    ioFileName = detected.ioFileName;
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

/**
 * Scan thư mục Data/ gốc, trả về danh sách đường dẫn
 * tới các thư mục bài tập con.
 */
export function scanDataDirectory(dataDir: string): string[] {
  if (!fs.existsSync(dataDir)) {
    throw new Error(`Data directory not found: ${dataDir}`);
  }

  return fs
    .readdirSync(dataDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .filter((d) => {
      // Phải có ít nhất thư mục Doc/ hoặc Test/
      const subDir = path.join(dataDir, d.name);
      const hasDoc = fs.existsSync(path.join(subDir, 'Doc'));
      const hasTest = fs.existsSync(path.join(subDir, 'Test'));
      return hasDoc || hasTest;
    })
    .map((d) => path.join(dataDir, d.name));
}

// ── Normalize Line Endings ────────────────────

/**
 * Chuẩn hóa line endings:
 * - \r\n → \n (Windows → Unix)
 * - Trim trailing whitespace trên mỗi dòng
 * - Trim trailing newlines cuối file
 */
export function normalizeLineEndings(content: string): string {
  return content
    .replace(/\r\n/g, '\n')              // Windows → Unix line endings
    .split('\n')
    .map((line) => line.trimEnd())        // Trim trailing whitespace per line
    .join('\n')
    .replace(/\n+$/, '');                 // Trim trailing newlines
}

// ── Extract Problem Code ──────────────────────

/**
 * Trích xuất mã bài từ tên thư mục.
 * VD: "STRNUM" → "STRNUM"
 */
export function extractProblemCode(dirName: string): string {
  return path.basename(dirName).toUpperCase();
}
