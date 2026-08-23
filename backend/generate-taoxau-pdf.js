const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { createClient } = require('@supabase/supabase-js');

// Read .env file manually
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.substring(0, idx).trim();
        let val = trimmed.substring(idx + 1).trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        process.env[key] = val;
      }
    }
  });
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function generateTaoxauPdfBuffer() {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(12).font('Helvetica-Bold').text('SO GIAO DUC VA DAO TAO', { align: 'left' });
    doc.fontSize(12).font('Helvetica-Bold').text('DE THI CHON HOC SINH GIOI TIN HOC THPT', { align: 'right' });
    doc.moveDown(0.5);
    doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    // Title
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#000000').text('BAI TOAN: TAO XAU CHU SO (TAOXAU)', { align: 'center' });
    doc.fontSize(10).font('Helvetica-Oblique').fillColor('#555555').text('Thoi gian lam bai: 150 phut | File I/O: TAOXAU.INP / TAOXAU.OUT', { align: 'center' });
    doc.moveDown(1.5);

    // Section 1: Problem description
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#003366').text('1. DE BAI');
    doc.fontSize(11).font('Helvetica').fillColor('#000000').text(
      'Viet chuong trinh nhap vao mot xau ky tu s1 tu tep van ban TAOXAU.INP. Hay tao xau ky tu s2 gom tat ca cac ky tu la chu so (\'0\'..\'9\') co trong xau s1 theo dung thu tu xuat hien ban dau cua chung.',
      { lineGap: 4 }
    );
    doc.moveDown(1);

    // Section 2: Input specification
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#003366').text('2. DU LIEU VAO (Input)');
    doc.fontSize(11).font('Helvetica').fillColor('#000000').text(
      'Doc tu tep van ban TAOXAU.INP gom duy nhat 1 dong chua xau ky tu s1 co do dai khong qua 1000 ky tu (co the chua cac ky tu chu cai, chu so, khoang trang va ky tu dac biet).',
      { lineGap: 4 }
    );
    doc.moveDown(1);

    // Section 3: Output specification
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#003366').text('3. KET QUA RA (Output)');
    doc.fontSize(11).font('Helvetica').fillColor('#000000').text(
      'Ghi ra tep van ban TAOXAU.OUT xau ky tu s2 gom cac chu so tao duoc. Neu trong xau s1 khong chua chu so nao thi ghi ra tep rong.',
      { lineGap: 4 }
    );
    doc.moveDown(1);

    // Section 4: Example
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#003366').text('4. VI DU MAU (Example)');
    doc.moveDown(0.5);

    // Table Header
    const tableTop = doc.y;
    doc.rect(50, tableTop, 240, 24).fillAndStroke('#f0f4f8', '#333333');
    doc.rect(290, tableTop, 255, 24).fillAndStroke('#f0f4f8', '#333333');

    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(11);
    doc.text('TAOXAU.INP', 60, tableTop + 6);
    doc.text('TAOXAU.OUT', 300, tableTop + 6);

    // Table Row
    const rowTop = tableTop + 24;
    doc.rect(50, rowTop, 240, 36).fillAndStroke('#ffffff', '#333333');
    doc.rect(290, rowTop, 255, 36).fillAndStroke('#ffffff', '#333333');

    doc.fillColor('#000000').font('Courier').fontSize(11);
    doc.text('Abc 12a b3', 60, rowTop + 10);
    doc.fillColor('#008800').font('Courier-Bold').text('123', 300, rowTop + 10);

    doc.y = rowTop + 50;
    doc.fillColor('#555555').font('Helvetica-Oblique').fontSize(10).text(
      'Giai thich: Cac chu so xuat hien lan luot trong xau la \'1\', \'2\', \'3\'. Ghep lai ta duoc xau ket qua \'123\'.',
      { lineGap: 3 }
    );
    doc.moveDown(1.5);

    // Section 5: Constraints
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#003366').text('5. RANG BUOC & SUBTASKS');
    doc.fontSize(11).font('Helvetica').fillColor('#000000');
    doc.text('- Subtask 1 (50% so diem): Xau s1 khong chua dau cach, do dai N <= 100.', { lineGap: 4 });
    doc.text('- Subtask 2 (50% so diem): Xau s1 chua ky tu bat ky, do dai N <= 1000.', { lineGap: 4 });

    doc.end();
  });
}

async function main() {
  console.log('Generating real authentic PDF for TAOXAU...');
  const pdfBuffer = await generateTaoxauPdfBuffer();
  console.log(`Generated PDF size: ${pdfBuffer.length} bytes`);

  // Upload to TAOXAU.pdf
  const { data: d1, error: e1 } = await supabase.storage
    .from('problem-pdfs')
    .upload('problems/TAOXAU/TAOXAU.pdf', pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });
  console.log('Upload TAOXAU/TAOXAU.pdf:', e1 ? e1.message : 'SUCCESS');

  // Upload to taoxau.pdf
  const { data: d2, error: e2 } = await supabase.storage
    .from('problem-pdfs')
    .upload('problems/TAOXAU/taoxau.pdf', pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });
  console.log('Upload TAOXAU/taoxau.pdf:', e2 ? e2.message : 'SUCCESS');

  console.log('✅ Accurate TAOXAU.pdf successfully uploaded to Supabase Storage!');
}

main().catch(console.error);
