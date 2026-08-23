import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { JudgeModule } from './judge/judge.module';
import { SubmissionModule } from './submission/submission.module';
import { ProblemModule } from './problem/problem.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    IngestionModule,
    JudgeModule,
    SubmissionModule,
    ProblemModule,
    AuthModule,
  ],
})
export class AppModule {}
