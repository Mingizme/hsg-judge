const { PrismaClient } = require('@prisma/client');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Giả lập IngestionService & file-parser
const { parseProblemDirectory, findSubdirectory } = require('./dist/src/ingestion/file-parser.util');

async function testZip() {
  console.log('=== CREATING SIMULATED TAOXAU.ZIP ===');
  const zip = new AdmZip();

  // Thêm file Doc
  zip.addFile('TAOXAU/Doc/TAOXAU.pdf', Buffer.from('%PDF-1.4 sample pdf content'));
  zip.addFile('TAOXAU/Doc/TAOXAU.docx', Buffer.from('PK sample docx content'));
  zip.addFile(
    'TAOXAU/Doc/TAOXAU.cpp',
    Buffer.from(
      `#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n  freopen("taoxau.inp", "r", stdin);\n  freopen("taoxau.out", "w", stdout);\n  string s;\n  if (cin >> s) cout << s << endl;\n  return 0;\n}`
    )
  );

  // Thêm 5 test cases
  for (let i = 1; i <= 5; i++) {
    const pad = i < 10 ? `0${i}` : `${i}`;
    zip.addFile(`TAOXAU/Test/Test${pad}/TAOXAU.INP`, Buffer.from(`input_${i}\n`));
    zip.addFile(`TAOXAU/Test/Test${pad}/TAOXAU.OUT`, Buffer.from(`output_${i}\n`));
  }

  const zipBuffer = zip.toBuffer();
  console.log(`ZIP buffer size: ${zipBuffer.length} bytes`);

  // Lưu tạm và giải nén
  const tmpDir = path.join(process.env.TEMP || '/tmp', `test-ingest-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  
  const testZipObj = new AdmZip(zipBuffer);
  testZipObj.extractAllTo(tmpDir, true);
  console.log(`Extracted to: ${tmpDir}`);

  // Test findProblemDirs
  const findProblemDirs = (dir) => {
    const found = [];
    if (!fs.existsSync(dir)) return found;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const hasDoc = Boolean(findSubdirectory(dir, ['Doc', 'doc', 'docs', 'Document', 'Documents']));
    const hasTest = Boolean(findSubdirectory(dir, ['Test', 'test', 'tests', 'Tests']));

    if (hasDoc || hasTest) {
      found.push(dir);
      return found;
    }

    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('__') && !entry.name.startsWith('.')) {
        found.push(...findProblemDirs(path.join(dir, entry.name)));
      }
    }
    return found;
  };

  const problemDirs = findProblemDirs(tmpDir);
  console.log('Found problem dirs:', problemDirs);

  for (const pDir of problemDirs) {
    console.log(`\nParsing problem dir: ${pDir}`);
    const parsed = parseProblemDirectory(pDir);
    console.log('Parsed problem result:');
    console.log({
      code: parsed.code,
      pdfPath: parsed.pdfPath,
      docxPath: parsed.docxPath,
      solutionCodesCount: parsed.solutionCodes.length,
      testCasesCount: parsed.testCases.length,
      ioType: parsed.ioType,
      ioFileName: parsed.ioFileName,
    });
    console.log('Test cases sample:', parsed.testCases.slice(0, 2));
  }

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

testZip().catch(console.error).finally(() => prisma.$disconnect());
