/**
 * Một nguồn duy nhất cho địa chỉ API.
 *
 * Trước đây tám file khai báo lại `process.env.NEXT_PUBLIC_API_URL || '…'` với
 * chuỗi dự phòng viết tay — chỉ cần một chỗ gõ sai host là phần đó của trang
 * lặng lẽ gọi sai máy chủ, và đổi domain thì phải sửa rải rác khắp nơi.
 */

/** Không có dấu `/` ở cuối; luôn ghép theo dạng `${API_BASE}/problems`. */
export const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || 'https://hsg-judge.onrender.com/api'
).replace(/\/+$/, '');
