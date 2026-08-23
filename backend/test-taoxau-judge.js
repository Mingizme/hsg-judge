const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Test the diff checker and execution
const { normalizeOutput, compareOutputs } = require('./dist/src/judge/diff-checker.util');

async function testJudge() {
  const tests = await prisma.testCase.findMany({
    where: { problem: { code: 'TAOXAU' } },
    orderBy: { testNumber: 'asc' },
  });

  console.log(`Testing ${tests.length} tests for TAOXAU:`);

  const realCppLogic = (input) => {
    let res = '';
    for (const c of input) {
      if (c >= '0' && c <= '9') res += c;
    }
    return res;
  };

  let passed = 0;
  for (const t of tests) {
    const actual = realCppLogic(t.inputData);
    const expected = t.outputData;
    const isCorrect = normalizeOutput(actual) === normalizeOutput(expected);
    if (isCorrect) passed++;
    console.log(`Test ${t.testNumber}: Input="${t.inputData}" Expected="${expected}" Actual="${actual}" => ${isCorrect ? '✅ AC' : '❌ WA'}`);
  }
  console.log(`Result: ${passed}/${tests.length} Passed!`);
}

testJudge().catch(console.error).finally(() => prisma.$disconnect());
