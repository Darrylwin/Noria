import { Module } from '@nestjs/common';
import { DiagnosticController } from './diagnostic.controller.js';
import { DiagnosticService } from './diagnostic.service.js';
import { DiagnosticRepository } from './diagnostic.repository.js';

@Module({
  controllers: [DiagnosticController],
  providers: [DiagnosticService, DiagnosticRepository],
})
export class DiagnosticModule {}
