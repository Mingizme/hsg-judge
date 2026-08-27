const fs = require('fs');
const path = require('path');

const baseDir = 'e:/project code/web ai code/Khoahoc';
const chapters = fs.readdirSync(baseDir, { withFileTypes: true })
  .filter(d => d.isDirectory() && d.name.startsWith('CHƯƠNG'))
  .sort((a,b) => a.name.localeCompare(b.name, 'vi'));

const results = [];

chapters.forEach(c => {
  const dirPath = path.join(baseDir, c.name);
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.html'));
  files.forEach(f => {
    const filePath = path.join(dirPath, f);
    const html = fs.readFileSync(filePath, 'utf-8');
    
    // Check start and end
    const startMarker = '<div class="w-full text-[17px] leading-relaxed">';
    const startIdx = html.indexOf(startMarker);
    
    let contentHtml = '';
    let headings = [];
    
    if (startIdx !== -1) {
      // Find TOC marker
      const tocIdx = html.indexOf('Mục lục', startIdx);
      let endIdx = -1;
      if (tocIdx !== -1) {
        // Find the boundary right before the TOC container
        const beforeToc = html.lastIndexOf('<div class="hidden', tocIdx);
        endIdx = beforeToc !== -1 ? beforeToc : tocIdx;
      } else {
        // End before </main> or footer
        endIdx = html.indexOf('</main>', startIdx);
      }
      
      if (endIdx > startIdx) {
        contentHtml = html.substring(startIdx, endIdx);
      } else {
        contentHtml = html.substring(startIdx, startIdx + 50000);
      }
      
      // Extract headings
      const hMatches = contentHtml.match(/<h[23][^>]*>(.*?)<\/h[23]>/gis) || [];
      headings = hMatches.map(h => h.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()).filter(Boolean);
    }
    
    results.push({
      chapter: c.name,
      fileName: f,
      title: f.replace('.html', ''),
      hasContent: contentHtml.length > 500,
      contentLength: contentHtml.length,
      headingCount: headings.length,
      sampleHeadings: headings.slice(0, 4)
    });
  });
});

console.table(results);
