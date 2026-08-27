import { Module } from '@nestjs/common';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { SupabaseStorageService } from './supabase-storage.service';

@Module({
  controllers: [IngestionController],
  providers: [IngestionService, SupabaseStorageService],
  exports: [IngestionService, SupabaseStorageService],
})
export class IngestionModule {}
