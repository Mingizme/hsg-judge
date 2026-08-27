const fs = require('fs');

const file = 'Khoahoc/CHƯƠNG 4 MẢNG 1 CHIỀU/Mảng cộng dồn một chiều - Prefix Sum.html';
const html = fs.readFileSync(file, 'utf-8');

const startMarker = '<div class="w-full text-[17px] leading-relaxed">';
const startIdx = html.indexOf(startMarker);
console.log('startIdx:', startIdx);

// Search for aside or the navigation at bottom
const nextLesson = html.indexOf('Bài tiếp theo', startIdx);
const prevLesson = html.indexOf('Bài trước', startIdx);
console.log('nextLesson:', nextLesson, 'prevLesson:', prevLesson);

let idx = 0;
while ((idx = html.indexOf('Mục lục', idx)) !== -1) {
  console.log('Found "Mục lục" at:', idx, 'before/after:', html.substring(Math.max(0, idx - 120), idx + 80));
  idx += 7;
}
