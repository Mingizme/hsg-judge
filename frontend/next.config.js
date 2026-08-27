/** @type {import('next').NextConfig} */
const nextConfig = {
  // `@react-pdf-viewer/*` và `pdfjs-dist` đã được bỏ: trình xem đề bài dùng
  // engine PDF có sẵn của trình duyệt (`components/workspace/pdf-viewer.tsx`),
  // nên không cần transpile hay alias `canvas` cho pdf.js nữa.
  turbopack: {},
};

module.exports = nextConfig;
