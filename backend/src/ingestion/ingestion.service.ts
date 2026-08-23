// ============================================
// Ingestion Service
// Core logic: scan directories, parse data,
// upload PDF, persist to database
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
const AdmZip = require('adm-zip');
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseStorageService } from './supabase-storage.service';
import {
  scanDataDirectory,
  parseProblemDirectory,
  findSubdirectory,
  ParsedProblem,
} from './file-parser.util';

// ── Types ─────────────────────────────────────

export interface IngestionResult {
  problemCode: string;
  success: boolean;
  message: string;
  details: {
    testCasesCount: number;
    solutionCodesCount: number;
    pdfUploaded: boolean;
    ioType: string;
    ioFileName: string | null;
  };
}

export interface BatchIngestionResult {
  totalProblems: number;
  successful: number;
  failed: number;
  results: IngestionResult[];
}

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: SupabaseStorageService,
  ) {}

  // ── Ingest Single Problem Directory ───────────

  /**
   * Nạp dữ liệu từ một thư mục bài tập đơn lẻ.
   *
   * Pipeline:
   * 1. Parse thư mục → ParsedProblem
   * 2. Upload PDF → Supabase Storage
   * 3. Upsert Problem record
   * 4. Upsert TestCases
   * 5. Upsert SolutionCodes
   */
  async ingestProblem(
    problemDir: string,
    overrideCode?: string,
  ): Promise<IngestionResult> {
    const parsed = parseProblemDirectory(problemDir, overrideCode);

    this.logger.log(`\n📂 Ingesting problem: ${parsed.code}`);
    this.logger.log(`   IO Type: ${parsed.ioType}`);
    this.logger.log(`   IO File: ${parsed.ioFileName || 'N/A'}`);
    this.logger.log(`   Tests: ${parsed.testCases.length}`);
    this.logger.log(`   Solutions: ${parsed.solutionCodes.length}`);
    this.logger.log(`   PDF: ${parsed.pdfPath ? '✓' : '✗'}`);

    try {
      // ── Step 1: Upload PDF ──────────────────────

      let pdfUrl: string | null = null;
      let pdfStoragePath: string | null = null;
      let pdfUploaded = false;
      let docxUrl: string | null = null;
      let guideHtml: string | null = null;

      if (parsed.pdfPath) {
        await this.storage.ensureBucket();
        const uploadResult = await this.storage.uploadProblemPdf(
          parsed.pdfPath,
          parsed.code,
        );
        if (uploadResult) {
          pdfUrl = uploadResult.publicUrl;
          pdfStoragePath = uploadResult.storagePath;
          pdfUploaded = true;
          this.logger.log(`   📤 PDF uploaded: ${pdfUrl}`);
        }
      }

      if (parsed.docxPath && fs.existsSync(parsed.docxPath)) {
        try {
          const mammoth = require('mammoth');
          const docxUpload = await this.storage.uploadProblemDocx(
            parsed.docxPath,
            parsed.code,
          );
          if (docxUpload) {
            docxUrl = docxUpload.publicUrl;
            this.logger.log(`   📤 DOCX uploaded: ${docxUrl}`);
          }
          const htmlResult = await mammoth.convertToHtml({ path: parsed.docxPath });
          guideHtml = htmlResult.value;
          this.logger.log(`   📄 DOCX converted to HTML (${guideHtml?.length || 0} chars)`);
        } catch (docxErr) {
          this.logger.warn(`   ⚠️ DOCX parse error: ${docxErr}`);
        }
      }

      // ── Step 2: Upsert Problem record ───────────

      const problem = await this.prisma.problem.upsert({
        where: { code: parsed.code },
        update: {
          ioType: parsed.ioType,
          ioFileName: parsed.ioFileName,
          pdfUrl,
          pdfStoragePath,
          docxUrl,
          guideHtml,
          isPublished: true,
          totalTests: parsed.testCases.length,
        },
        create: {
          code: parsed.code,
          title: parsed.code, // Tạm dùng mã bài làm tiêu đề
          ioType: parsed.ioType,
          ioFileName: parsed.ioFileName,
          pdfUrl,
          pdfStoragePath,
          docxUrl,
          guideHtml,
          isPublished: true,
          totalTests: parsed.testCases.length,
          timeLimitMs: parseInt(
            process.env.DEFAULT_TIME_LIMIT_MS || '1000',
            10,
          ),
          memoryLimitMb: parseInt(
            process.env.DEFAULT_MEMORY_LIMIT_MB || '256',
            10,
          ),
        },
      });

      this.logger.log(`   ✅ Problem record: ${problem.id}`);

      // ── Step 3: Upsert TestCases ────────────────

      // Xóa test cases cũ (nếu re-ingest) và insert mới
      await this.prisma.testCase.deleteMany({
        where: { problemId: problem.id },
      });

      if (parsed.testCases.length > 0) {
        await this.prisma.testCase.createMany({
          data: parsed.testCases.map((tc) => ({
            problemId: problem.id,
            testNumber: tc.testNumber,
            inputData: tc.inputData,
            outputData: tc.outputData,
            isSample: tc.testNumber <= 2, // 2 test đầu là sample
          })),
        });

        this.logger.log(
          `   ✅ ${parsed.testCases.length} test cases inserted`,
        );
      }

      // ── Step 4: Upsert SolutionCodes ────────────

      // Xóa solution codes cũ và insert mới
      await this.prisma.solutionCode.deleteMany({
        where: { problemId: problem.id },
      });

      if (parsed.solutionCodes.length > 0) {
        await this.prisma.solutionCode.createMany({
          data: parsed.solutionCodes.map((sc) => ({
            problemId: problem.id,
            label: sc.label,
            fileName: sc.fileName,
            sourceCode: sc.sourceCode,
            isPrimary: sc.isPrimary,
          })),
        });

        this.logger.log(
          `   ✅ ${parsed.solutionCodes.length} solution codes inserted`,
        );
      }

      // ── Step 5: Update totalTests ───────────────

      await this.prisma.problem.update({
        where: { id: problem.id },
        data: { totalTests: parsed.testCases.length },
      });

      return {
        problemCode: parsed.code,
        success: true,
        message: `Successfully ingested ${parsed.code}`,
        details: {
          testCasesCount: parsed.testCases.length,
          solutionCodesCount: parsed.solutionCodes.length,
          pdfUploaded,
          ioType: parsed.ioType,
          ioFileName: parsed.ioFileName,
        },
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`   ❌ Failed to ingest ${parsed.code}: ${message}`);

      return {
        problemCode: parsed.code,
        success: false,
        message: `Failed: ${message}`,
        details: {
          testCasesCount: 0,
          solutionCodesCount: 0,
          pdfUploaded: false,
          ioType: parsed.ioType,
          ioFileName: parsed.ioFileName,
        },
      };
    }
  }

  // ── Batch Ingest: Scan Full Data Directory ────

  /**
   * Scan toàn bộ thư mục Data/ và nạp tất cả bài tập.
   */
  async ingestDataDirectory(
    dataDir?: string,
  ): Promise<BatchIngestionResult> {
    const resolvedDir = dataDir || process.env.DATA_DIR || '../Data';
    const absoluteDir = path.resolve(resolvedDir);

    this.logger.log(`\n🔍 Scanning data directory: ${absoluteDir}`);

    const problemDirs = scanDataDirectory(absoluteDir);

    this.logger.log(`   Found ${problemDirs.length} problem(s)\n`);

    const results: IngestionResult[] = [];
    let successful = 0;
    let failed = 0;

    for (const dir of problemDirs) {
      const result = await this.ingestProblem(dir);
      results.push(result);

      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    }

    this.logger.log(`\n📊 Ingestion Summary:`);
    this.logger.log(`   Total: ${problemDirs.length}`);
    this.logger.log(`   ✅ Success: ${successful}`);
    this.logger.log(`   ❌ Failed: ${failed}`);

    return {
      totalProblems: problemDirs.length,
      successful,
      failed,
      results,
    };
  }

  // ── Ingest from ZIP Upload ────────────────────

  /**
   * Giải nén file ZIP và nạp dữ liệu.
   * ZIP phải có cấu trúc:
   *   PROBLEM_CODE/Doc/... + PROBLEM_CODE/Test/...
   * hoặc:
   *   Doc/... + Test/... (tự động dùng tên ZIP làm mã bài)
   */
  async ingestFromZip(
    zipBuffer: Buffer,
    originalFileName: string,
  ): Promise<IngestionResult[]> {
    const tmpDir = path.join(
      process.env.TEMP || '/tmp',
      `hsg-ingest-${Date.now()}`,
    );

    try {
      const zip = new AdmZip(zipBuffer);
      zip.extractAllTo(tmpDir, true);
      this.logger.log(`📦 Extracted ZIP "${originalFileName}" to: ${tmpDir}`);

      const results: IngestionResult[] = [];
      const baseZipCode = path
        .basename(originalFileName, path.extname(originalFileName))
        .toUpperCase();

      // Hàm đệ quy tìm tất cả thư mục chứa Doc hoặc Test
      const findProblemDirs = (dir: string): string[] => {
        const found: string[] = [];
        if (!fs.existsSync(dir)) return found;

        const entries = fs.readdirSync(dir, { withFileTypes: true });
        const hasDoc = Boolean(findSubdirectory(dir, ['Doc', 'doc', 'docs', 'Document', 'Documents']));
        const hasTest = Boolean(findSubdirectory(dir, ['Test', 'test', 'tests', 'Tests']));

        if (hasDoc || hasTest) {
          found.push(dir);
          return found;
        }

        for (const entry of entries) {
          if (
            entry.isDirectory() &&
            !entry.name.startsWith('__') &&
            !entry.name.startsWith('.')
          ) {
            found.push(...findProblemDirs(path.join(dir, entry.name)));
          }
        }
        return found;
      };

      const problemDirs = findProblemDirs(tmpDir);

      if (problemDirs.length === 0) {
        this.logger.warn(`⚠️ No Doc or Test folder found in ZIP "${originalFileName}"`);
        results.push({
          problemCode: baseZipCode,
          success: false,
          message: `Không tìm thấy thư mục Doc/ hoặc Test/ trong file ZIP "${originalFileName}". Vui lòng kiểm tra lại cấu trúc nén.`,
          details: {
            testCasesCount: 0,
            solutionCodesCount: 0,
            pdfUploaded: false,
            ioType: 'STANDARD',
            ioFileName: null,
          },
        });
      } else {
        for (const pDir of problemDirs) {
          const isRoot = pDir === tmpDir;
          const codeOverride = isRoot ? baseZipCode : undefined;
          const result = await this.ingestProblem(pDir, codeOverride);
          results.push(result);
        }
      }

      return results;
    } catch (err: any) {
      this.logger.error(`❌ ZIP extraction error: ${err.message}`);
      return [
        {
          problemCode: path
            .basename(originalFileName, path.extname(originalFileName))
            .toUpperCase(),
          success: false,
          message: `Lỗi xử lý file ZIP: ${err.message}`,
          details: {
            testCasesCount: 0,
            solutionCodesCount: 0,
            pdfUploaded: false,
            ioType: 'STANDARD',
            ioFileName: null,
          },
        },
      ];
    } finally {
      this.cleanupDir(tmpDir);
    }
  }

  // ── Get Ingestion Status ──────────────────────

  /**
   * Kiểm tra trạng thái nạp dữ liệu của một bài tập.
   */
  async getIngestionStatus(problemCode: string) {
    const problem = await this.prisma.problem.findUnique({
      where: { code: problemCode.toUpperCase() },
      include: {
        _count: {
          select: {
            testCases: true,
            solutionCodes: true,
          },
        },
      },
    });

    if (!problem) {
      return {
        exists: false,
        problemCode: problemCode.toUpperCase(),
        message: 'Problem not found in database',
      };
    }

    return {
      exists: true,
      problemCode: problem.code,
      title: problem.title,
      ioType: problem.ioType,
      ioFileName: problem.ioFileName,
      pdfUrl: problem.pdfUrl,
      totalTests: problem._count.testCases,
      totalSolutions: problem._count.solutionCodes,
      isPublished: problem.isPublished,
      timeLimitMs: problem.timeLimitMs,
      memoryLimitMb: problem.memoryLimitMb,
      createdAt: problem.createdAt,
      updatedAt: problem.updatedAt,
    };
  }

  // ── Private Helpers ───────────────────────────

  /**
   * Đảm bảo thư mục Doc/ và Test/ có đúng tên
   * (case sensitivity trên Linux)
   */
  private ensureDirectoryCase(
    dir: string,
    _problemCode: string,
  ): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const lower = entry.name.toLowerCase();
        if (lower === 'doc' && entry.name !== 'Doc') {
          fs.renameSync(
            path.join(dir, entry.name),
            path.join(dir, 'Doc'),
          );
        }
        if (lower === 'test' && entry.name !== 'Test') {
          fs.renameSync(
            path.join(dir, entry.name),
            path.join(dir, 'Test'),
          );
        }
      }
    }
  }

  /**
   * Xóa thư mục temp (recursive)
   */
  private cleanupDir(dir: string): void {
    try {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        this.logger.log(`🗑️ Cleaned up temp: ${dir}`);
      }
    } catch {
      this.logger.warn(`⚠️ Failed to clean up: ${dir}`);
    }
  }
}
