const cheerio = require('cheerio');
const fs = require('fs');
const html = fs.readFileSync("CHƯƠNG 3 TOÁN HỌC TRONG THI ĐẤU (NUMBER THEORY)/GCM, LCM, Tổ hợp, Hoán Vị, Chỉnh Hợp là gì.html", 'utf8');
const $ = cheerio.load(html);
const katexSpan = $('.katex').first();
console.log(katexSpan.html().substring(0, 500));
