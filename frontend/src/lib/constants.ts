import { Verdict, Difficulty } from '@/types';

export const VERDICT_COLORS: Record<Verdict, string> = {
  PENDING: 'text-gray-500',
  AC: 'text-green-500',
  WA: 'text-red-500',
  TLE: 'text-orange-500',
  MLE: 'text-purple-500',
  RTE: 'text-yellow-500',
  CE: 'text-blue-500',
  SE: 'text-zinc-500',
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
  EASY: 'text-green-500',
  MEDIUM: 'text-yellow-500',
  HARD: 'text-red-500',
};

export const DEFAULT_CODE_TEMPLATE = `#include <iostream>
using namespace std;

int main() {
    // Write your code here
    
    return 0;
}
`;
