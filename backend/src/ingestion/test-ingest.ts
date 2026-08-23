// ============================================
// Test Ingestion Script (Standalone)
// Chạy trực tiếp: npx ts-node src/ingestion/test-ingest.ts
// ============================================

import * as path from 'path';
import {
  scanDataDirectory,
  parseProblemDirectory,
  normalizeLineEndings,
} from './file-parser.util';

// ── Config ────────────────────────────────────

const DATA_DIR = process.argv[2] || path.resolve(__dirname, '../../Data');

// ── Main ──────────────────────────────────────

function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  HSG Judge — Ingestion Test (Offline)     ');
  console.log('═══════════════════════════════════════════');
  console.log(`\n📁 Data directory: ${DATA_DIR}\n`);

  // Step 1: Scan for problem directories
  let problemDirs: string[];
  try {
    problemDirs = scanDataDirectory(DATA_DIR);
  } catch (err) {
    console.error(`❌ Error scanning directory: ${err}`);
    process.exit(1);
  }

  console.log(`🔍 Found ${problemDirs.length} problem(s):\n`);

  // Step 2: Parse each problem
  for (const dir of problemDirs) {
    const parsed = parseProblemDirectory(dir);

    console.log(`┌──────────────────────────────────────────`);
    console.log(`│ 📋 Problem: ${parsed.code}`);
    console.log(`├──────────────────────────────────────────`);
    console.log(`│  IO Type:       ${parsed.ioType}`);
    console.log(`│  IO File Name:  ${parsed.ioFileName || 'N/A (stdin/stdout)'}`);
    console.log(`│  PDF:           ${parsed.pdfPath ? '✅ ' + path.basename(parsed.pdfPath) : '❌ Not found'}`);
    console.log(`│  DOCX:          ${parsed.docxPath ? '✅ ' + path.basename(parsed.docxPath) : '❌ Not found'}`);

    // Solution codes
    console.log(`│`);
    console.log(`│  💻 Solution Codes (${parsed.solutionCodes.length}):`);
    for (const sc of parsed.solutionCodes) {
      const primaryBadge = sc.isPrimary ? ' ⭐' : '';
      const lines = sc.sourceCode.split('\n').length;
      console.log(`│    - ${sc.fileName} → "${sc.label}" (${lines} lines)${primaryBadge}`);
    }

    // Test cases
    console.log(`│`);
    console.log(`│  🧪 Test Cases (${parsed.testCases.length}):`);

    const maxPreview = 5;
    const previewTests = parsed.testCases.slice(0, maxPreview);

    for (const tc of previewTests) {
      const inputPreview = tc.inputData.split('\n')[0].substring(0, 40);
      const outputPreview = tc.outputData.split('\n')[0].substring(0, 40);
      console.log(`│    Test ${String(tc.testNumber).padStart(2, '0')}: INP="${inputPreview}..." → OUT="${outputPreview}..."`);
    }

    if (parsed.testCases.length > maxPreview) {
      console.log(`│    ... và ${parsed.testCases.length - maxPreview} test(s) khác`);
    }

    // Validate line endings
    const hasWindowsEndings = parsed.testCases.some(
      (tc) => tc.inputData.includes('\r') || tc.outputData.includes('\r'),
    );
    if (hasWindowsEndings) {
      console.log(`│`);
      console.log(`│  ⚠️  WARNING: Windows line endings detected (should be normalized)`);
    } else {
      console.log(`│`);
      console.log(`│  ✅ Line endings normalized correctly`);
    }

    console.log(`└──────────────────────────────────────────\n`);
  }

  // Summary
  console.log('═══════════════════════════════════════════');
  console.log(`  ✅ Parsed ${problemDirs.length} problem(s) successfully`);
  console.log(`  ℹ️  Run with database: npm run start:dev`);
  console.log(`     Then POST /api/ingestion/scan-directory`);
  console.log('═══════════════════════════════════════════');
}

main();
