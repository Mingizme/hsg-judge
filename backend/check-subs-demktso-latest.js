const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const subs = await prisma.submission.findMany({
    where: { problem: { code: 'DEMKTSO' } },
    include: { results: true },
    orderBy: { submittedAt: 'desc' },
  });

  console.log('DEMKTSO current submissions in DB:');
  console.log(JSON.stringify(subs, null, 2));
}

main().finally(() => prisma.$disconnect());
