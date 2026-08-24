const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const p = await prisma.problem.findUnique({
    where: { code: 'DEMKTSO' },
    include: { solutionCodes: true },
  });
  console.log('--- guideHtml ---');
  console.log(p.guideHtml);
  console.log('--- solutionCodes ---');
  console.log(JSON.stringify(p.solutionCodes, null, 2));
  console.log('--- pdfUrl ---');
  console.log(p.pdfUrl);
  console.log('--- docxUrl ---');
  console.log(p.docxUrl);
}

main().finally(() => prisma.$disconnect());
