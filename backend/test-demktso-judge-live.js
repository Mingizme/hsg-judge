const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { PistonService } = require('./dist/src/judge/piston.service');
const { JudgeWorkerService } = require('./dist/src/judge/judge-worker.service');

async function main() {
  const problem = await prisma.problem.findUnique({
    where: { code: 'DEMKTSO' },
    include: { testCases: { orderBy: { testNumber: 'asc' } }, solutionCodes: true },
  });

  console.log('Testing DEMKTSO Judge...');
  console.log(`Problem has ${problem.testCases.length} test cases`);
  console.log(`Solution: ${problem.solutionCodes[0]?.sourceCode?.slice(0, 100)}...`);

  const piston = new PistonService();
  const worker = new JudgeWorkerService(piston);

  const testCases = problem.testCases.map(tc => ({
    testCaseId: tc.id,
    testNumber: tc.testNumber,
    inputData: tc.inputData,
    expectedOutput: tc.outputData,
  }));

  const config = {
    timeLimitMs: problem.timeLimitMs,
    memoryLimitMb: problem.memoryLimitMb,
    ioType: problem.ioType,
  };

  const results = await worker.judgeAllTests(
    problem.solutionCodes[0].sourceCode,
    testCases,
    config,
    (res) => console.log(`[SSE Test ${res.testNumber}] Verdict: ${res.verdict} (${res.executionTimeMs}ms)`)
  );

  console.log('All results:');
  console.table(results.map(r => ({
    test: r.testNumber,
    verdict: r.verdict,
    time: r.executionTimeMs,
    actual: JSON.stringify(r.actualOutput),
    expected: JSON.stringify(testCases.find(tc => tc.testNumber === r.testNumber)?.expectedOutput),
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
