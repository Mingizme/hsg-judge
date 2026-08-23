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
}
