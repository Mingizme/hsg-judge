const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const p = await prisma.problem.findUnique({
    where: { code: 'TAOXAU' },
  });
  console.log('TAOXAU record:');
  console.log(JSON.stringify(p, null, 2));
}

main().finally(() => prisma.$disconnect());
