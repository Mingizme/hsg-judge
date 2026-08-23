const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const probs = await prisma.problem.findMany({
    select: {
      id: true,
      code: true,
      title: true,
      totalTests: true,
      isPublished: true,
      pdfUrl: true,
      createdAt: true,
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
  console.table(probs.map(p => ({
    code: p.code,
    tests: p.totalTests,
    testCasesCount: p._count.testCases,
    solutionsCount: p._count.solutionCodes,
    isPublished: p.isPublished,
    createdAt: p.createdAt.toISOString()
  })));
}

main().finally(() => prisma.$disconnect());
