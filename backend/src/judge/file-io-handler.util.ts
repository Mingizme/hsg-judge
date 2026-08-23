// ============================================
// File I/O Handler Utility
// Chuyển đổi code C++ dùng freopen (File I/O)
// thành Standard I/O (stdin/stdout) để chạy
// trên Piston/Judge0 sandbox.
// ============================================

/**
 * Piston API chỉ hỗ trợ stdin/stdout.
 * Code HSG thường dùng freopen:
 *
 *   freopen("bai.inp", "r", stdin);
 *   freopen("bai.out", "w", stdout);
 *
 * Strategy: Comment out các dòng freopen, giữ nguyên
 * cin/cout hoạt động bình thường qua stdin/stdout.
 */

// ── Main Transform Function ──────────────────

/**
 * Loại bỏ tất cả lệnh freopen trong code C++ để
 * chương trình đọc/ghi qua stdin/stdout.
 *
 * Xử lý nhiều pattern freopen phổ biến:
 * - freopen("file.inp", "r", stdin);
 * - freopen("file.out", "w", stdout);
 * - freopen ( "file.inp" , "r" , stdin ) ;
 * - Cả trên cùng 1 dòng hoặc nhiều dòng
 *
 * @param sourceCode - Code C++ gốc
 * @returns Code đã loại bỏ freopen
 */
export function transformFileIOToStdIO(sourceCode: string): string {
  // Regex bắt freopen với mọi whitespace pattern
  // freopen("filename.ext", "mode", stream);
  const freopenRegex =
    /freopen\s*\(\s*"[^"]*"\s*,\s*"[rw]"\s*,\s*(?:stdin|stdout)\s*\)\s*;?/gi;

  let transformed = sourceCode.replace(freopenRegex, '/* freopen removed */');

  // Cũng xử lý pattern ifstream/ofstream (ít phổ biến hơn)
  // ifstream fin("file.inp");
  // ofstream fout("file.out");
  const ifstreamRegex =
    /(?:ifstream|ofstream)\s+\w+\s*\(\s*"[^"]*"\s*\)\s*;/gi;
  transformed = transformed.replace(
    ifstreamRegex,
    '/* fstream removed */',
  );

  return transformed;
}

// ── Detection Function ────────────────────────

/**
 * Kiểm tra code có dùng File I/O (freopen) không.
 */
export function hasFileIO(sourceCode: string): boolean {
  return /freopen\s*\(/i.test(sourceCode);
}

// ── Extract IO Filename ───────────────────────

/**
 * Trích xuất tên file I/O từ code.
 * VD: freopen("strnum.inp", "r", stdin) → "strnum"
 */
export function extractIOFileName(
  sourceCode: string,
): string | null {
  const match = sourceCode.match(
    /freopen\s*\(\s*"([^"]+)\.inp"\s*,\s*"r"\s*,\s*stdin\s*\)/i,
  );
  return match ? match[1] : null;
}

// ── Prepare Code for Execution ────────────────

/**
 * Chuẩn bị code C++ để chạy trên sandbox:
 *
 * 1. Nếu code dùng File I/O → loại bỏ freopen
 * 2. Đảm bảo có #include cần thiết
 * 3. Thêm compiler flags hint (comment)
 *
 * @param sourceCode - Code gốc từ học sinh
 * @param problemIOType - Loại I/O của bài tập ('FILE' | 'STANDARD')
 * @returns Code đã transform, sẵn sàng chạy
 */
export function prepareCodeForExecution(
  sourceCode: string,
  problemIOType: 'FILE' | 'STANDARD',
): string {
  let prepared = sourceCode;

  // Luôn loại bỏ freopen nếu có (dù bài khai báo I/O kiểu nào)
  // Vì student code có thể có freopen dù bài dùng standard I/O
  if (hasFileIO(prepared)) {
    prepared = transformFileIOToStdIO(prepared);
  }

  // Thêm comment đánh dấu code đã được transform
  if (prepared !== sourceCode) {
    prepared =
      '// [HSG-Judge] File I/O transformed to Standard I/O\n' + prepared;
  }

  return prepared;
}
