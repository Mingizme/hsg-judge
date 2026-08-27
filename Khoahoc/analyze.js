const fs = require('fs');
const path = require('path');

const file = 'e:/project code/web ai code/Khoahoc/CHƯƠNG 2 ĐIỀU KHIỂN LUỒNG/Vòng lặp For, While, Do-While & Xử lý vòng lặp lồng nhau.html';
const html = fs.readFileSync(file, 'utf-8');

// Find class attributes containing interesting keywords
const keywords = ['prose', 'guide', 'article', 'markdown', 'lesson', 'blog', 'post'];
for (const kw of keywords) {
  const re = new RegExp(`class="[^"]*${kw}[^"]*"`, 'gi');
  const matches = html.match(re);
  console.log(`"${kw}" matches:`, matches ? matches.length : 0, matches ? matches.slice(0, 3) : []);
}

// Find h2/h3 tags to see the actual headings
const headings = html.match(/<h[23][^>]*>.*?<\/h[23]>/gs);
if (headings) {
  console.log('\nHeadings found:', headings.length);
  headings.slice(0, 10).forEach(h => {
    const text = h.replace(/<[^>]+>/g, '').trim();
    console.log(' -', text.substring(0, 100));
  });
} else {
  console.log('\nNo h2/h3 headings found');
}

// Find code blocks
const codeBlocks = html.match(/<pre[^>]*>.*?<\/pre>/gs);
console.log('\nCode blocks found:', codeBlocks ? codeBlocks.length : 0);
if (codeBlocks) {
  codeBlocks.slice(0, 3).forEach(c => {
    const text = c.replace(/<[^>]+>/g, '').trim();
    console.log(' Code:', text.substring(0, 120));
  });
}
