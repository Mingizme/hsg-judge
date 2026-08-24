const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const p = await prisma.problem.findUnique({
    where: { code: 'DEMKTSO' },
    include: {
      solutionCodes: true,
      testCases: true,
      problemTags: { include: { category: true } },
    },
  });
  console.log('DEMKTSO details in DB:');
  console.log('Problem:', JSON.stringify(p, null, 2));
}

main().finally(() => prisma.$disconnect());
