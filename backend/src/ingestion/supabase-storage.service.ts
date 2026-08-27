// ============================================
// Supabase Storage Service
// Upload PDF/documents lên Supabase Storage
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SupabaseStorageService {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private supabase: SupabaseClient;
  private bucket: string;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.bucket = process.env.SUPABASE_STORAGE_BUCKET || 'problem-pdfs';

    if (!supabaseUrl || !supabaseKey) {
      this.logger.warn(
        '⚠️ Supabase credentials not configured. Storage uploads will be skipped.',
      );
      this.supabase = null as any;
      return;
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Kiểm tra xem Supabase Storage đã được cấu hình chưa
   */
  isConfigured(): boolean {
    return !!this.supabase;
  }

  /**
   * Tạo bucket nếu chưa tồn tại
   */
  async ensureBucket(): Promise<void> {
    if (!this.isConfigured()) return;

    const { data: buckets, error } = await this.supabase.storage.listBuckets();

    if (error) {
      this.logger.error('Failed to list buckets:', error.message);
      return;
    }

    const bucketExists = buckets?.some((b) => b.name === this.bucket);

    if (!bucketExists) {
      const { error: createError } = await this.supabase.storage.createBucket(
        this.bucket,
        {
          public: true,              // PDF cần public access
          fileSizeLimit: 10485760,   // 10MB max
          allowedMimeTypes: [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ],
        },
      );

      if (createError) {
        this.logger.error('Failed to create bucket:', createError.message);
      } else {
        this.logger.log(`✅ Created storage bucket: ${this.bucket}`);
      }
    }
  }

  /**
   * Upload file lên Supabase Storage
   *
   * @param localPath - Đường dẫn file local
   * @param storagePath - Đường dẫn trong bucket (VD: "problems/STRNUM/strnum.pdf")
   * @returns Public URL của file, hoặc null nếu lỗi
   */
  async uploadFile(
    localPath: string,
    storagePath: string,
  ): Promise<{ publicUrl: string; storagePath: string } | null> {
    if (!this.isConfigured()) {
      this.logger.warn(
        `  ⏭️ Skipping upload (Supabase not configured): ${storagePath}`,
      );
      return null;
    }

    try {
      const fileBuffer = fs.readFileSync(localPath);
      const ext = path.extname(localPath).toLowerCase();

      const contentType =
        ext === '.pdf'
          ? 'application/pdf'
          : ext === '.docx'
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : 'application/octet-stream';

      // Upsert: ghi đè nếu file đã tồn tại
      const { error } = await this.supabase.storage
        .from(this.bucket)
        .upload(storagePath, fileBuffer, {
          contentType,
          upsert: true,
        });

      if (error) {
        this.logger.error(`Upload failed for ${storagePath}:`, error.message);
        return null;
      }

      // Lấy public URL
      const { data: urlData } = this.supabase.storage
        .from(this.bucket)
        .getPublicUrl(storagePath);

      this.logger.log(`  📤 Uploaded: ${storagePath}`);

      return {
        publicUrl: urlData.publicUrl,
        storagePath,
      };
    } catch (err) {
      this.logger.error(
        `Upload error for ${localPath}:`,
        err instanceof Error ? err.message : err,
      );
      return null;
    }
  }

  /**
   * Upload file PDF của bài tập
   */
  async uploadProblemPdf(
    pdfPath: string,
    problemCode: string,
  ): Promise<{ publicUrl: string; storagePath: string } | null> {
    const fileName = path.basename(pdfPath);
    const storagePath = `problems/${problemCode.toUpperCase()}/${fileName}`;
    return this.uploadFile(pdfPath, storagePath);
  }

  /**
   * Upload file DOCX hướng dẫn giải của bài tập
   */
  async uploadProblemDocx(
    docxPath: string,
    problemCode: string,
  ): Promise<{ publicUrl: string; storagePath: string } | null> {
    const fileName = path.basename(docxPath);
    const storagePath = `problems/${problemCode.toUpperCase()}/${fileName}`;
    return this.uploadFile(docxPath, storagePath);
  }

  /**
   * Liệt kê mọi tệp nằm dưới một tiền tố (đệ quy qua thư mục con).
   *
   * Supabase trả thư mục con dưới dạng entry có `id === null`, và mặc định chỉ
   * lấy 100 entry một lần — bài có nhiều bản đề/hướng dẫn sẽ bị bỏ sót nếu
   * không nâng `limit`.
   */
  private async listFilesRecursive(prefix: string): Promise<string[]> {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .list(prefix, { limit: 1000 });

    if (error) {
      this.logger.warn(`List failed for ${prefix}: ${error.message}`);
      return [];
    }

    const files: string[] = [];
    for (const entry of data || []) {
      const full = `${prefix}/${entry.name}`;
      if (entry.id) {
        files.push(full);
      } else {
        files.push(...(await this.listFilesRecursive(full)));
      }
    }
    return files;
  }

  /**
   * Xoá toàn bộ tệp đề/hướng dẫn của một bài trong Storage.
   *
   * Xoá theo THƯ MỤC `problems/<CODE>/` chứ không theo `pdfStoragePath` lưu
   * trong DB: bảng `Problem` chỉ có `pdfStoragePath`, không có
   * `docxStoragePath`, nên nếu chỉ xoá theo cột đó thì file .docx sẽ nằm lại
   * trong bucket mãi mãi. Tên tệp giữ nguyên tên gốc tiếng Việt nên cũng không
   * thể đoán được.
   *
   * Lỗi ở tầng Storage KHÔNG được làm hỏng việc xoá bài trong CSDL — hàm này
   * chỉ báo lại kết quả để controller đưa vào thông điệp trả về.
   */
  async removeProblemFiles(problemCode: string): Promise<{
    configured: boolean;
    removed: string[];
    error?: string;
  }> {
    if (!this.isConfigured()) {
      return { configured: false, removed: [] };
    }

    const prefix = `problems/${problemCode.toUpperCase()}`;

    try {
      const paths = await this.listFilesRecursive(prefix);
      if (paths.length === 0) {
        return { configured: true, removed: [] };
      }

      const { error } = await this.supabase.storage
        .from(this.bucket)
        .remove(paths);

      if (error) {
        this.logger.error(
          `Remove failed for ${prefix}: ${error.message}`,
        );
        return { configured: true, removed: [], error: error.message };
      }

      this.logger.log(`  🗑️ Removed ${paths.length} file(s) under ${prefix}`);
      return { configured: true, removed: paths };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Remove error for ${prefix}: ${message}`);
      return { configured: true, removed: [], error: message };
    }
  }
}
