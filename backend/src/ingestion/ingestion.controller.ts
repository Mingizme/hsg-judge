// ============================================
// Ingestion Controller
// REST API endpoints cho nạp dữ liệu bài tập
// ============================================

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IngestionService } from './ingestion.service';

// ── DTOs ──────────────────────────────────────

class ScanDirectoryDto {
  /** Đường dẫn thư mục Data/ (tuyệt đối hoặc tương đối) */
  dataDir?: string;
}

class IngestSingleDto {
  /** Đường dẫn tới thư mục bài tập cụ thể */
  problemDir: string;
}

// ── Controller ────────────────────────────────

@Controller('ingestion')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  /**
   * POST /api/ingestion/scan-directory
   *
   * Scan toàn bộ thư mục Data/ và nạp tất cả bài tập.
   * Body (optional): { dataDir: "./Data" }
   */
  @Post('scan-directory')
  @HttpCode(HttpStatus.OK)
  async scanDirectory(@Body() dto: ScanDirectoryDto) {
    const result = await this.ingestionService.ingestDataDirectory(
      dto.dataDir,
    );
    return {
      statusCode: HttpStatus.OK,
      message: `Scanned ${result.totalProblems} problem(s): ${result.successful} success, ${result.failed} failed`,
      data: result,
    };
  }

  /**
   * POST /api/ingestion/ingest-single
   *
   * Nạp một bài tập từ đường dẫn thư mục cụ thể.
   * Body: { problemDir: "./Data/STRNUM" }
   */
  @Post('ingest-single')
  @HttpCode(HttpStatus.OK)
  async ingestSingle(@Body() dto: IngestSingleDto) {
    if (!dto.problemDir) {
      throw new BadRequestException('problemDir is required');
    }
    const result = await this.ingestionService.ingestProblem(dto.problemDir);
    return {
      statusCode: result.success ? HttpStatus.OK : HttpStatus.INTERNAL_SERVER_ERROR,
      message: result.message,
      data: result,
    };
  }

  /**
   * POST /api/ingestion/upload-zip
   *
   * Upload file ZIP chứa bài tập, tự động giải nén và nạp.
   * Multipart form-data với field "file".
   */
  @Post('upload-zip')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
      fileFilter: (_req, file, cb) => {
        if (
          file.mimetype === 'application/zip' ||
          file.mimetype === 'application/x-zip-compressed' ||
          file.originalname.endsWith('.zip')
        ) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException('Only .zip files are accepted'),
            false,
          );
        }
      },
    }),
  )
  async uploadZip(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const results = await this.ingestionService.ingestFromZip(
      file.buffer,
      file.originalname,
    );

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return {
      statusCode: HttpStatus.OK,
      message: `Processed ZIP "${file.originalname}": ${successful} success, ${failed} failed`,
      data: {
        originalFileName: file.originalname,
        fileSize: file.size,
        results,
      },
    };
  }

  /**
   * GET /api/ingestion/status/:problemCode
   *
   * Kiểm tra trạng thái nạp dữ liệu của một bài tập.
   */
  @Get('status/:problemCode')
  async getStatus(@Param('problemCode') problemCode: string) {
    const status = await this.ingestionService.getIngestionStatus(
      problemCode,
    );
    return {
      statusCode: HttpStatus.OK,
      data: status,
    };
  }
}
