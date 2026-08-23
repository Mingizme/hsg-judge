const fs = require('fs');
const path = require('path');
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

// Sử dụng file strnum.pdf làm PDF mẫu chuẩn để upload cho TAOXAU
async function fixPdf() {
  console.log('Uploading valid PDF for TAOXAU...');
  const samplePdfPath = path.join(__dirname, '../Data/STRNUM/Doc/strnum.pdf');
  if (fs.existsSync(samplePdfPath)) {
    const pdfBuffer = fs.readFileSync(samplePdfPath);
    
    // Upload to problems/TAOXAU/TAOXAU.pdf
    const { data: d1, error: e1 } = await supabase.storage
      .from('problem-pdfs')
      .upload('problems/TAOXAU/TAOXAU.pdf', pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });
    console.log('Upload TAOXAU.pdf:', e1 || 'SUCCESS');

    // Upload to problems/TAOXAU/taoxau.pdf
    const { data: d2, error: e2 } = await supabase.storage
      .from('problem-pdfs')
      .upload('problems/TAOXAU/taoxau.pdf', pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });
    console.log('Upload taoxau.pdf:', e2 || 'SUCCESS');
  }
}

fixPdf().catch(console.error);
