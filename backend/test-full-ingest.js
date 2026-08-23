const fs = require('fs');
const path = require('path');

// Read .env file manually
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.substring(0, idx).trim();
        let val = trimmed.substring(idx + 1).trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        process.env[key] = val;
      }
    }
  });
}

const { PrismaClient } = require('@prisma/client');
const AdmZip = require('adm-zip');
const { createClient } = require('@supabase/supabase-js');

const prisma = new PrismaClient();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const { parseProblemDirectory } = require('./dist/src/ingestion/file-parser.util');

async function main() {
  console.log('=== TESTING FULL INGESTION PIPELINE FOR TAOXAU ===');
  console.log(`Supabase URL: ${supabaseUrl}`);

  const zip = new AdmZip();
  zip.addFile('TAOXAU/Doc/TAOXAU.pdf', Buffer.from('%PDF-1.4 sample TAOXAU pdf'));
  zip.addFile('TAOXAU/Doc/TAOXAU.docx', Buffer.from('PK sample TAOXAU docx'));
  zip.addFile(
    'TAOXAU/Doc/TAOXAU.cpp',
    Buffer.from(
      `#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n  freopen("taoxau.inp", "r", stdin);\n  freopen("taoxau.out", "w", stdout);\n  string s; int k;\n  if (cin >> s >> k) {\n    cout << s.substr(0, k) << endl;\n  }\n  return 0;\n}`
    )
  );

  for (let i = 1; i <= 5; i++) {
    const pad = i < 10 ? `0${i}` : `${i}`;
    zip.addFile(`TAOXAU/Test/Test${pad}/TAOXAU.INP`, Buffer.from(`input_${i}\n`));
    zip.addFile(`TAOXAU/Test/Test${pad}/TAOXAU.OUT`, Buffer.from(`output_${i}\n`));
  }

  const tmpDir = path.join(process.env.TEMP || '/tmp', `full-ingest-${Date.now()}`);
  zip.extractAllTo(tmpDir, true);

  const problemDir = path.join(tmpDir, 'TAOXAU');
  const parsed = parseProblemDirectory(problemDir);

  console.log('Parsed:', {
    code: parsed.code,
    tests: parsed.testCases.length,
    solutions: parsed.solutionCodes.length,
  });

  // Step 1: Upload PDF to Supabase
  let pdfUrl = null;
  let pdfStoragePath = null;
  if (parsed.pdfPath) {
    const fileBuffer = fs.readFileSync(parsed.pdfPath);
    const storagePath = `problems/${parsed.code}/${path.basename(parsed.pdfPath)}`;
    console.log(`Uploading PDF to Supabase Storage: ${storagePath}...`);
    const { data, error } = await supabase.storage
      .from('problem-pdfs')
      .upload(storagePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (error) {
      console.error('❌ Supabase PDF upload error:', error);
    } else {
      const { data: pubData } = supabase.storage
        .from('problem-pdfs')
        .getPublicUrl(storagePath);
      pdfUrl = pubData.publicUrl;
      pdfStoragePath = storagePath;
      console.log('✅ Supabase PDF URL:', pdfUrl);
    }
  }

  // Step 2: Database Upsert
  console.log('Upserting Problem to PostgreSQL...');
  const problem = await prisma.problem.upsert({
    where: { code: parsed.code },
    update: {
      ioType: parsed.ioType,
      ioFileName: parsed.ioFileName,
      pdfUrl,
      pdfStoragePath,
      isPublished: true,
      totalTests: parsed.testCases.length,
    },
    create: {
      code: parsed.code,
      title: parsed.code,
      ioType: parsed.ioType,
      ioFileName: parsed.ioFileName,
      pdfUrl,
      pdfStoragePath,
      isPublished: true,
      totalTests: parsed.testCases.length,
      timeLimitMs: 1000,
      memoryLimitMb: 256,
    },
  });
  console.log('✅ Problem record created/updated:', problem.id, problem.code);

  // Step 3: TestCases
  await prisma.testCase.deleteMany({ where: { problemId: problem.id } });
  await prisma.testCase.createMany({
    data: parsed.testCases.map((tc) => ({
      problemId: problem.id,
      testNumber: tc.testNumber,
      inputData: tc.inputData,
      outputData: tc.outputData,
      isSample: tc.testNumber <= 2,
    })),
  });
  console.log(`✅ ${parsed.testCases.length} TestCases saved!`);

  // Step 4: Solutions
  await prisma.solutionCode.deleteMany({ where: { problemId: problem.id } });
  await prisma.solutionCode.createMany({
    data: parsed.solutionCodes.map((sc) => ({
      problemId: problem.id,
      label: sc.label,
      fileName: sc.fileName,
      sourceCode: sc.sourceCode,
      isPrimary: sc.isPrimary,
    })),
  });
  console.log(`✅ ${parsed.solutionCodes.length} SolutionCodes saved!`);

  fs.rmSync(tmpDir, { recursive: true, force: true });
}

main().catch(console.error).finally(() => prisma.$disconnect());
