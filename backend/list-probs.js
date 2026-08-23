const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const probs = await prisma.problem.findMany({
    include: {
      _count: {
        select: {
          testCases: true,
          solutionCodes: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  console.log('=== ALL PROBLEMS IN DATABASE ===');
  console.log(JSON.stringify(probs, null, 2));
}

main().finally(() => prisma.$disconnect());
