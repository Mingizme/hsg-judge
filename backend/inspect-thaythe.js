const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const p = await prisma.problem.findUnique({
    where: { code: 'THAYTHE' },
    include: { solutionCodes: true, testCases: true },
  });
  console.log('THAYTHE problem:');
  console.log('Title:', p?.title);
  console.log('Solutions:', JSON.stringify(p?.solutionCodes, null, 2));
}

main().finally(() => prisma.$disconnect());
