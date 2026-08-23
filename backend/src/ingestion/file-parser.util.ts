// ============================================
// File Parser Utilities
// Xử lý cấu trúc thư mục Data/ và phân tích code
// Hỗ trợ đa nền tảng (Windows/Linux Case-Insensitive)
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

// ── Detect I/O Type ───────────────────────────

export function detectIOType(sourceCode: string): {
  ioType: 'STANDARD' | 'FILE';
  ioFileName: string | null;
} {
  const freopenMatch = sourceCode.match(
    /freopen\s*\(\s*"([^"]+)\.inp"\s*,\s*"r"\s*,\s*stdin\s*\)/i,
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

  // Lấy tất cả các thư mục có chứa số thứ tự (Test01, test1, 01, 1...)
  const testFolders = entries
    .filter((d) => d.isDirectory() && !d.name.startsWith('__MACOSX') && !d.name.startsWith('.'))
    .map((d) => {
      const match = d.name.match(/\d+/);
      const testNumber = match ? parseInt(match[0], 10) : 999;
      return { dir: d, testNumber };
    })
    .sort((a, b) => a.testNumber - b.testNumber);

  const results: ParsedTestCase[] = [];

  for (const { dir, testNumber } of testFolders) {
    const folderPath = path.join(testDir, dir.name);
    const files = fs.readdirSync(folderPath).filter((f) => !f.startsWith('.') && !f.startsWith('__'));

    // Tìm file Input và Output (.inp/.out hoặc .in/.out hoặc .txt)
    const inpFile = files.find((f) => /\.(inp|in|txt)$/i.test(f) && !/out|ans/i.test(f));
    const outFile = files.find((f) => /\.(out|ans|txt)$/i.test(f) && !/inp|in$/i.test(f) && f !== inpFile);

    if (!inpFile || !outFile) {
      console.warn(`  ⚠️ Skipping ${dir.name}: missing input or output file`);
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
      console.warn(`  ⚠️ Error reading test files in ${dir.name}:`, readErr);
    }
  }

  return results;
}

// ── Parse Solution Codes ──────────────────────

export function parseSolutionCodes(
  docDir: string | null,
  problemCode: string,
): ParsedSolutionCode[] {
  if (!docDir || !fs.existsSync(docDir)) {
    return [];
  }

  const cppFiles = fs
    .readdirSync(docDir)
    .filter((f) => /\.cpp$/i.test(f) && !f.startsWith('.') && !f.startsWith('__'));

  return cppFiles.map((fileName) => {
    const sourceCode = fs.readFileSync(
      path.join(docDir, fileName),
      'utf-8',
    );

    const baseName = path.basename(fileName, '.cpp').toLowerCase();
    const isPrimary =
      baseName === problemCode.toLowerCase() ||
      baseName === 'solution' ||
      baseName === 'main';

    let label: string;
    if (isPrimary) {
      label = 'Lời giải chính';
    } else {
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

export function findDocumentFiles(docDir: string | null): {
  pdfPath: string | null;
  docxPath: string | null;
} {
  if (!docDir || !fs.existsSync(docDir)) {
    return { pdfPath: null, docxPath: null };
  }

  const files = fs.readdirSync(docDir).filter((f) => !f.startsWith('.') && !f.startsWith('__'));
  const pdfFile = files.find((f) => /\.pdf$/i.test(f));
  const docxFile = files.find((f) => /\.docx$/i.test(f));

  return {
    pdfPath: pdfFile ? path.join(docDir, pdfFile) : null,
    docxPath: docxFile ? path.join(docDir, docxFile) : null,
  };
}

// ── Parse Full Problem Directory ──────────────

export function parseProblemDirectory(
  problemDir: string,
  overrideCode?: string,
): ParsedProblem {
  const code = (overrideCode || path.basename(problemDir)).toUpperCase();
  const docDir = findSubdirectory(problemDir, ['Doc', 'doc', 'docs', 'Document', 'Documents']);
  const testDir = findSubdirectory(problemDir, ['Test', 'test', 'tests', 'Tests']);

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
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n+$/, '');
}

// ── Extract Problem Code ──────────────────────

export function extractProblemCode(dirName: string): string {
  return path.basename(dirName).toUpperCase();
}
