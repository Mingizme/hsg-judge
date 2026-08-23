const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Fixing TAOXAU real test cases and solution code...');

  const problem = await prisma.problem.findUnique({ where: { code: 'TAOXAU' } });
  if (!problem) {
    console.error('TAOXAU not found');
    return;
  }

  // 1. Update TestCases
  await prisma.testCase.deleteMany({ where: { problemId: problem.id } });

  const tests = [
    { testNumber: 1, input: 'Abc 12a b3', output: '123', isSample: true },
    { testNumber: 2, input: 'Tin Hoc 2026 THPT', output: '2026', isSample: true },
    { testNumber: 3, input: 'Hello World No Digits', output: '', isSample: false },
    { testNumber: 4, input: '9876543210', output: '9876543210', isSample: false },
    { testNumber: 5, input: 'HSG@1#2$3%4^5&6*7(8)9', output: '123456789', isSample: false },
  ];

  await prisma.testCase.createMany({
    data: tests.map(t => ({
      problemId: problem.id,
      testNumber: t.testNumber,
      inputData: t.input,
      outputData: t.output,
      isSample: t.isSample,
    })),
  });
  console.log('✅ Created 5 real test cases for TAOXAU');

  // 2. Update SolutionCode
  await prisma.solutionCode.deleteMany({ where: { problemId: problem.id } });

  const realCpp = `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    if (fopen("taoxau.inp", "r")) {
        freopen("taoxau.inp", "r", stdin);
        freopen("taoxau.out", "w", stdout);
    }
    
    string s, res = "";
    if (getline(cin, s)) {
        for (char c : s) {
            if (c >= '0' && c <= '9') {
                res += c;
            }
        }
        cout << res;
    }
    return 0;
}`;

  await prisma.solutionCode.create({
    data: {
      problemId: problem.id,
      label: 'Lời giải chính',
      fileName: 'taoxau.cpp',
      sourceCode: realCpp,
      isPrimary: true,
    },
  });
  console.log('✅ Updated real C++ solution for TAOXAU');
}

main().catch(console.error).finally(() => prisma.$disconnect());
