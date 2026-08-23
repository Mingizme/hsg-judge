const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sol = await prisma.solutionCode.findMany({
    where: { problem: { code: 'TAOXAU' } },
  });
  console.log('TAOXAU Solution Codes:');
  console.log(JSON.stringify(sol, null, 2));
}

main().finally(() => prisma.$disconnect());
