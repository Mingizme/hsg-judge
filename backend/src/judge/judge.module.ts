import { Module } from '@nestjs/common';
import { PistonService } from './piston.service';
import { JudgeWorkerService } from './judge-worker.service';

@Module({
  providers: [PistonService, JudgeWorkerService],
  exports: [PistonService, JudgeWorkerService],
})
export class JudgeModule {}
