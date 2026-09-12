import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { DiagnosticService } from './diagnostic.service.js';
import { SubmitDiagnosticDto } from './dto/submit-diagnostic.dto.js';
import { DiagnosticResponseDto } from './dto/diagnostic-response.dto.js';

/**
 * Expose les points d'entrée HTTP pour l'évaluation de maturité et la consultation des résultats.
 */
@Controller('diagnostics')
export class DiagnosticController {
  constructor(private readonly service: DiagnosticService) {}

  /**
   * POST /diagnostics
   * Reçoit les 10 réponses du formulaire, calcule les scores et enregistre le diagnostic.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async submit(
    @Body() dto: SubmitDiagnosticDto,
  ): Promise<DiagnosticResponseDto> {
    return this.service.submit(dto);
  }

  /**
   * GET /diagnostics/:id
   * Récupère un résultat de diagnostic existant par son identifiant unique.
   */
  @Get(':id')
  async findById(@Param('id') id: string): Promise<DiagnosticResponseDto> {
    const result = await this.service.findById(id);

    if (!result) {
      throw new NotFoundException('Diagnostic introuvable.');
    }

    return result;
  }
}
