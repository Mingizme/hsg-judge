const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateStatements() {
  console.log('Updating structured statements for STRNUM and TAOXAU...');

  // 1. TAOXAU
  const taoxauGuide = `
<h3>1. Yêu cầu bài toán</h3>
<p>Viết chương trình nhập vào một xâu ký tự <code>s1</code> từ bàn phím hoặc tệp, tạo xâu ký tự <code>s2</code> gồm tất cả các ký tự là chữ số (<code>'0'..'9'</code>) có trong xâu ký tự <code>s1</code> theo đúng thứ tự xuất hiện ban đầu của chúng.</p>

<h3>2. Quy cách Dữ liệu vào (Input)</h3>
<p>Đọc từ file văn bản <code>TAOXAU.INP</code> (hoặc luồng vào chuẩn <code>cin</code>) gồm 1 dòng chứa xâu ký tự <code>s1</code> có độ dài không quá <code>1000</code> ký tự (có thể chứa dấu cách).</p>

<h3>3. Quy cách Kết quả ra (Output)</h3>
<p>Ghi ra file văn bản <code>TAOXAU.OUT</code> (hoặc luồng ra chuẩn <code>cout</code>) xâu ký tự <code>s2</code> gồm các chữ số trích xuất được. Nếu trong xâu <code>s1</code> không có chữ số nào, in ra xâu rỗng.</p>

<h3>4. Ví dụ mẫu (Example)</h3>
<div class="sample-test">
  <table class="w-full border-collapse">
    <thead>
      <tr>
        <th class="border p-2 bg-muted text-left">TAOXAU.INP</th>
        <th class="border p-2 bg-muted text-left">TAOXAU.OUT</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="border p-2 font-mono">Abc 12a b3</td>
        <td class="border p-2 font-mono text-emerald-500 font-bold">123</td>
      </tr>
    </tbody>
  </table>
</div>
<p class="text-xs text-muted-foreground mt-2"><em>Giải thích: Các chữ số xuất hiện lần lượt trong xâu là '1', '2', '3'. Ghép lại ta được xâu '123'.</em></p>

<h3>5. Ràng buộc & Subtasks</h3>
<ul>
  <li><strong>Subtask 1 (50% số điểm):</strong> Xâu <code>s1</code> chỉ gồm chữ cái và chữ số, không chứa khoảng trắng, độ dài \(N \le 100\).</li>
  <li><strong>Subtask 2 (50% số điểm):</strong> Xâu <code>s1</code> chứa các ký tự bất kỳ (bao gồm khoảng trắng và ký tự đặc biệt), độ dài \(N \le 1000\).</li>
</ul>
`.trim();

  await prisma.problem.update({
    where: { code: 'TAOXAU' },
    data: {
      title: 'Tạo xâu chữ số từ xâu ký tự',
      difficulty: 'EASY',
      description: 'Trích xuất tất cả các ký tự chữ số trong xâu s1 giữ nguyên thứ tự tạo thành xâu s2.',
      guideHtml: taoxauGuide,
      pdfUrl: null, // Không gắn PDF của STRNUM vào TAOXAU nữa
      pdfStoragePath: null,
    },
  });
  console.log('✅ Updated TAOXAU statement & removed false PDF link');

  // 2. STRNUM
  const strnumGuide = `
<h3>1. Bối cảnh & Yêu cầu bài toán</h3>
<p>Trong khoa học tính toán, các kỹ sư lập trình thường sử dụng chuỗi ký tự để biểu diễn số nguyên lớn. Cho một số nguyên dương lớn \(x\) có \(n\) chữ số và một số nguyên dương \(k\) thỏa mãn \(1 \le k < n \le 500\,000\).</p>
<p><strong>Nhiệm vụ:</strong> Hãy tìm cách xóa đi đúng \(k\) chữ số của số nguyên lớn \(x\) để các chữ số còn lại của \(x\) (giữ nguyên thứ tự ban đầu) tạo thành một số nguyên có giá trị <strong>lớn nhất</strong>.</p>

<h3>2. Quy cách Dữ liệu vào (Input)</h3>
<p>Đọc từ file văn bản <code>STRNUM.INP</code> (hoặc luồng vào chuẩn <code>cin</code>) gồm 2 dòng:</p>
<ul>
  <li>Dòng 1: Ghi hai số nguyên dương \(n\) và \(k\) cách nhau bởi một dấu cách (\(1 \le k < n \le 500\,000\)).</li>
  <li>Dòng 2: Ghi một xâu gồm \(n\) chữ số đại diện cho số nguyên lớn \(x\).</li>
</ul>

<h3>3. Quy cách Kết quả ra (Output)</h3>
<p>Ghi ra file văn bản <code>STRNUM.OUT</code> (hoặc luồng ra chuẩn <code>cout</code>) một xâu ký tự biểu diễn số lớn nhất tìm được sau khi xóa đi \(k\) chữ số.</p>

<h3>4. Ví dụ mẫu (Examples)</h3>
<div class="sample-test space-y-3">
  <table class="w-full border-collapse">
    <thead>
      <tr>
        <th class="border p-2 bg-muted text-left">STRNUM.INP</th>
        <th class="border p-2 bg-muted text-left">STRNUM.OUT</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="border p-2 font-mono">4 2<br>1924</td>
        <td class="border p-2 font-mono text-emerald-500 font-bold">94</td>
      </tr>
    </tbody>
  </table>
  <p class="text-xs text-muted-foreground"><em>Giải thích Ví dụ 1: Xóa 2 chữ số '1' và '2', giữ lại '9' và '4' tạo thành số 94 lớn nhất.</em></p>

  <table class="w-full border-collapse">
    <thead>
      <tr>
        <th class="border p-2 bg-muted text-left">STRNUM.INP</th>
        <th class="border p-2 bg-muted text-left">STRNUM.OUT</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="border p-2 font-mono">12 3<br>743019601036</td>
        <td class="border p-2 font-mono text-emerald-500 font-bold">749601036</td>
      </tr>
    </tbody>
  </table>
</div>

<h3>5. Giới hạn & Subtasks</h3>
<ul>
  <li><strong>Subtask 1 (75% số điểm - 18/24 tests):</strong> \(n \le 255\), thuật toán duyệt vét cạn / tham lam cơ bản.</li>
  <li><strong>Subtask 2 (25% số điểm - 6/24 tests):</strong> \(n \le 500\,000\), yêu cầu thuật toán tối ưu \(O(N)\) sử dụng Monotonic Stack.</li>
</ul>
`.trim();

  await prisma.problem.update({
    where: { code: 'STRNUM' },
    data: {
      title: 'Xóa chữ số tạo số lớn nhất',
      difficulty: 'MEDIUM',
      guideHtml: strnumGuide,
    },
  });
  console.log('✅ Updated STRNUM statement');
}

updateStatements().catch(console.error).finally(() => prisma.$disconnect());
