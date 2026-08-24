// ============================================
// File Parser Utilities
// Xử lý cấu trúc thư mục Data/ và phân tích code
// Hỗ trợ đa nền tảng (Windows/Linux Case-Insensitive)
// Quy tắc cốt lõi: Đuôi tệp quyết định loại tài nguyên
//   - .pdf: Luôn là Đề bài
//   - .docx / .doc: Luôn là Hướng dẫn giải
//   - .cpp / .c / .cc: Luôn là Code mẫu
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
  code: string;                        // Mã bài
  pdfPath: string | null;              // Đường dẫn file PDF
  docxPath: string | null;             // Đường dẫn file DOCX
  solutionCodes: ParsedSolutionCode[]; // Danh sách code mẫu
  testCases: ParsedTestCase[];         // Danh sách test cases
  ioType: 'STANDARD' | 'FILE';        // Loại I/O
  ioFileName: string | null;           // Tên file I/O
}

// ── Helper: Tìm thư mục con không phân biệt hoa thường ───────

export function findSubdirectory(parentDir: string, candidateNames: string[]): string | null {
  if (!fs.existsSync(parentDir)) return null;
  const entries = fs.readdirSync(parentDir, { withFileTypes: true });
  for (const name of candidateNames) {
    const found = entries.find(
      (e) => e.isDirectory() && e.name.toLowerCase() === name.toLowerCase()
    );
    if (found) return path.join(parentDir, found.name);
  }
  return null;
}

// ── Helper: Tìm tất cả các file trong thư mục theo đuôi mở rộng ──

