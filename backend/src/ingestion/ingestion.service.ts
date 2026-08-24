// ============================================
// Ingestion Service
// Core logic: scan directories, parse data,
// upload PDF/DOCX, persist to database
// Nguyên tắc: Tên file không quan trọng, loại tệp quyết định:
//   - .pdf: Luôn là Đề bài
//   - .docx: Luôn là Hướng dẫn giải
//   - .cpp: Luôn là Code mẫu
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

export interface IngestionOptions {
  title?: string;
  difficulty?: string;
  category?: string;
  createdBy?: string;
  timeLimitMs?: number;
  memoryLimitMb?: number;
}

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

  /**
   * Trích xuất văn bản từ file PDF và định dạng thành HTML sư phạm
   */
  private async extractStatementFromPdf(pdfPath: string): Promise<string> {
    try {
      const { PDFParse } = require('pdf-parse');
      const pdfBuffer = fs.readFileSync(pdfPath);
      const parser = new PDFParse({ data: pdfBuffer, verbosity: 0 });
      await parser.load();
      const textResult = await parser.getText();
      const rawText = textResult?.text || '';

      if (!rawText.trim()) return '';

      // Chuẩn hóa và làm sạch văn bản
      const clean = rawText
        .replace(/--\s*\d+\s*of\s*\d+\s*--/gi, '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim();

      const lines = clean.split('\n').map((l: string) => l.trim()).filter(Boolean);

      let html = '';
      for (const line of lines) {
        if (/^(\*|\d+\.|\-)\s*(input|đầu vào|dữ liệu vào)/i.test(line)) {
          const content = line.replace(/^(\*|\d+\.|\-)\s*(input|đầu vào|dữ liệu vào)[:\s]*/i, '');
          html += `<h3>📥 Quy cách Dữ liệu vào (Input)</h3><p>${content}</p>`;
        } else if (/^(\*|\d+\.|\-)\s*(output|đầu ra|kết quả ra|kết quả)/i.test(line)) {
          const content = line.replace(/^(\*|\d+\.|\-)\s*(output|đầu ra|kết quả ra|kết quả)[:\s]*/i, '');
          html += `<h3>📤 Quy cách Kết quả ra (Output)</h3><p>${content}</p>`;
        } else if (/^(\*|\d+\.|\-)\s*(example|ví dụ|ví dụ mẫu)/i.test(line)) {
          html += `<h3>📊 Ví dụ mẫu (Example)</h3>`;
        } else if (/^(\*|\d+\.|\-)\s*(ràng buộc|subtasks|giới hạn|chú ý)/i.test(line)) {
          html += `<h3>🎯 Giới hạn & Ràng buộc</h3><p>${line}</p>`;
        } else if (line.startsWith('-')) {
          html += `<p class="pl-4"><strong>${line}</strong></p>`;
        } else {
          html += `<p>${line}</p>`;
        }
      }

      return html;
    } catch (err) {
      this.logger.warn(`   ⚠️ PDF text extraction warning: ${err}`);
      return '';
    }
  }

  // ── Ingest Single Problem Directory ───────────

  /**
   * Nạp dữ liệu từ một thư mục bài tập đơn lẻ.
   */
  async ingestProblem(
    problemDir: string,
    overrideCode?: string,
    options?: IngestionOptions,
  ): Promise<IngestionResult> {
    const parsed = parseProblemDirectory(problemDir, overrideCode);

    this.logger.log(`\n📂 Ingesting problem: ${parsed.code}`);
    this.logger.log(`   IO Type: ${parsed.ioType}`);
    this.logger.log(`   IO File: ${parsed.ioFileName || 'N/A'}`);
    this.logger.log(`   Tests: ${parsed.testCases.length}`);
    this.logger.log(`   Solutions: ${parsed.solutionCodes.length}`);
    this.logger.log(`   PDF: ${parsed.pdfPath ? '✓' : '✗'}`);
    this.logger.log(`   DOCX: ${parsed.docxPath ? '✓' : '✗'}`);

    try {
      // ── Step 1: Upload Documents & Extract Text ──

      let pdfUrl: string | null = null;
      let pdfStoragePath: string | null = null;
      let pdfUploaded = false;
      let docxUrl: string | null = null;
      let statementHtml: string | null = null;
      let guideHtml: string | null = null;

      // 1.1 Xử lý PDF (Đề bài)
      if (parsed.pdfPath && fs.existsSync(parsed.pdfPath)) {
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

        // Tự động trích xuất nguyên văn text từ PDF
        statementHtml = await this.extractStatementFromPdf(parsed.pdfPath);
        if (statementHtml) {
          this.logger.log(`   📄 Extracted Statement HTML from PDF (${statementHtml.length} chars)`);
        }
      }

      // 1.2 Xử lý DOCX (Hướng dẫn giải)
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
          this.logger.log(`   📄 DOCX converted to Guide HTML (${guideHtml?.length || 0} chars)`);
        } catch (docxErr) {
          this.logger.warn(`   ⚠️ DOCX parse error: ${docxErr}`);
        }
      }

      // Nếu không có PDF mà có DOCX, dùng DOCX cho cả Đề bài nếu cần
      const finalDescription = statementHtml || guideHtml || (options?.title ? `Bài toán ${options.title}` : `Bài toán ${parsed.code}`);
      const finalGuideHtml = guideHtml || statementHtml;

      // ── Step 2: Upsert Problem record ───────────

      const problem = await this.prisma.problem.upsert({
        where: { code: parsed.code },
        update: {
          title: options?.title || undefined,
          difficulty: (options?.difficulty as any) || undefined,
          createdBy: options?.createdBy || undefined,
          ioType: parsed.ioType,
          ioFileName: parsed.ioFileName,
          description: finalDescription,
          pdfUrl,
          pdfStoragePath,
          docxUrl,
          guideHtml: finalGuideHtml,
          isPublished: true,
          totalTests: parsed.testCases.length,
          timeLimitMs: options?.timeLimitMs || undefined,
          memoryLimitMb: options?.memoryLimitMb || undefined,
        },
        create: {
          code: parsed.code,
          title: options?.title || parsed.code,
          difficulty: (options?.difficulty as any) || 'MEDIUM',
          createdBy: options?.createdBy || null,
          ioType: parsed.ioType,
          ioFileName: parsed.ioFileName,
          description: finalDescription,
          pdfUrl,
          pdfStoragePath,
          docxUrl,
          guideHtml: finalGuideHtml,
          isPublished: true,
          totalTests: parsed.testCases.length,
          timeLimitMs:
            options?.timeLimitMs ||
            parseInt(process.env.DEFAULT_TIME_LIMIT_MS || '1000', 10),
          memoryLimitMb:
            options?.memoryLimitMb ||
            parseInt(process.env.DEFAULT_MEMORY_LIMIT_MB || '256', 10),
        },
      });

      // Gắn category nếu có
      if (options?.category) {
        try {
          const catName = options.category.trim();
          const slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'general';
          const cat = await this.prisma.category.upsert({
            where: { slug },
            update: { name: catName, nameVi: catName },
            create: {
              name: catName,
              nameVi: catName,
              slug,
              color: '#3b82f6',
            },
          });
          await this.prisma.problemTag.upsert({
            where: {
              problemId_categoryId: {
                problemId: problem.id,
                categoryId: cat.id,
              },
            },
            update: {},
            create: {
              problemId: problem.id,
              categoryId: cat.id,
            },
          });
        } catch (catErr) {
          this.logger.warn(`   ⚠️ Category tag error: ${catErr}`);
        }
      }

      this.logger.log(`   ✅ Problem record: ${problem.id}`);

      // ── Step 3: Upsert TestCases ────────────────

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
            isSample: tc.testNumber <= 2,
          })),
        });

        this.logger.log(
          `   ✅ ${parsed.testCases.length} test cases inserted`,
        );
      }

      // ── Step 4: Upsert SolutionCodes ────────────

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
            language: 'cpp',
            isPrimary: sc.isPrimary,
          })),
        });

        this.logger.log(
          `   ✅ ${parsed.solutionCodes.length} solution code(s) inserted`,
        );
      }

      return {
        problemCode: parsed.code,
        success: true,
        message: `Problem "${parsed.code}" ingested successfully.`,
        details: {
          testCasesCount: parsed.testCases.length,
          solutionCodesCount: parsed.solutionCodes.length,
          pdfUploaded,
          ioType: parsed.ioType,
          ioFileName: parsed.ioFileName,
        },
      };
    } catch (error) {
      this.logger.error(
        `   ❌ Error ingesting "${parsed.code}":`,
        error instanceof Error ? error.stack : error,
      );
      return {
        problemCode: parsed.code,
        success: false,
        message: `Failed to ingest "${parsed.code}": ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          testCasesCount: parsed.testCases.length,
          solutionCodesCount: parsed.solutionCodes.length,
          pdfUploaded: false,
          ioType: parsed.ioType,
          ioFileName: parsed.ioFileName,
        },
      };
    }
  }

  // ── Ingest All Problems in Data/ ──────────────

  async ingestAll(dataDir?: string): Promise<BatchIngestionResult> {
    const resolvedDataDir =
      dataDir ||
      process.env.DATA_DIR ||
      path.resolve(process.cwd(), '..', 'Data');

    this.logger.log(`\n========================================`);
    this.logger.log(`🚀 Starting batch ingestion`);
    this.logger.log(`   Source directory: ${resolvedDataDir}`);
    this.logger.log(`========================================`);

    const problemDirs = scanDataDirectory(resolvedDataDir);

    if (problemDirs.length === 0) {
      this.logger.warn(`⚠️ No problem directories found in: ${resolvedDataDir}`);
      return {
        totalProblems: 0,
        successful: 0,
        failed: 0,
        results: [],
      };
    }

    this.logger.log(`Found ${problemDirs.length} problem directory(ies).`);

    const results: IngestionResult[] = [];
    let successful = 0;
    let failed = 0;

    for (const pDir of problemDirs) {
      const result = await this.ingestProblem(pDir);
      results.push(result);
      if (result.success) successful++;
      else failed++;
    }

    return {
      totalProblems: problemDirs.length,
      successful,
      failed,
      results,
    };
  }

  async ingestDataDirectory(dataDir?: string): Promise<BatchIngestionResult> {
    return this.ingestAll(dataDir);
  }

  // ── Ingest Uploaded ZIP File ──────────────────

  async ingestFromZip(
    zipBuffer: Buffer,
    originalFileName?: string,
    options?: IngestionOptions,
  ): Promise<IngestionResult[]> {
    const tempDir = path.join(
      process.cwd(),
      'tmp',
      `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );

    try {
      fs.mkdirSync(tempDir, { recursive: true });
      const zip = new AdmZip(zipBuffer);
      zip.extractAllTo(tempDir, true);

      this.logger.log(`📦 Extracted ZIP to temporary dir: ${tempDir}`);

      // Tìm tất cả các thư mục con có thể là bài tập
      let targetDirs: string[] = [];
      const entries = fs.readdirSync(tempDir, { withFileTypes: true });
      const visibleEntries = entries.filter((e: any) => !e.name.startsWith('.') && !e.name.startsWith('__MACOSX'));

      // Kiểm tra nếu tempDir chính là 1 thư mục bài tập (chứa Doc/ hoặc Test/)
      const hasDirectDoc = Boolean(findSubdirectory(tempDir, ['Doc', 'doc', 'docs']));
      const hasDirectTest = Boolean(findSubdirectory(tempDir, ['Test', 'test', 'tests']));

      if (hasDirectDoc || hasDirectTest) {
        targetDirs.push(tempDir);
      } else {
        for (const entry of visibleEntries) {
          if (entry.isDirectory()) {
            targetDirs.push(path.join(tempDir, entry.name));
          }
        }
      }

      if (targetDirs.length === 0) {
        targetDirs.push(tempDir);
      }

      const results: IngestionResult[] = [];
      for (const dir of targetDirs) {
        let code = path.basename(dir);
        if (dir === tempDir && originalFileName) {
          code = originalFileName.replace(/\.zip$/i, '');
        }
        const res = await this.ingestProblem(dir, code.toUpperCase(), options);
        results.push(res);
      }

      return results;
    } finally {
      try {
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      } catch (cleanupErr) {
        this.logger.warn(`⚠️ Could not clean temp dir: ${cleanupErr}`);
      }
    }
  }

  async ingestZipFile(
    zipBuffer: Buffer,
    overrideCode?: string,
    options?: IngestionOptions,
  ): Promise<IngestionResult> {
    const results = await this.ingestFromZip(zipBuffer, overrideCode, options);
    return results[0];
  }

  async getIngestionStatus(problemCode: string) {
    const problem = await this.prisma.problem.findUnique({
      where: { code: problemCode.toUpperCase() },
      include: {
        _count: { select: { testCases: true, solutionCodes: true } },
      },
    });

    return {
      problemCode,
      exists: Boolean(problem),
      totalTests: problem?._count.testCases || 0,
      totalSolutions: problem?._count.solutionCodes || 0,
      pdfUrl: problem?.pdfUrl || null,
      docxUrl: problem?.docxUrl || null,
    };
  }
}
