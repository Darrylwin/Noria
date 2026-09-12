import { Module } from '@nestjs/common';
import { DiagnosticController } from './diagnostic.controller';
import { DiagnosticService } from './diagnostic.service';
import { DiagnosticRepository } from './diagnostic.repository';

/**
 * Module d'encapsulation de la fonctionnalité de diagnostic NORIA.
 * Regroupe le contrôleur REST, le service métier et le repository de persistance.
 */
@Module({
  controllers: [DiagnosticController],
  providers: [DiagnosticService, DiagnosticRepository],
})
export class DiagnosticModule {}
