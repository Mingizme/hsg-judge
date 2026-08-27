/**
 * Khung code C++ khởi đầu cho học sinh.
 *
 * Trước đây chuỗi này được ghi lặp ở cả `workspace-layout.tsx` và
 * `code-editor.tsx`; nút "Khôi phục khung code" vì thế có thể trả về một khung
 * khác với khung lúc mở bài. Nay chỉ còn một nguồn duy nhất.
 */
export function studentStarterTemplate(problemCode: string): string {
  const lower = (problemCode || 'baitap').toLowerCase();
  return `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    // Đọc ghi file theo chuẩn thi HSG nếu cần
    // if (fopen("${lower}.inp", "r")) {
    //     freopen("${lower}.inp", "r", stdin);
    //     freopen("${lower}.out", "w", stdout);
    // }

    // Viết thuật toán của bạn tại đây...

    return 0;
}`;
}

/** Khoá localStorage lưu bản nháp code theo từng bài. */
export function draftStorageKey(problemCode: string): string {
  return `hsg-code-${(problemCode || '').toUpperCase()}`;
}
