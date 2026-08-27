import type { Metadata } from 'next';
// CSS của KaTeX chỉ nạp cho các route trong /courses — không bắt trang chủ,
// trang bài tập… tải thêm 23 KB CSS + font toán. Thiếu file này thì mỗi công
// thức hiện HAI LẦN (bản MathML và bản HTML của KaTeX cùng hiển thị).
import 'katex/dist/katex.min.css';

export const metadata: Metadata = {
  title: {
    default: 'Khóa học Thuật toán & C++',
    template: '%s · Khóa học HSG Judge',
  },
  description:
    'Lộ trình luyện thi HSG Tin học: Nhập môn C++, điều khiển luồng, số học – tổ hợp và cấu trúc mảng, kèm bài tập chấm tự động.',
};

export default function CoursesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