export function findFilesByExtension(dirPath: string | null, extensions: string[]): string[] {
  if (!dirPath || !fs.existsSync(dirPath)) return [];
  const lowerExts = extensions.map((e) => (e.startsWith('.') ? e.toLowerCase() : `.${e.toLowerCase()}`));

  const results: string[] = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name.startsWith('__MACOSX')) continue;
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (lowerExts.includes(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

// ── Detect I/O Type ───────────────────────────

export function detectIOType(sourceCode: string): {
  ioType: 'STANDARD' | 'FILE';
  ioFileName: string | null;
} {
  const freopenMatch = sourceCode.match(
    /freopen\s*\(\s*["']([^"']+)\.inp["']\s*,\s*["']r["']\s*,\s*stdin\s*\)/i,
  );

  if (freopenMatch) {
    return {
      ioType: 'FILE',
      ioFileName: freopenMatch[1],
    };
  }

  return { ioType: 'STANDARD', ioFileName: null };
}

// ── Parse Test Folders ────────────────────────

export function parseTestFolders(testDir: string | null): ParsedTestCase[] {
  if (!testDir || !fs.existsSync(testDir)) {
    return [];
  }

  const entries = fs.readdirSync(testDir, { withFileTypes: true });

  // Lấy tất cả các thư mục test (Test01, test1, 01, 1...)
  const testFolders = entries
    .filter((d) => d.isDirectory() && !d.name.startsWith('__MACOSX') && !d.name.startsWith('.'))
    .map((d) => {
      const match = d.name.match(/\d+/);
      const testNumber = match ? parseInt(match[0], 10) : 999;
      return { dir: d, testNumber };
    })
    .sort((a, b) => a.testNumber - b.testNumber);

  const results: ParsedTestCase[] = [];

  for (const { dir } of testFolders) {
    const folderPath = path.join(testDir, dir.name);
    const files = fs.readdirSync(folderPath).filter((f) => !f.startsWith('.') && !f.startsWith('__'));

    // Tìm file Input và Output (.inp/.out hoặc .in/.out hoặc .txt)
    const inpFile = files.find((f) => /\.(inp|in|txt)$/i.test(f) && !/out|ans/i.test(f));
    const outFile = files.find((f) => /\.(out|ans|txt)$/i.test(f) && !/inp|in$/i.test(f) && f !== inpFile);

    if (!inpFile || !outFile) {
      console.warn(`  ⚠️ Bỏ qua thư mục ${dir.name}: thiếu file inp hoặc out`);
      continue;
    }

    try {
      const inputData = normalizeLineEndings(
        fs.readFileSync(path.join(folderPath, inpFile), 'utf-8'),
      );
      const outputData = normalizeLineEndings(
        fs.readFileSync(path.join(folderPath, outFile), 'utf-8'),
      );

      results.push({
        testNumber: results.length + 1,
        inputData,
        outputData,
        folderName: dir.name,
      });
    } catch (readErr) {
      console.warn(`  ⚠️ Lỗi đọc test files trong ${dir.name}:`, readErr);
    }
  }

  return results;
}

// ── Parse Solution Codes (.cpp) ───────────────
// Mọi file đuôi .cpp / .c / .cc / .cxx BẤT KỂ TÊN GÌ ĐỀU LÀ CODE MẪU

export function parseSolutionCodes(
  searchDirs: (string | null)[],
  problemCode: string,
): ParsedSolutionCode[] {
  const allCppFiles: string[] = [];

  for (const dir of searchDirs) {
    if (dir && fs.existsSync(dir)) {
      const files = findFilesByExtension(dir, ['.cpp', '.c', '.cc', '.cxx']);
      allCppFiles.push(...files);
    }
  }

  // Loại bỏ file trùng lặp
  const uniqueFiles = Array.from(new Set(allCppFiles));

  if (uniqueFiles.length === 0) {
    return [];
  }

  return uniqueFiles.map((filePath, index) => {
    const fileName = path.basename(filePath);
    const sourceCode = normalizeLineEndings(
      fs.readFileSync(filePath, 'utf-8')
    );

    // Bỏ phần đuôi mở rộng bất kể hoa thường (.cpp, .CPP, .c...)
    const baseName = fileName.replace(/\.(cpp|c|cc|cxx)$/i, '');
    const cleanProblemCode = problemCode.trim().toLowerCase();
    const cleanBaseName = baseName.trim().toLowerCase();

    // File đầu tiên hoặc file trùng tên mã bài luôn là Lời giải chính
    const isPrimary =
      index === 0 ||
      cleanBaseName === cleanProblemCode ||
      cleanBaseName === 'solution' ||
      cleanBaseName === 'main';

    const label = isPrimary
      ? `Lời giải chính (${fileName})`
      : `Cách giải: ${baseName}`;

    return {
      fileName,
      sourceCode,
      label,
      isPrimary,
    };
  });
}

// ── Find Document Files (PDF & DOCX) ──────────
// Tên file không quan trọng, chỉ quan trọng loại tệp (.pdf là đề bài, .docx là hướng dẫn)

export function findDocumentFiles(searchDirs: (string | null)[]): {
  pdfPath: string | null;
  docxPath: string | null;
} {
  let pdfPath: string | null = null;
  let docxPath: string | null = null;

  for (const dir of searchDirs) {
    if (!dir || !fs.existsSync(dir)) continue;

    if (!pdfPath) {
      const pdfs = findFilesByExtension(dir, ['.pdf']);
      if (pdfs.length > 0) pdfPath = pdfs[0];
    }

    if (!docxPath) {
      const docxs = findFilesByExtension(dir, ['.docx', '.doc']);
      if (docxs.length > 0) docxPath = docxs[0];
    }

    if (pdfPath && docxPath) break;
  }

  return { pdfPath, docxPath };
}

// ── Parse Full Problem Directory ──────────────

export function parseProblemDirectory(
  problemDir: string,
  overrideCode?: string,
): ParsedProblem {
  const code = (overrideCode || path.basename(problemDir)).toUpperCase();
  const docDir = findSubdirectory(problemDir, ['Doc', 'doc', 'docs', 'Document', 'Documents', 'DeBai', 'De']);
  const testDir = findSubdirectory(problemDir, ['Test', 'test', 'tests', 'Tests', 'Data', 'data']);

  const candidateDocDirs = [docDir, problemDir].filter(Boolean) as string[];

  // 1. Parse documents (PDF = Đề bài, DOCX = Hướng dẫn)
  const { pdfPath, docxPath } = findDocumentFiles(candidateDocDirs);

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

export function scanDataDirectory(dataDir: string): string[] {
  if (!fs.existsSync(dataDir)) {
    throw new Error(`Data directory not found: ${dataDir}`);
  }

  return fs
    .readdirSync(dataDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.') && !d.name.startsWith('__'))
    .filter((d) => {
      const subDir = path.join(dataDir, d.name);
      const hasDoc = Boolean(findSubdirectory(subDir, ['Doc', 'doc']));
      const hasTest = Boolean(findSubdirectory(subDir, ['Test', 'test']));
      return hasDoc || hasTest;
    })
    .map((d) => path.join(dataDir, d.name));
}

// ── Normalize Line Endings ────────────────────

export function normalizeLineEndings(content: string): string {
  return content
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
