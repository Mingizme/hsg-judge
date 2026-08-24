const { PDFParse } = require('pdf-parse');

async function extractTextFromPdf(buffer) {
  const parser = new PDFParse({ data: buffer, verbosity: 0 });
  await parser.load();
  const textResult = await parser.getText();
  return textResult.text;
}

async function main() {
  const url = 'https://ekjqhmosasziofldicwb.supabase.co/storage/v1/object/public/problem-pdfs/problems/DEMKTSO/demktso.pdf';
  const res = await fetch(url);
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const text = await extractTextFromPdf(buffer);
  console.log('--- Extracted Text length:', text.length);
  console.log(text);
}

main().catch(console.error);
