/**
 * Kiểm tra dữ liệu khoá học sau khi chuẩn hoá — chạy được độc lập trong CI.
 * Thoát với mã 1 nếu còn bất kỳ khiếm khuyết nào để `npm run data:courses`
 * không bao giờ commit dữ liệu hỏng.
 *
 *   npm run data:courses:check
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const here = path.dirname(url.fileURLToPath(import.meta.url));
const dataDir = path.join(here, '..', 'src', 'data');
const lessonsDir = path.join(dataDir, 'course-lessons');
const indexFile = path.join(dataDir, 'courses-index.json');

const problems = [];
const note = (file, msg) => problems.push(`${file}: ${msg}`);

/** Rác trình bày không được phép còn lại trong nội dung bài học */
const FORBIDDEN = [
  ['class Tailwind hardcode', /(?:text|bg|border|dark:)-slate-\d/g],
  ['nút copy tĩnh (chết)', /<button/g],
  ['inline style trên thẻ cấu trúc', /<(?:p|h[234]|li|td|th|tr|ul|ol|table|code|pre|strong|em)\s[^>]*style="/g],
  ['biến thể dark: của Tailwind', /dark:/g],
  ['token span kiểu cũ', /class="token/g],
  ['linenumber kiểu cũ', /class="linenumber/g],
  ['hộp lỗi KaTeX', /katex-error/g],
  ['heading thiếu id', /<h[234](?! id=)/g],
  ['LaTeX thô còn sót', /\$/g],
  ['code span markdown chưa dịch', /`/g],
  ['thẻ script/iframe (không chạy qua dangerouslySetInnerHTML)', /<(?:script|iframe|object|embed)\b/gi],
  ['handler inline on*=', /<[a-zA-Z][^>]*\son[a-z]+\s*=/g],
];

/** Thẻ rỗng (void) — không bao giờ có thẻ đóng */
const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

/** Thẻ mà HTML cho phép bỏ thẻ đóng → không tính vào phép cân bằng */
const OPTIONAL_END = new Set([
  'li', 'p', 'td', 'th', 'tr', 'thead', 'tbody', 'tfoot', 'dt', 'dd', 'option',
]);

/**
 * Cây thẻ phải cân bằng tuyệt đối. HTML này được nhúng bằng
 * `dangerouslySetInnerHTML`, nên MỘT thẻ đóng mồ côi (`</div>`, `</main>` — xác
 * thẻ bọc của trang nguồn) sẽ đóng luôn thẻ bao của trang: các khối sau bài đọc
 * bị đẩy ra ngoài `<article>` và React phải dựng lại cả cây ở client
 * ("Hydration failed because the server rendered HTML didn't match the
 * client"). Kiểm tra này chặn lỗi đó quay lại.
 */
function findUnbalanced(html) {
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
  const stack = [];
  const stray = [];
  let m;

  while ((m = re.exec(html))) {
    const tag = m[2]?.toLowerCase();
    if (!tag || OPTIONAL_END.has(tag) || VOID_TAGS.has(tag)) continue;

    if (m[1] !== '/') {
      if (m[4] !== '/') stack.push(tag);
      continue;
    }
    let at = stack.length - 1;
    while (at >= 0 && stack[at] !== tag) at -= 1;
    if (at < 0) stray.push(tag);
    else stack.length = at;
  }
  return { stray, unclosed: stack };
}

let totalHeadings = 0;
let totalBytes = 0;
const files = fs.readdirSync(lessonsDir).filter((f) => f.endsWith('.json')).sort();

for (const file of files) {
  const full = path.join(lessonsDir, file);
  totalBytes += fs.statSync(full).size;
  const lesson = JSON.parse(fs.readFileSync(full, 'utf8'));
  const html = lesson.contentHtml;

  // placeholder của mask() chỉ được phép xuất hiện trong VĂN BẢN; path data
  // của <svg> do KaTeX sinh ra (d="… M834 80h4…") cũng khớp mẫu này nên phải
  // bóc hết thẻ trước khi soát, tránh báo động giả.
  const textOnly = html.replace(/<[^>]*>/g, ' ');
  const masks = (textOnly.match(/ M\d+ /g) || []).length;
  if (masks) note(file, `placeholder mask sót lại ×${masks}`);

  for (const [label, re] of FORBIDDEN) {
    const hits = (html.match(re) || []).length;
    if (hits) note(file, `${label} ×${hits}`);
  }

  // cây thẻ mất cân bằng → hydration mismatch trên trang bài học
  const { stray, unclosed } = findUnbalanced(html);
  if (stray.length) note(file, `thẻ đóng mồ côi: ${stray.map((t) => `</${t}>`).join(' ')}`);
  if (unclosed.length) note(file, `thẻ mở chưa đóng: ${unclosed.map((t) => `<${t}>`).join(' ')}`);

  // ký tự điều khiển sót lại = TeX bị hỏng escape chưa được sửa
  const ctrl = [...html].filter((c) => c.codePointAt(0) < 32 && !'\n\t\r'.includes(c)).length;
  if (ctrl) note(file, `ký tự điều khiển ×${ctrl}`);

  // heading: id phải duy nhất và khớp 1-1 với metadata dùng cho mục lục
  const ids = [...html.matchAll(/<h[234] id="([^"]+)"/g)].map((m) => m[1]);
  totalHeadings += ids.length;
  const dup = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  if (dup.length) note(file, `id heading trùng: ${dup.join(', ')}`);
  if (ids.length !== lesson.headings.length) {
    note(file, `metadata ${lesson.headings.length} heading nhưng DOM có ${ids.length}`);
  }
  const inDom = new Set(ids);
  for (const h of lesson.headings) {
    if (!inDom.has(h.id)) note(file, `heading "${h.text}" (#${h.id}) không có trong DOM`);
    if (!h.text || !h.level) note(file, `heading #${h.id} thiếu text/level`);
  }

  // đúng một <h1> cho cả trang: tiêu đề bài do layout render, nội dung không được có
  const h1 = (html.match(/<h1/g) || []).length;
  if (h1) note(file, `còn ${h1} thẻ <h1> trong nội dung`);

  for (const field of ['id', 'chapterId', 'title', 'order', 'estimatedMinutes', 'wordCount']) {
    if (lesson[field] === undefined || lesson[field] === null) note(file, `thiếu field "${field}"`);
  }
  if (`${lesson.chapterId}_${lesson.id}.json` !== file) {
    note(file, `tên file không khớp ${lesson.chapterId}_${lesson.id}`);
  }
}

// index phải khớp tuyệt đối với các file bài học
const index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
const onDisk = new Set(files.map((f) => f.replace(/\.json$/, '')));
let inIndex = 0;
for (const chapter of index.chapters) {
  for (const lesson of chapter.lessons) {
    inIndex += 1;
    const key = `${chapter.id}_${lesson.id}`;
    if (!onDisk.has(key)) note('courses-index.json', `trỏ tới bài không tồn tại: ${key}`);
    onDisk.delete(key);
  }
  if (chapter.lessonCount !== chapter.lessons.length) {
    note('courses-index.json', `${chapter.id}: lessonCount ${chapter.lessonCount} ≠ ${chapter.lessons.length}`);
  }
}
for (const orphan of onDisk) note('courses-index.json', `bài không có trong index: ${orphan}`);
if (index.totalLessons !== inIndex) {
  note('courses-index.json', `totalLessons ${index.totalLessons} ≠ ${inIndex}`);
}

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
console.log(
  `${files.length} bài · ${index.chapters.length} chương · ${totalHeadings} heading · ${kb(totalBytes)}`,
);

if (problems.length) {
  console.error(`\n✗ ${problems.length} vấn đề:`);
  for (const p of problems) console.error(`  · ${p}`);
  process.exit(1);
}
console.log('✓ dữ liệu khoá học sạch');
