const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const pdfParse = require('pdf-parse');

async function main() {
  const p = await prisma.problem.findUnique({ where: { code: 'DEMKTSO' } });
  console.log('DEMKTSO pdfUrl:', p.pdfUrl);

  if (p.pdfUrl) {
    const res = await fetch(p.pdfUrl);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const pdfData = await pdfParse(buffer);
    console.log('--- PDF Extracted Text ---');
    console.log(pdfData.text);
  }
}

main().finally(() => prisma.$disconnect());
