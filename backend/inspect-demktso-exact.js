const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { PDFParse } = require('pdf-parse');

async function main() {
  const p = await prisma.problem.findUnique({ where: { code: 'DEMKTSO' } });
  console.log('--- Problem description in DB ---');
  console.log(p.description);

  console.log('--- Problem guideHtml in DB ---');
  console.log(p.guideHtml);

  if (p.pdfUrl) {
    const res = await fetch(p.pdfUrl);
    const buffer = Buffer.from(await res.arrayBuffer());
    const parser = new PDFParse({ data: buffer, verbosity: 0 });
    await parser.load();
    const textResult = await parser.getText();
    console.log('--- Raw PDF text from Supabase PDF ---');
    console.log(textResult.text);
  }
}

main().finally(() => prisma.$disconnect());
