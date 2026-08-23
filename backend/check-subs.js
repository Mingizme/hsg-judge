const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const subs = await prisma.submission.findMany({
    include: {
      user: true,
      problem: true,
    },
    orderBy: { submittedAt: 'desc' },
    take: 10,
  });
  console.log('Submissions in DB:', subs.length);
  console.table(subs.map(s => ({
    id: s.id,
    problem: s.problem.code,
    userEmail: s.user?.email,
    userSupabaseId: s.user?.supabaseId,
    verdict: s.verdict,
    score: s.score,
    time: s.submittedAt,
  })));
}

main().finally(() => prisma.$disconnect());
