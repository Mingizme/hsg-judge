const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tests = await prisma.testCase.findMany({
    where: { problem: { code: 'TAOXAU' } },
    orderBy: { testNumber: 'asc' },
  });
  console.log('TAOXAU TestCases in DB:');
  console.table(tests.map(t => ({
    test: t.testNumber,
    input: JSON.stringify(t.inputData),
    output: JSON.stringify(t.outputData),
  })));
}

main().finally(() => prisma.$disconnect());
