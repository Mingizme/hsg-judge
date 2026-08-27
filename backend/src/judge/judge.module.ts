import { Module } from '@nestjs/common';
import { PistonService } from './piston.service';
import { JudgeWorkerService } from './judge-worker.service';
import { JudgeController } from './judge.controller';

@Module({
  controllers: [JudgeController],
  providers: [PistonService, JudgeWorkerService],
  exports: [PistonService, JudgeWorkerService],
})
export class JudgeModule {}
