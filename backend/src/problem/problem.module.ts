import { Module } from '@nestjs/common';
import { ProblemController } from './problem.controller';
import { ProblemService } from './problem.service';
// Xoá bài phải dọn luôn file đề/hướng dẫn trên Storage → dùng lại đúng service
// mà ingestion đã dùng để upload (cùng bucket, cùng quy ước đường dẫn).
import { IngestionModule } from '../ingestion/ingestion.module';

@Module({
  imports: [IngestionModule],
  controllers: [ProblemController],
  providers: [ProblemService],
  exports: [ProblemService],
})
export class ProblemModule {}
