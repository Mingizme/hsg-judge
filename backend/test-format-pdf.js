function formatPdfTextToHtml(rawText) {
  if (!rawText || !rawText.trim()) return '';

  // Chuẩn hóa dòng và loại bỏ số trang rác như "-- 1 of 1 --"
  const clean = rawText
    .replace(/--\s*\d+\s*of\s*\d+\s*--/gi, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);

  let html = '';
  let inExample = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Tiêu đề hoặc mục chính
    if (/^(\*|\d+\.|\-)\s*(input|đầu vào|dữ liệu vào)/i.test(line)) {
      html += `<h3>📥 Quy cách Dữ liệu vào (Input)</h3><p>${line.replace(/^(\*|\d+\.|\-)\s*(input|đầu vào|dữ liệu vào)[:\s]*/i, '')}</p>`;
    } else if (/^(\*|\d+\.|\-)\s*(output|đầu ra|kết quả ra|kết quả)/i.test(line)) {
      html += `<h3>📤 Quy cách Kết quả ra (Output)</h3><p>${line.replace(/^(\*|\d+\.|\-)\s*(output|đầu ra|kết quả ra|kết quả)[:\s]*/i, '')}</p>`;
    } else if (/^(\*|\d+\.|\-)\s*(example|ví dụ|ví dụ mẫu)/i.test(line)) {
      html += `<h3>📊 Ví dụ mẫu (Example)</h3>`;
      inExample = true;
    } else if (/^(\*|\d+\.|\-)\s*(ràng buộc|subtasks|giới hạn|chú ý)/i.test(line)) {
      html += `<h3>🎯 Giới hạn & Ràng buộc</h3><p>${line}</p>`;
      inExample = false;
    } else if (line.startsWith('-')) {
      html += `<p class="pl-4"><strong>${line}</strong></p>`;
    } else {
      html += `<p>${line}</p>`;
    }
  }

  return html;
}

const samplePdf = `Bài 2. Viết chương trình nhập vào một xâu ký tự S chỉ gồm chữ cái, chữ số và dấu gạch dưới.
Thông báo ra số ký tự là chữ số, số ký tự là chữ cái trong xâu.
* Input: đọc từ file văn bản DEMKTSO.INP gồm 1 xâu ký tự S;
* Output: đưa ra file văn bản DEMKTSO.OUT gồm:
- Dòng 1 ghi số lượng chữ số trong xâu;
- Dòng 2 ghi số lượng chữ cái trong xâu;
* Example:
DEMKTSO.INP DEMKTSO.OUT
123_ab12_Af23 7
4
-- 1 of 1 --`;

console.log(formatPdfTextToHtml(samplePdf));
