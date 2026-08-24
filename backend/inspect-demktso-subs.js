const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const subs = await prisma.submission.findMany({
    where: { problem: { code: 'DEMKTSO' } },
    include: {
      results: true,
      user: true,
    },
    orderBy: { submittedAt: 'desc' },
  });

  console.log('DEMKTSO submissions:', subs.length);
  for (const s of subs) {
    console.log(`Submission ${s.id}: status=${s.status}, verdict=${s.verdict}, score=${s.score}/${s.maxScore}, results=${s.results.length}, user=${s.user?.email}`);
  }
}

main().finally(() => prisma.$disconnect());
