// ============================================
// Custom Diff Checker
// So sánh output học sinh với output chuẩn
// Chuẩn hóa whitespace, line endings
// ============================================

// ── Types ─────────────────────────────────────

export interface DiffResult {
  isMatch: boolean;
  details: string;
  expectedPreview: string;   // 200 chars đầu tiên
  actualPreview: string;     // 200 chars đầu tiên
  firstDiffLine: number | null;
  firstDiffExpected: string | null;
  firstDiffActual: string | null;
}

// ── Normalize Output ──────────────────────────

/**
 * Chuẩn hóa output để so sánh công bằng:
 *
 * 1. \r\n → \n (Windows → Unix)
 * 2. Trim trailing whitespace trên mỗi dòng
 * 3. Trim trailing empty lines cuối output
 * 4. Trim leading/trailing whitespace toàn bộ
 *
 * Đây là chuẩn checker phổ biến nhất trong các
 * Online Judge (Codeforces, VNOI, USACO).
 */
export function normalizeOutput(output: string): string {
  return output
    .replace(/\r\n/g, '\n')                // Windows line endings
    .replace(/\r/g, '\n')                  // Old Mac line endings
    .split('\n')
    .map((line) => line.trimEnd())         // Trim trailing whitespace per line
    .join('\n')
    .trim();                               // Trim leading/trailing
}

// ── Compare Outputs ───────────────────────────

/**
 * So sánh output học sinh với output chuẩn.
 * Sử dụng normalized comparison (chuẩn ICPC/IOI).
 *
 * @param expected - Output chuẩn (từ file .OUT)
 * @param actual - Output thực tế (từ chương trình HS)
 * @returns DiffResult chi tiết
 */
export function compareOutputs(
  expected: string,
  actual: string,
): DiffResult {
  const normalizedExpected = normalizeOutput(expected);
  const normalizedActual = normalizeOutput(actual);

  const preview = (s: string) =>
    s.length > 200 ? s.substring(0, 200) + '...' : s;

  // ── Exact match after normalization ─────────

  if (normalizedExpected === normalizedActual) {
    return {
      isMatch: true,
      details: 'Output matches (normalized comparison)',
      expectedPreview: preview(normalizedExpected),
      actualPreview: preview(normalizedActual),
      firstDiffLine: null,
      firstDiffExpected: null,
      firstDiffActual: null,
    };
  }

  // ── Find first differing line ───────────────

  const expectedLines = normalizedExpected.split('\n');
  const actualLines = normalizedActual.split('\n');

  let firstDiffLine: number | null = null;
  let firstDiffExpected: string | null = null;
  let firstDiffActual: string | null = null;

  const maxLines = Math.max(expectedLines.length, actualLines.length);

  for (let i = 0; i < maxLines; i++) {
    const eLine = expectedLines[i] ?? '<EOF>';
    const aLine = actualLines[i] ?? '<EOF>';

    if (eLine !== aLine) {
      firstDiffLine = i + 1; // 1-indexed
      firstDiffExpected = eLine;
      firstDiffActual = aLine;
      break;
    }
  }

  // ── Build detail message ────────────────────

  let details: string;

  if (expectedLines.length !== actualLines.length) {
    details = `Line count mismatch: expected ${expectedLines.length} lines, got ${actualLines.length} lines. `;
  } else {
    details = '';
  }

  if (firstDiffLine !== null) {
    details += `First difference at line ${firstDiffLine}`;
  }

  return {
    isMatch: false,
    details,
    expectedPreview: preview(normalizedExpected),
    actualPreview: preview(normalizedActual),
    firstDiffLine,
    firstDiffExpected,
    firstDiffActual,
  };
}

// ── Token-based Comparison (Alternative) ──────

/**
 * So sánh theo token (split by whitespace).
 * Phù hợp cho bài toán mà thứ tự dòng không quan trọng,
 * chỉ cần các giá trị khớp.
 *
 * VD: "1 2 3\n" vs "1  2  3" → match
 */
export function compareByTokens(
  expected: string,
  actual: string,
): boolean {
  const expectedTokens = expected.trim().split(/\s+/);
  const actualTokens = actual.trim().split(/\s+/);

  if (expectedTokens.length !== actualTokens.length) {
    return false;
  }

  return expectedTokens.every(
    (token, index) => token === actualTokens[index],
  );
}
