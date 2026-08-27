/**
 * Nhãn & màu verdict dùng chung.
 *
 * Toàn bộ màu ở đây dùng token của theme (`success`/`warning`/`info`/…) thay cho
 * `text-green-500`, `text-red-500`… như trước — bảng màu literal của Tailwind
 * không đổi theo chế độ Sáng/Tối nên chữ verdict bị chìm nền ở một trong hai.
 */

import { Verdict, Difficulty } from '@/types';

export const VERDICT_COLORS: Record<Verdict, string> = {
  PENDING: 'text-muted-foreground',
  AC: 'text-success',
  WA: 'text-destructive',
  TLE: 'text-warning',
  MLE: 'text-warning',
  RTE: 'text-destructive',
  CE: 'text-info',
  SE: 'text-muted-foreground',
};

export const VERDICT_LABELS: Record<Verdict, string> = {
  PENDING: 'Đang chấm...',
  AC: 'Kết quả đúng (AC)',
  WA: 'Kết quả sai (WA)',
  TLE: 'Quá thời gian (TLE)',
  MLE: 'Quá bộ nhớ (MLE)',
  RTE: 'Lỗi thực thi (RTE)',
  CE: 'Lỗi biên dịch (CE)',
  SE: 'Lỗi hệ thống (SE)',
};

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  EASY: 'text-success',
  MEDIUM: 'text-warning',
  HARD: 'text-destructive',
};

export const DEFAULT_CODE_TEMPLATE = `#include <iostream>
using namespace std;

int main() {
    // Write your code here

    return 0;
}
`;
