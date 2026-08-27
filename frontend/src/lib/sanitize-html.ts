/**
 * Làm sạch HTML trước khi đưa vào `dangerouslySetInnerHTML`.
 *
 * Nội dung hướng dẫn được backend sinh ra bằng `mammoth` từ file .docx của giáo
 * viên. File .docx có thể chứa HTML thô (kể cả `<script>`) và mammoth KHÔNG lọc
 * giúp, nên trước đây mọi trang bài tập đều nhúng nguyên xi chuỗi đó vào DOM.
 *
 * Không thêm thư viện mới (DOMPurify) vì hàm này phải chạy được cả trên server
 * (Next SSR các client component) — nơi không có `document`. Cách tiếp cận:
 * xoá hẳn các thẻ nguy hiểm cùng nội dung, rồi bóc mọi thuộc tính không nằm
 * trong danh sách cho phép.
 */

/** Thẻ bị xoá cùng toàn bộ nội dung bên trong */
const DANGEROUS_BLOCKS = [
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'form',
  'noscript',
  'template',
  'svg',
  'math',
];

/** Thẻ bị bỏ (nội dung giữ lại) */
const DROP_TAG_KEEP_TEXT =
  /<\/?(?:html|head|body|link|meta|base|title|input|button|select|textarea)\b[^>]*>/gi;

/** Thuộc tính được phép giữ lại */
const ALLOWED_ATTRS = new Set([
  'href',
  'src',
  'alt',
  'title',
  'colspan',
  'rowspan',
  'width',
  'height',
  'align',
  'start',
  'type',
  'class',
]);

/**
 * URL chỉ được phép trỏ tới giao thức an toàn. Bỏ mọi ký tự ngoài vùng in được
 * trước khi so sánh vì `java&#9;script:` vẫn được browser thực thi.
 */
function isSafeUrl(value: string, attr: string): boolean {
  const v = value.replace(/[^\x21-\x7e]+/g, '').toLowerCase();
  if (v.startsWith('javascript:') || v.startsWith('vbscript:')) return false;
  // Ảnh nhúng base64 từ .docx là hợp lệ; `data:` ở `href` thì không.
  if (v.startsWith('data:')) return attr === 'src' && v.startsWith('data:image/');
  return true;
}

export function sanitizeHtml(input?: string | null): string {
  if (!input) return '';
  let html = String(input);

  // 1. Bỏ chú thích (có thể bọc mã theo kiểu conditional comment)
  html = html.replace(/<!--[\s\S]*?-->/g, '');

  // 2. Xoá thẻ nguy hiểm cùng nội dung
  for (const tag of DANGEROUS_BLOCKS) {
    html = html.replace(
      new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}\\s*>`, 'gi'),
      '',
    );
    // Thẻ mở/tự đóng còn sót (file .docx hỏng thường thiếu thẻ đóng)
    html = html.replace(new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi'), '');
  }

  // 3. Bỏ thẻ vô nghĩa nhưng vẫn giữ chữ
  html = html.replace(DROP_TAG_KEEP_TEXT, '');

  // 4. Lọc thuộc tính của từng thẻ còn lại
  html = html.replace(
    /<([a-zA-Z][\w:-]*)((?:\s+[^<>]*?)?)(\/?)>/g,
    (_full, rawName: string, rawAttrs: string, selfClose: string) => {
      const name = rawName.toLowerCase();
      if (!rawAttrs || !rawAttrs.trim()) return `<${name}${selfClose}>`;

      const kept: string[] = [];
      const attrRe =
        /([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<>`]+))|([a-zA-Z_:][\w:.-]*)/g;
      let m: RegExpExecArray | null;
      while ((m = attrRe.exec(rawAttrs)) !== null) {
        const attr = (m[1] || m[5] || '').toLowerCase();
        // Chặn mọi `on*`, `style`, `srcdoc`, `formaction`…
        if (!attr || !ALLOWED_ATTRS.has(attr)) continue;
        const value = m[2] ?? m[3] ?? m[4] ?? '';
        if ((attr === 'href' || attr === 'src') && !isSafeUrl(value, attr)) continue;
        kept.push(`${attr}="${value.replace(/"/g, '&quot;')}"`);
      }

      return `<${name}${kept.length ? ' ' + kept.join(' ') : ''}${selfClose}>`;
    },
  );

  return html;
}

/** Có nội dung thật sau khi bóc thẻ? (tránh render khung rỗng) */
export function hasRenderableHtml(html?: string | null): boolean {
  if (!html) return false;
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim().length > 0;
}
