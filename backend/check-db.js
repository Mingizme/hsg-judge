const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('=== USERS IN DATABASE ===');
  console.log(users.map(u => ({ id: u.id, email: u.email, supabaseId: u.supabaseId, displayName: u.displayName, role: u.role })));

  const subs = await prisma.submission.findMany({
    include: { user: true, problem: true },
    orderBy: { submittedAt: 'desc' },
    take: 10,
  });
  console.log('\n=== RECENT SUBMISSIONS ===');
  console.log(subs.map(s => ({
    id: s.id,
    userId: s.userId,
    userEmail: s.user?.email,
    userDisplayName: s.user?.displayName,
    problem: s.problem?.code,
    verdict: s.verdict,
    score: s.score,
    submittedAt: s.submittedAt,
  })));
}

main().finally(() => prisma.$disconnect());
