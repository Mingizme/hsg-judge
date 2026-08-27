const fs = require('fs');
const path = require('path');

const baseDir = 'e:/project code/web ai code/Khoahoc';
const chapters = fs.readdirSync(baseDir, { withFileTypes: true })
  .filter(d => d.isDirectory() && d.name.startsWith('CHƯƠNG'))
  .sort((a,b) => a.name.localeCompare(b.name, 'vi'));

function cleanLessonHtml(rawHtml) {
  let html = rawHtml;
  
  // Remove google translate artifacts
  html = html.replace(/<div id="goog-gt-tt"[\s\S]*?<\/div><\/div><\/div>/gi, '');
  html = html.replace(/<div class="asbplayer-[\s\S]*?<\/div><\/div>/gi, '');
  html = html.replace(/<yd-sidebar[\s\S]*?<\/yd-sidebar>/gi, '');
  
  // Clean up attributes that are unnecessary
  html = html.replace(/data-id="[^"]*"/gi, '');
  html = html.replace(/node="\[object Object\]"/gi, '');
  html = html.replace(/crxemulator[^\s>]+/gi, '');
  
  // Clean up images that point to local extension files or missing local dirs
  html = html.replace(/<img[^>]*src="[^"]*logo-320\.png"[^>]*>/gi, '');
  html = html.replace(/<img[^>]*src="[^"]*24px\.svg"[^>]*>/gi, '');
  
  return html.trim();
}

const lessonsData = [];

chapters.forEach((c, cIdx) => {
  const chapterNumber = cIdx + 1;
  const chapterTitle = c.name.replace(/^CHƯƠNG\s+\d+\s+/, '').trim();
  const dirPath = path.join(baseDir, c.name);
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.html'));
  
  const chapterObj = {
    id: `chuong-${chapterNumber}`,
    chapterNumber,
    rawName: c.name,
    title: chapterTitle,
    lessons: []
  };
  
  files.forEach((f, lIdx) => {
    const filePath = path.join(dirPath, f);
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const lessonTitle = f.replace('.html', '').trim();
    const slug = f.replace('.html', '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
      
    const startMarker = '<div class="w-full text-[17px] leading-relaxed">';
    const startIdx = rawContent.indexOf(startMarker);
    
    let contentHtml = '';
    let headings = [];
    
    if (startIdx !== -1) {
      const asideIdx = rawContent.indexOf('<aside', startIdx);
      const tocIdx = rawContent.indexOf('Mục lục', startIdx);
      let endIdx = -1;
      
      if (asideIdx !== -1) {
        endIdx = asideIdx;
      } else if (tocIdx !== -1) {
        endIdx = rawContent.lastIndexOf('<div class="hidden', tocIdx);
        if (endIdx === -1) endIdx = tocIdx;
      }
      
      if (endIdx > startIdx) {
        contentHtml = rawContent.substring(startIdx + startMarker.length, endIdx);
      } else {
        contentHtml = rawContent.substring(startIdx + startMarker.length);
      }
      
      contentHtml = cleanLessonHtml(contentHtml);
      
      // Extract headings for Table of Contents
      const hMatches = contentHtml.match(/<h[23][^>]*>(.*?)<\/h[23]>/gis) || [];
      headings = hMatches.map(h => {
        const level = h.startsWith('<h2') ? 2 : 3;
        const text = h.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
        const id = text.toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        return { level, text, id };
      }).filter(h => h.text.length > 0 && !h.text.includes('Original text'));
    }
    
    chapterObj.lessons.push({
      id: slug,
      order: lIdx + 1,
      title: lessonTitle,
      hasOriginalContent: contentHtml.length > 200,
      contentHtml,
      headings,
      contentLength: contentHtml.length
    });
  });
  
  lessonsData.push(chapterObj);
});

console.log('Processed', lessonsData.length, 'chapters:');
lessonsData.forEach(c => {
  console.log(`\n=== Chương ${c.chapterNumber}: ${c.title} (${c.lessons.length} bài) ===`);
  c.lessons.forEach(l => {
    console.log(`  - [${l.hasOriginalContent ? 'OK' : 'NEED WRITE'}] ${l.title} (${l.contentLength} chars, ${l.headings.length} headings)`);
  });
});
