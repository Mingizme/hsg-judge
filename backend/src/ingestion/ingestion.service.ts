// ============================================
// Ingestion Service
// Core logic: scan directories, parse data,
// upload PDF/DOCX, persist to database
// Nguyên tắc: Tên file không quan trọng, loại tệp quyết định:
//   - .pdf: Luôn là Đề bài
//   - .docx: Luôn là Hướng dẫn giải
//   - .cpp: Luôn là Code mẫu
// ============================================

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
const AdmZip = require('adm-zip');
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseStorageService } from './supabase-storage.service';
import {
  scanDataDirectory,
  parseProblemDirectory,
  findSubdirectory,
  looksLikeProblemDir,
  DOC_DIR_NAMES,
  TEST_DIR_NAMES,
  ParsedProblem,
} from './file-parser.util';

// ── Types ─────────────────────────────────────

/**
 * Số test đầu tiên được đánh dấu công khai (hiện ở tab Đề bài cho học sinh).
 *
 * Quy ước của bộ đề HSG: Test01/Test02 là ví dụ mẫu in trong đề. Đặt tên hằng
 * để chỗ này không còn là con số `2` vô danh nằm giữa logic, và có thể sửa
 * bằng biến môi trường nếu bộ đề dùng quy ước khác.
 */
const SAMPLE_TEST_COUNT = Math.max(
  0,
  parseInt(process.env.SAMPLE_TEST_COUNT || '2', 10) || 0,
);

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

  /** Thư mục dữ liệu chuẩn của hệ thống */
  private get dataRoot(): string {
    return path.resolve(
      process.env.DATA_DIR || path.resolve(process.cwd(), '..', 'Data'),
    );
  }

  /**
   * Những gốc thư mục mà API được phép đọc.
   *
   * `POST /ingestion/ingest-single` nhận thẳng đường dẫn từ thân yêu cầu, nên
   * không có kiểm tra này thì bất kỳ ai cũng gọi được với `C:\Users\...` để buộc
   * máy chủ đọc tài liệu ở nơi khác rồi ghi vào cơ sở dữ liệu. Chỉ cho phép khu
   * vực dữ liệu của dự án, thư mục tạm khi giải nén ZIP, và các gốc khai báo
   * thêm qua biến môi trường `INGEST_ALLOWED_ROOTS`.
   */
  private get allowedRoots(): string[] {
    const extra = (process.env.INGEST_ALLOWED_ROOTS || '')
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => path.resolve(s));

    return [
      this.dataRoot,
      path.resolve(process.cwd(), 'tmp'),
      path.resolve(process.cwd()),
      path.resolve(process.cwd(), '..'),
      ...extra,
    ];
  }

  private assertAllowedDir(dir: string): string {
    const abs = path.resolve(dir);
    const ok = this.allowedRoots.some(
      (root) => abs === root || abs.startsWith(root + path.sep),
    );
    if (!ok) {
      throw new BadRequestException(
        'Đường dẫn nằm ngoài khu vực dữ liệu được phép nạp. ' +
          'Hãy đặt thư mục trong Data/ hoặc khai báo INGEST_ALLOWED_ROOTS.',
      );
    }
    return abs;
  }

  /**
   * Thoát ký tự HTML trước khi ghép vào chuỗi thẻ.
   *
   * Đề Tin học đầy dấu `<`: ràng buộc `1 <= n <= 10^5` nếu ghép thẳng vào
   * `<p>...</p>` sẽ bị trình duyệt hiểu là thẻ mở và **ăn mất** phần ràng buộc.
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Trích xuất văn bản từ file PDF và định dạng thành HTML sư phạm.
   *
   * Bản cũ bọc MỖI DÒNG vào một thẻ `<p>` và bỏ hết dòng trống, nên đề bài mất
   * sạch cấu trúc đoạn, còn khối "Ví dụ" — nơi việc thẳng cột của dữ liệu vào/ra
   * là toàn bộ ý nghĩa — bị xé thành hàng chục đoạn rời. Nay dòng trống được
   * dùng làm ranh giới đoạn, và phần ví dụ giữ nguyên văn trong `<pre>`.
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

      const lines: string[] = clean.split('\n').map((l: string) => l.trimEnd());

      // Tiền tố liệt kê hay gặp trong đề: `*`, `-`, `1.`, `a)`
      const BULLET = String.raw`^[\s*\-•]*(?:\d+[.)]\s*|[a-h][.)]\s*)?`;
      const SECTIONS: { re: RegExp; html: string; example?: boolean }[] = [
        {
          re: new RegExp(`${BULLET}(input|dữ liệu vào|đầu vào)\\b`, 'i'),
          html: '<h3>📥 Quy cách Dữ liệu vào (Input)</h3>',
        },
        {
          re: new RegExp(
            `${BULLET}(output|kết quả ra|dữ liệu ra|đầu ra)\\b`,
            'i',
          ),
          html: '<h3>📤 Quy cách Kết quả ra (Output)</h3>',
        },
        {
          re: new RegExp(`${BULLET}(ví dụ|example|sample|test mẫu)\\b`, 'i'),
          html: '<h3>📊 Ví dụ mẫu (Example)</h3>',
          example: true,
        },
        {
          re: new RegExp(
            `${BULLET}(ràng buộc|giới hạn|subtask|constraints|chú ý|lưu ý)\\b`,
            'i',
          ),
          html: '<h3>🎯 Giới hạn & Ràng buộc</h3>',
        },
      ];

      let html = '';
      let para: string[] = [];
      let pre: string[] = [];
      let inExample = false;

      const flushPara = () => {
        if (para.length === 0) return;
        html += `<p>${this.escapeHtml(para.join(' '))}</p>`;
        para = [];
      };
      const flushPre = () => {
        while (pre.length > 0 && !pre[0].trim()) pre.shift();
        while (pre.length > 0 && !pre[pre.length - 1].trim()) pre.pop();
        if (pre.length === 0) return;
        html += `<pre class="whitespace-pre-wrap">${this.escapeHtml(
          pre.join('\n'),
        )}</pre>`;
        pre = [];
      };

      for (const line of lines) {
        // Chỉ coi là tiêu đề khi dòng ngắn như một tiêu đề thật hoặc có dấu hai
        // chấm. Nếu không, một câu văn bình thường như "Ví dụ với n = 5 thì …"
        // sẽ bị hiểu là mốc mở đầu phần Ví dụ và kéo cả phần còn lại vào `<pre>`.
        const t = line.trim();
        const headingLike = t.length <= 64 || /[:：]/.test(t.slice(0, 40));
        const section = headingLike
          ? SECTIONS.find((s) => s.re.test(line))
          : undefined;

        if (section) {
          flushPara();
          flushPre();
          inExample = Boolean(section.example);
          html += section.html;
          // Phần nội dung viết ngay sau tiêu đề trên cùng một dòng
          const rest = line.replace(section.re, '').replace(/^[:\s.-]+/, '');
          if (rest.trim()) {
            if (inExample) pre.push(rest);
            else para.push(rest);
          }
          continue;
        }

        if (inExample) {
          pre.push(line);
          continue;
        }

        if (!line.trim()) {
          flushPara();
          continue;
        }
        para.push(line.trim());
      }

      flushPara();
      flushPre();

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
    const safeDir = this.assertAllowedDir(problemDir);
    const parsed = parseProblemDirectory(safeDir, overrideCode);

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

      // Đề bài ưu tiên PDF. Nếu gói đề KHÔNG có PDF thì đành dùng DOCX làm đề,
      // nhưng khi đó tab Hướng dẫn phải để trống — trước đây cùng một nội dung
      // hiện ở cả hai tab, học sinh mở "Hướng dẫn giải" lại thấy đúng đề bài.
      const usedDocxAsStatement = !statementHtml && Boolean(guideHtml);
      const finalDescription =
        statementHtml ||
        guideHtml ||
        (options?.title
          ? `Bài toán ${options.title}`
          : `Bài toán ${parsed.code}`);
      const finalGuideHtml = usedDocxAsStatement ? null : guideHtml;

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
          // `?? undefined` là BẮT BUỘC ở nhánh update: Prisma coi `null` là
          // "ghi NULL", còn `undefined` là "giữ nguyên". Trước đây truyền thẳng
          // `pdfUrl` nên nạp lại một gói đề thiếu PDF — hoặc chỉ cần Supabase
          // Storage lỗi một nhịp — là XOÁ MẤT đường dẫn đề bài đang chạy tốt.
          pdfUrl: pdfUrl ?? undefined,
          pdfStoragePath: pdfStoragePath ?? undefined,
          docxUrl: docxUrl ?? undefined,
          guideHtml: finalGuideHtml ?? undefined,
          // KHÔNG tự publish lại khi cập nhật: giáo viên có thể đã chủ ý ẩn bài.
          // Trạng thái phát hành do Teacher Portal quyết định, không do ingestion.
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

      // ── Step 3 & 4: Thay bộ TestCase + SolutionCode NGUYÊN TỬ ──
      //
      // Trước đây `deleteMany` rồi `createMany` chạy rời nhau: `createMany`
      // fail (payload quá lớn, mất kết nối Postgres) là bài còn 0 test trong
      // khi `totalTests` đã ghi số mới — một lần nạp lỗi mất sạch bộ test.
      // Gói vào transaction để hoặc thay được hết, hoặc giữ nguyên dữ liệu cũ.
      await this.prisma.$transaction(async (tx) => {
        await tx.testCase.deleteMany({ where: { problemId: problem.id } });

        if (parsed.testCases.length > 0) {
          await tx.testCase.createMany({
            data: parsed.testCases.map((tc) => ({
              problemId: problem.id,
              testNumber: tc.testNumber,
              inputData: tc.inputData,
              outputData: tc.outputData,
              isSample: tc.testNumber <= SAMPLE_TEST_COUNT,
            })),
          });
        }

        await tx.solutionCode.deleteMany({ where: { problemId: problem.id } });

        if (parsed.solutionCodes.length > 0) {
          await tx.solutionCode.createMany({
            data: parsed.solutionCodes.map((sc) => ({
              problemId: problem.id,
              label: sc.label,
              fileName: sc.fileName,
              sourceCode: sc.sourceCode,
              language: 'cpp',
              isPrimary: sc.isPrimary,
            })),
          });
        }

        // `totalTests` chỉ cập nhật khi bộ test mới đã vào an toàn.
        await tx.problem.update({
          where: { id: problem.id },
          data: { totalTests: parsed.testCases.length },
        });
      });

      this.logger.log(`   ✅ ${parsed.testCases.length} test case(s) inserted`);
      this.logger.log(
        `   ✅ ${parsed.solutionCodes.length} solution code(s) inserted`,
      );

      // Nạp xong nhưng thiếu dữ liệu cốt lõi vẫn là "thành công" về mặt ghi cơ
      // sở dữ liệu — phải nói rõ ra, nếu không giáo viên tưởng bài đã đủ trong
      // khi không có test để chấm hay không có lời giải để sinh sơ đồ.
      const warnings: string[] = [];
      if (parsed.testCases.length === 0) {
        warnings.push('KHÔNG tìm thấy test nào (bài sẽ không chấm được)');
      }
      if (parsed.solutionCodes.length === 0) {
        warnings.push(
          'KHÔNG tìm thấy lời giải mẫu .cpp (không sinh được sơ đồ & code khuyết)',
        );
      }
      if (!parsed.pdfPath && !parsed.docxPath) {
        warnings.push('KHÔNG tìm thấy tệp đề bài .pdf/.docx');
      }
      for (const w of warnings) this.logger.warn(`   ⚠️ ${w}`);

      return {
        problemCode: parsed.code,
        success: true,
        message:
          warnings.length === 0
            ? `Problem "${parsed.code}" ingested successfully.`
            : `Problem "${parsed.code}" ingested with warnings: ${warnings.join('; ')}`,
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
    const resolvedDataDir = this.assertAllowedDir(dataDir || this.dataRoot);

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

  /**
   * Giải nén ZIP một cách an toàn.
   *
   * `zip.extractAllTo()` của adm-zip KHÔNG kiểm tra tên entry, nên một entry
   * tên `../../src/main.ts` ghi được ra ngoài thư mục tạm (lỗ hổng Zip Slip,
   * CVE-2018-1002204). Endpoint `upload-zip` lại chưa có xác thực, nên đây là
   * đường ghi file tuỳ ý lên máy chủ. Ở đây tự duyệt từng entry và chỉ ghi khi
   * đường dẫn tuyệt đối vẫn nằm trong `destDir`.
   */
  private extractZipSafely(zipBuffer: Buffer, destDir: string): number {
    const zip = new AdmZip(zipBuffer);
    const root = path.resolve(destDir);
    let skipped = 0;

    for (const entry of zip.getEntries()) {
      const name = String(entry.entryName || '').replace(/\\/g, '/');

      // Rác của macOS và tệp ẩn: không cần nạp
      if (!name || name.startsWith('__MACOSX/') || name.startsWith('.')) {
        continue;
      }
      // Chặn thẳng mọi entry có thành phần `..` hoặc đường dẫn tuyệt đối
      if (name.split('/').includes('..') || path.isAbsolute(name)) {
        this.logger.warn(`   ⛔ Bỏ qua entry ZIP đáng ngờ: ${name}`);
        skipped++;
        continue;
      }

      const target = path.resolve(root, name);
      if (target !== root && !target.startsWith(root + path.sep)) {
        this.logger.warn(`   ⛔ Entry ZIP thoát khỏi thư mục tạm: ${name}`);
        skipped++;
        continue;
      }

      if (entry.isDirectory) {
        fs.mkdirSync(target, { recursive: true });
        continue;
      }

      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, entry.getData());
    }

    return skipped;
  }

  async ingestFromZip(
    zipBuffer: Buffer,
    originalFileName?: string,
    options?: IngestionOptions,
    overrideCode?: string,
  ): Promise<IngestionResult[]> {
    const tempDir = path.join(
      process.cwd(),
      'tmp',
      `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );

    try {
      fs.mkdirSync(tempDir, { recursive: true });
      const skipped = this.extractZipSafely(zipBuffer, tempDir);

      this.logger.log(
        `📦 Extracted ZIP to temporary dir: ${tempDir}` +
          (skipped > 0 ? ` (đã bỏ ${skipped} entry không an toàn)` : ''),
      );

      // Tìm tất cả các thư mục con có thể là bài tập
      let targetDirs: string[] = [];
      const entries = fs.readdirSync(tempDir, { withFileTypes: true });
      const visibleEntries = entries.filter((e: any) => !e.name.startsWith('.') && !e.name.startsWith('__MACOSX'));

      // Kiểm tra nếu tempDir chính là 1 thư mục bài tập (chứa Doc/ hoặc Test/)
      const hasDirectDoc = Boolean(findSubdirectory(tempDir, DOC_DIR_NAMES));
      const hasDirectTest = Boolean(findSubdirectory(tempDir, TEST_DIR_NAMES));

      if (hasDirectDoc || hasDirectTest) {
        targetDirs.push(tempDir);
      } else {
        const subDirs = visibleEntries
          .filter((e: any) => e.isDirectory())
          .map((e: any) => path.join(tempDir, e.name));
        // Chỉ nhận thư mục con trông giống gói bài tập; nếu không có thư mục nào
        // đạt thì mới lấy tất cả. Trước đây mọi thư mục con đều thành một "bài",
        // nên một gói kèm thư mục `anh/` hay `backup/` sinh ra bài rỗng rác.
        const looksLike = subDirs.filter((d: string) => looksLikeProblemDir(d));
        targetDirs = looksLike.length > 0 ? looksLike : subDirs;
      }

      if (targetDirs.length === 0) {
        targetDirs.push(tempDir);
      }

      const results: IngestionResult[] = [];
      const singleTarget = targetDirs.length === 1;

      for (const dir of targetDirs) {
        let code = path.basename(dir);

        // `overrideCode` chỉ áp được khi ZIP chứa đúng một bài — nếu không thì
        // mọi bài trong gói sẽ bị gán cùng một mã và ghi đè lẫn nhau.
        if (overrideCode && singleTarget) {
          code = overrideCode.replace(/\.zip$/i, '');
        } else if (dir === tempDir && originalFileName) {
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

  /**
   * Nạp ZIP chứa đúng một bài, có thể chỉ định mã bài.
   *
   * Trước đây hàm này truyền `overrideCode` vào đúng vị trí tham số
   * `originalFileName` của `ingestFromZip`, nên mã chỉ định bị bỏ qua âm thầm
   * mỗi khi ZIP có thư mục con. Nay `overrideCode` là tham số riêng.
   */
  async ingestZipFile(
    zipBuffer: Buffer,
    overrideCode?: string,
    options?: IngestionOptions,
  ): Promise<IngestionResult> {
    const results = await this.ingestFromZip(
      zipBuffer,
      overrideCode,
      options,
      overrideCode,
    );
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
