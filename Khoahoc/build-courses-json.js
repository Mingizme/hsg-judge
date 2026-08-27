const fs = require('fs');
const path = require('path');

const baseDir = 'e:/project code/web ai code/Khoahoc';
const frontendDataDir = 'e:/project code/web ai code/frontend/src/data';
const lessonsOutDir = path.join(frontendDataDir, 'course-lessons');

if (!fs.existsSync(lessonsOutDir)) {
  fs.mkdirSync(lessonsOutDir, { recursive: true });
}

function cleanLessonHtml(rawHtml) {
  let html = rawHtml;
  // Remove google translate artifacts
  html = html.replace(/<div id="goog-gt-tt"[\s\S]*?<\/div><\/div><\/div>/gi, '');
  html = html.replace(/<div class="asbplayer-[\s\S]*?<\/div><\/div>/gi, '');
  html = html.replace(/<yd-sidebar[\s\S]*?<\/yd-sidebar>/gi, '');
  html = html.replace(/data-id="[^"]*"/gi, '');
  html = html.replace(/node="\[object Object\]"/gi, '');
  html = html.replace(/crxemulator[^\s>]+/gi, '');
  html = html.replace(/<img[^>]*src="[^"]*logo-320\.png"[^>]*>/gi, '');
  html = html.replace(/<img[^>]*src="[^"]*24px\.svg"[^>]*>/gi, '');
  return html.trim();
}

function makeSlug(text) {
  return text.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ────────────────── 3 MISSING LESSONS GENERATION ──────────────────

const missingLesson1_NumberTheory1 = `
<h2 class="mt-8 mb-4 border-b pb-2 text-2xl font-bold">1. Khái niệm Ước số và Bội số</h2>
<p class="mb-4 leading-relaxed">Cho hai số nguyên $a$ và $b$ với $b \neq 0$. Ta nói rằng <strong>$a$ chia hết cho $b$</strong> (ký hiệu là $a \ \vdots \ b$ hoặc $b \mid a$) nếu tồn tại một số nguyên $q$ sao cho $a = b \times q$.</p>
<ul class="my-4 list-disc space-y-2 pl-6">
  <li>Khi đó, $b$ được gọi là <strong>ước số</strong> (divisor) của $a$.</li>
  <li>$a$ được gọi là <strong>bội số</strong> (multiple) của $b$.</li>
</ul>

<div class="my-4 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
  <p class="font-semibold text-blue-400">💡 Tính chất cơ bản của quan hệ chia hết:</p>
  <ul class="mt-2 list-disc space-y-1 pl-6 text-sm">
    <li>Nếu $a \mid b$ và $b \mid c$ thì $a \mid c$ (Tính chất bắc cầu).</li>
    <li>Nếu $a \mid b$ và $a \mid c$ thì $a \mid (b \cdot x + c \cdot y)$ với mọi số nguyên $x, y$.</li>
    <li>Số $0$ là bội của mọi số nguyên khác $0$. Số $1$ là ước của mọi số nguyên.</li>
  </ul>
</div>

<h2 class="mt-8 mb-4 border-b pb-2 text-2xl font-bold">2. Số nguyên tố và Hợp số</h2>
<p class="mb-4 leading-relaxed"><strong>Số nguyên tố</strong> (Prime Number) là số nguyên dương lớn hơn $1$, chỉ có đúng hai ước nguyên dương phân biệt là $1$ và chính nó.</p>
<p class="mb-4 leading-relaxed">Các số nguyên tố đầu tiên: $2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, \dots$</p>
<p class="mb-4 leading-relaxed"><strong>Hợp số</strong> (Composite Number) là số nguyên dương lớn hơn $1$ có nhiều hơn hai ước số.</p>
<p class="mb-4 leading-relaxed text-amber-400 font-medium">⚠️ <em>Lưu ý:</em> Số $0$ và số $1$ <strong>không phải</strong> là số nguyên tố cũng <strong>không phải</strong> là hợp số.</p>

<h2 class="mt-8 mb-4 border-b pb-2 text-2xl font-bold">3. Thuật toán kiểm tra số nguyên tố $O(\sqrt{N})$</h2>
<p class="mb-4 leading-relaxed">Nếu số nguyên dương $N$ là hợp số, thì $N$ phải có ít nhất một ước $d$ sao cho $1 &lt; d \le \sqrt{N}$.</p>
<p class="mb-4 leading-relaxed"><strong>Chứng minh:</strong> Giả sử $N = a \times b$. Nếu cả $a &gt; \sqrt{N}$ và $b &gt; \sqrt{N}$ thì $a \times b &gt; \sqrt{N} \times \sqrt{N} = N$ (vô lý). Do đó ít nhất một trong hai thừa số phải $\le \sqrt{N}$.</p>

<div class="my-6 overflow-hidden rounded-xl border border-slate-300 bg-slate-950 shadow-lg dark:border-white/10">
  <div class="flex items-center justify-between border-b border-white/10 bg-slate-900 px-4 py-2 text-xs font-mono text-slate-400">
    <span>C++: isPrime(n) chuẩn thi đấu $O(\sqrt{N})$</span>
  </div>
  <pre class="p-4 text-sm font-mono text-emerald-400 overflow-x-auto"><code>bool isPrime(long long n) {
    if (n &lt;= 1) return false;
    if (n &lt;= 3) return true;
    if (n % 2 == 0 || n % 3 == 0) return false;
    
    // Tối ưu bước nhảy 6k ± 1
    for (long long i = 5; i * i &lt;= n; i += 6) {
        if (n % i == 0 || n % (i + 2) == 0)
            return false;
    }
    return true;
}</code></pre>
</div>

<h2 class="mt-8 mb-4 border-b pb-2 text-2xl font-bold">4. Thuật toán đếm và liệt kê toàn bộ ước số trong $O(\sqrt{N})$</h2>
<p class="mb-4 leading-relaxed">Để tìm tất cả các ước của $N$, ta chỉ cần duyệt $i$ từ $1$ đến $\sqrt{N}$. Nếu $i$ là ước của $N$ thì $N/i$ cũng là ước của $N$.</p>

<div class="my-6 overflow-hidden rounded-xl border border-slate-300 bg-slate-950 shadow-lg dark:border-white/10">
  <div class="flex items-center justify-between border-b border-white/10 bg-slate-900 px-4 py-2 text-xs font-mono text-slate-400">
    <span>C++: Liệt kê và tính tổng các ước của N</span>
  </div>
  <pre class="p-4 text-sm font-mono text-emerald-400 overflow-x-auto"><code>vector&lt;long long&gt; getDivisors(long long n) {
    vector&lt;long long&gt; divisors;
    for (long long i = 1; i * i &lt;= n; i++) {
        if (n % i == 0) {
            divisors.push_back(i);
            if (i * i != n) { // Tránh trùng lặp khi n là số chính phương
                divisors.push_back(n / i);
            }
        }
    }
    sort(divisors.begin(), divisors.end());
    return divisors;
}</code></pre>
</div>

<h2 class="mt-8 mb-4 border-b pb-2 text-2xl font-bold">5. Số chính phương & Số hoàn hảo</h2>
<ul class="my-4 list-disc space-y-3 pl-6">
  <li><strong>Số chính phương:</strong> Là số nguyên có căn bậc hai là một số nguyên dương. Số $N$ là số chính phương khi và chỉ khi $N$ có <strong>lẻ số lượng ước</strong>.</li>
  <li><strong>Số hoàn hảo:</strong> Là số nguyên dương có tổng tất cả các ước thực sự (các ước nhỏ hơn chính nó) bằng chính nó. Ví dụ: $6 = 1 + 2 + 3$, $28 = 1 + 2 + 4 + 7 + 14$.</li>
</ul>

<h2 class="mt-8 mb-4 border-b pb-2 text-2xl font-bold">6. Các lỗi kinh điển cần tránh trong Contest</h2>
<ul class="my-4 list-disc space-y-2 pl-6 text-rose-400">
  <li><strong>Lỗi tràn số khi viết <code>i * i &lt;= n</code>:</strong> Nếu $i \approx 2 \cdot 10^9$ với kiểu <code>int</code>, phép nhân <code>i * i</code> sẽ bị tràn dẫn đến vòng lặp vô tận (TLE). Luôn khai báo <code>long long i</code> hoặc viết <code>i &lt;= n / i</code>.</li>
  <li><strong>Quên trường hợp $N \le 1$:</strong> Đảm bảo <code>isPrime(0) = false</code> và <code>isPrime(1) = false</code>.</li>
  <li><strong>Số chính phương bị đếm 2 lần:</strong> Luôn kiểm tra <code>if (i * i != n)</code> trước khi thêm <code>n / i</code> vào danh sách ước.</li>
</ul>
`;

const missingLesson2_Sieve = `
<h2 class="mt-8 mb-4 border-b pb-2 text-2xl font-bold">1. Ý tưởng thuật toán Sàng Eratosthenes</h2>
<p class="mb-4 leading-relaxed"><strong>Sàng Eratosthenes</strong> (Sieve of Eratosthenes) là thuật toán kinh điển giúp tìm tất cả các số nguyên tố trong đoạn $[1, N]$ với độ phức tạp thời gian siêu nhanh: $O(N \log \log N)$.</p>

<div class="my-4 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
  <p class="font-semibold text-blue-400">🔍 Quy trình sàng:</p>
  <ol class="mt-2 list-decimal space-y-1 pl-6 text-sm">
    <li>Khởi tạo mảng boolean <code>isPrime[0..N]</code> với tất cả các giá trị là <code>true</code>. Đặt <code>isPrime[0] = isPrime[1] = false</code>.</li>
    <li>Duyệt $i$ từ $2$ đến $\sqrt{N}$. Nếu <code>isPrime[i] == true</code>, ta đánh dấu tất cả các bội số của $i$ bắt đầu từ $i^2$ (tức là $i^2, i^2 + i, i^2 + 2i, \dots$) là <code>false</code>.</li>
    <li>Sau khi kết thúc, các chỉ số có giá trị <code>true</code> chính là các số nguyên tố.</li>
  </ol>
</div>

<h2 class="mt-8 mb-4 border-b pb-2 text-2xl font-bold">2. Cài đặt chuẩn Sàng Eratosthenes</h2>
<div class="my-6 overflow-hidden rounded-xl border border-slate-300 bg-slate-950 shadow-lg dark:border-white/10">
  <div class="flex items-center justify-between border-b border-white/10 bg-slate-900 px-4 py-2 text-xs font-mono text-slate-400">
    <span>C++: Sàng Eratosthenes đến $10^7$</span>
  </div>
  <pre class="p-4 text-sm font-mono text-emerald-400 overflow-x-auto"><code>const int MAXN = 10000000;
bool isPrime[MAXN + 1];

void sieve(int n) {
    fill(isPrime, isPrime + n + 1, true);
    isPrime[0] = isPrime[1] = false;
    
    for (int i = 2; i * i &lt;= n; i++) {
        if (isPrime[i]) {
            // Duyệt từ i*i vì các bội nhỏ hơn (i*2, i*3...) đã bị sàng bởi các số trước đó
            for (int j = i * i; j &lt;= n; j += i) {
                isPrime[j] = false;
            }
        }
    }
}</code></pre>
</div>

<h2 class="mt-8 mb-4 border-b pb-2 text-2xl font-bold">3. Sàng Ước nguyên tố nhỏ nhất (MinPrime / LPF)</h2>
<p class="mb-4 leading-relaxed">Bằng cách lưu lại <strong>ước số nguyên tố nhỏ nhất</strong> (Least Prime Factor) của mỗi số, ta có thể phân tích bất kỳ số nào thành thừa số nguyên tố trong thời gian $O(\log N)$ (thay vì $O(\sqrt{N})$ thông thường).</p>

<div class="my-6 overflow-hidden rounded-xl border border-slate-300 bg-slate-950 shadow-lg dark:border-white/10">
  <div class="flex items-center justify-between border-b border-white/10 bg-slate-900 px-4 py-2 text-xs font-mono text-slate-400">
    <span>C++: Sàng MinPrime & Phân tích thừa số nguyên tố $O(\log N)$</span>
  </div>
  <pre class="p-4 text-sm font-mono text-emerald-400 overflow-x-auto"><code>const int MAXN = 1000000;
int minPrime[MAXN + 1];

void sieveMinPrime(int n) {
    for (int i = 2; i &lt;= n; i++) minPrime[i] = i;
    for (int i = 2; i * i &lt;= n; i++) {
        if (minPrime[i] == i) {
            for (int j = i * i; j &lt;= n; j += i) {
                if (minPrime[j] == j) minPrime[j] = i;
            }
        }
    }
}

// Phân tích n thành thừa số nguyên tố trong O(log N)
vector&lt;pair&lt;int, int&gt;&gt; factorize(int n) {
    vector&lt;pair&lt;int, int&gt;&gt; factors;
    while (n &gt; 1) {
        int p = minPrime[n];
        int count = 0;
        while (n % p == 0) {
            count++;
            n /= p;
        }
        factors.push_back({p, count});
    }
    return factors;
}</code></pre>
</div>

<h2 class="mt-8 mb-4 border-b pb-2 text-2xl font-bold">4. Sàng phân đoạn (Segmented Sieve) cho đoạn $[L, R]$</h2>
<p class="mb-4 leading-relaxed">Khi cần tìm các số nguyên tố trong đoạn $[L, R]$ với $R \le 10^{12}$ nhưng $R - L \le 10^6$, ta không thể tạo mảng kích thước $10^{12}$. Ta dùng <strong>Sàng phân đoạn</strong>: chỉ sàng các số nguyên tố tới $\sqrt{R} \le 10^6$, rồi đánh dấu các bội số trong đoạn $[L, R]$.</p>
`;

const missingLesson3_TwoPointers = `
<h2 class="mt-8 mb-4 border-b pb-2 text-2xl font-bold">1. Bản chất kỹ thuật Hai con trỏ (Two Pointers)</h2>
<p class="mb-4 leading-relaxed"><strong>Two Pointers</strong> là kỹ thuật sử dụng hai biến con trỏ (chỉ số $L$ và $R$) duyệt đồng thời trên một hoặc hai mảng dữ liệu. Điểm mấu chốt của kỹ thuật này là <strong>tính đơn điệu</strong> (monotonicity): khi dịch chuyển một con trỏ, con trỏ kia chỉ có thể dịch chuyển theo một chiều duy nhất, giúp giảm độ phức tạp từ $O(N^2)$ xuống $O(N)$.</p>

<h2 class="mt-8 mb-4 border-b pb-2 text-2xl font-bold">2. Mô hình 1: Hai con trỏ đối hướng (Opposite Direction)</h2>
<p class="mb-4 leading-relaxed">Đặt $L = 0$ ở đầu mảng và $R = N - 1$ ở cuối mảng đã được sắp xếp. Tùy thuộc vào tổng $A[L] + A[R]$ so với giá trị mục tiêu $X$, ta dịch chuyển $L$ sang phải hoặc $R$ sang trái.</p>

<div class="my-6 overflow-hidden rounded-xl border border-slate-300 bg-slate-950 shadow-lg dark:border-white/10">
  <div class="flex items-center justify-between border-b border-white/10 bg-slate-900 px-4 py-2 text-xs font-mono text-slate-400">
    <span>C++: Tìm cặp số có tổng bằng X trên mảng đã sắp xếp</span>
  </div>
  <pre class="p-4 text-sm font-mono text-emerald-400 overflow-x-auto"><code>bool findPairSum(vector&lt;long long&gt;&amp; a, long long target) {
    int left = 0, right = (int)a.size() - 1;
    while (left &lt; right) {
        long long currentSum = a[left] + a[right];
        if (currentSum == target) {
            cout &lt;&lt; "Found: " &lt;&lt; a[left] &lt;&lt; " + " &lt;&lt; a[right] &lt;&lt; " = " &lt;&lt; target &lt;&lt; endl;
            return true;
        } else if (currentSum &lt; target) {
            left++; // Tăng tổng lên
        } else {
            right--; // Giảm tổng xuống
        }
    }
    return false;
}</code></pre>
</div>

<h2 class="mt-8 mb-4 border-b pb-2 text-2xl font-bold">3. Mô hình 2: Hai con trỏ đồng hướng / Cửa sổ trượt (Sliding Window)</h2>
<p class="mb-4 leading-relaxed">Cả hai con trỏ $L$ và $R$ cùng di chuyển từ trái sang phải để duy trì một đoạn con $[L, R]$ thỏa mãn một điều kiện nhất định (ví dụ: tổng $\le S$, hoặc có nhiều nhất $K$ phần tử khác nhau).</p>

<div class="my-6 overflow-hidden rounded-xl border border-slate-300 bg-slate-950 shadow-lg dark:border-white/10">
  <div class="flex items-center justify-between border-b border-white/10 bg-slate-900 px-4 py-2 text-xs font-mono text-slate-400">
    <span>C++: Tìm độ dài đoạn con liên tiếp dài nhất có tổng &lt;= S</span>
  </div>
  <pre class="p-4 text-sm font-mono text-emerald-400 overflow-x-auto"><code>int maxSubarrayLength(vector&lt;int&gt;&amp; a, long long S) {
    int n = a.size();
    long long currentSum = 0;
    int maxLen = 0;
    int left = 0;
    
    for (int right = 0; right &lt; n; right++) {
        currentSum += a[right]; // Mở rộng cửa sổ sang phải
        
        // Co cửa sổ từ bên trái khi vi phạm điều kiện
        while (currentSum &gt; S &amp;&amp; left &lt;= right) {
            currentSum -= a[left];
            left++;
        }
        
        maxLen = max(maxLen, right - left + 1);
    }
    return maxLen;
}</code></pre>
</div>

<h2 class="mt-8 mb-4 border-b pb-2 text-2xl font-bold">4. Kỹ thuật Trộn hai mảng đã sắp xếp (Merge Two Sorted Arrays)</h2>
<p class="mb-4 leading-relaxed">Sử dụng hai con trỏ $i$ trên mảng $A$ và $j$ trên mảng $B$ để trộn hai dãy tăng dần thành một dãy tăng dần duy nhất trong thời gian $O(N + M)$. Đây chính là bước cốt lõi trong thuật toán Merge Sort.</p>
`;

// ────────────────── MAIN EXTRACTION LOOP ──────────────────

const chapters = fs.readdirSync(baseDir, { withFileTypes: true })
  .filter(d => d.isDirectory() && d.name.startsWith('CHƯƠNG'))
  .sort((a,b) => a.name.localeCompare(b.name, 'vi'));

const fullCourseData = [];
let totalLessonsCount = 0;

chapters.forEach((c, cIdx) => {
  const chapterNumber = cIdx + 1;
  const chapterTitle = c.name.replace(/^CHƯƠNG\s+\d+\s+/, '').trim();
  const chapterSlug = `chuong-${chapterNumber}`;
  const dirPath = path.join(baseDir, c.name);
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.html'));
  
  const chapterObj = {
    id: chapterSlug,
    chapterNumber,
    rawName: c.name,
    title: chapterTitle,
    lessonCount: files.length,
    lessons: []
  };
  
  files.forEach((f, lIdx) => {
    totalLessonsCount++;
    const filePath = path.join(dirPath, f);
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const lessonTitle = f.replace('.html', '').trim();
    const slug = makeSlug(lessonTitle);
    
    let contentHtml = '';
    
    // Check if missing
    if (f.includes('Lý thuyết số cơ bản (Phần 1)')) {
      contentHtml = missingLesson1_NumberTheory1;
    } else if (f.includes('Sàng số nguyên tố Eratosthenes')) {
      contentHtml = missingLesson2_Sieve;
    } else if (f.includes('Kỹ thuật Hai con trỏ - Two Pointers')) {
      contentHtml = missingLesson3_TwoPointers;
    } else {
      const startMarker = '<div class="w-full text-[17px] leading-relaxed">';
      const startIdx = rawContent.indexOf(startMarker);
      if (startIdx !== -1) {
        const asideIdx = rawContent.indexOf('<aside', startIdx);
        const tocIdx = rawContent.indexOf('Mục lục', startIdx);
        let endIdx = -1;
        if (asideIdx !== -1) endIdx = asideIdx;
        else if (tocIdx !== -1) {
          endIdx = rawContent.lastIndexOf('<div class="hidden', tocIdx);
          if (endIdx === -1) endIdx = tocIdx;
        }
        
        if (endIdx > startIdx) {
          contentHtml = rawContent.substring(startIdx + startMarker.length, endIdx);
        } else {
          contentHtml = rawContent.substring(startIdx + startMarker.length);
        }
        contentHtml = cleanLessonHtml(contentHtml);
      }
    }
    
    // Extract Headings for Table of Contents
    const hMatches = contentHtml.match(/<h[23][^>]*>(.*?)<\/h[23]>/gis) || [];
    const headings = hMatches.map(h => {
      const level = h.startsWith('<h2') ? 2 : 3;
      const text = h.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
      const id = makeSlug(text);
      return { level, text, id };
    }).filter(h => h.text.length > 0 && !h.text.includes('Original text') && !h.text.includes('Rate this'));
    
    // Calculate reading time
    const textOnly = contentHtml.replace(/<[^>]+>/g, ' ');
    const wordCount = textOnly.split(/\s+/).length;
    const estimatedMinutes = Math.max(5, Math.round(wordCount / 180));
    
    // Create Lesson Object
    const lessonObj = {
      id: slug,
      chapterId: chapterSlug,
      chapterNumber,
      chapterTitle,
      order: lIdx + 1,
      lessonNumber: lIdx + 1,
      title: lessonTitle,
      wordCount,
      estimatedMinutes,
      headings,
      contentHtml
    };
    
    // Save individual lesson JSON file to avoid huge single JS files
    const lessonFileName = `${chapterSlug}_${slug}.json`;
    fs.writeFileSync(path.join(lessonsOutDir, lessonFileName), JSON.stringify(lessonObj), 'utf-8');
    
    // Add summary to chapter
    chapterObj.lessons.push({
      id: slug,
      chapterId: chapterSlug,
      chapterNumber,
      lessonNumber: lIdx + 1,
      order: lIdx + 1,
      title: lessonTitle,
      estimatedMinutes,
      headingsCount: headings.length,
      previewHeadings: headings.slice(0, 4)
    });
  });
  
  fullCourseData.push(chapterObj);
});

// Save Course Index metadata
fs.writeFileSync(
  path.join(frontendDataDir, 'courses-index.json'),
  JSON.stringify({ chapters: fullCourseData, totalLessons: totalLessonsCount }, null, 2),
  'utf-8'
);

console.log('Successfully generated course database with', fullCourseData.length, 'chapters and', totalLessonsCount, 'lessons!');
