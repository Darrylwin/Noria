import { Body, Controller, Get, HttpCode, HttpStatus, NotFoundException, Param, Post, } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DiagnosticService } from './diagnostic.service.js';
import { SubmitDiagnosticDto } from './dto/submit-diagnostic.dto.js';
import { DiagnosticResponseDto } from './dto/diagnostic-response.dto.js';

/**
 * Expose les points d'entrée HTTP pour l'évaluation de maturité et la consultation des résultats.
 */
@ApiTags('diagnostics')
@Controller('diagnostics')
export class DiagnosticController {
  constructor(private readonly service: DiagnosticService) {}

  /**
   * POST /diagnostics
   * Reçoit les 10 réponses du formulaire, calcule les scores et enregistre le diagnostic.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Soumet les réponses au questionnaire et calcule le diagnostic',
  })
  @ApiResponse({
    status: 201,
    description: 'Diagnostic calculé et persisté.',
    type: DiagnosticResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Payload invalide (champ manquant, valeur hors énumération, ou propriété inconnue).',
  })
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
  @ApiOperation({
    summary: 'Récupère un diagnostic déjà soumis par son identifiant',
  })
  @ApiParam({
    name: 'id',
    description: 'Identifiant UUID de la soumission',
    example: 'b3e1e6d2-4b2a-4c39-9a2f-1234567890ab',
  })
  @ApiResponse({
    status: 200,
    description: 'Diagnostic trouvé.',
    type: DiagnosticResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Aucun diagnostic ne correspond à cet identifiant.',
  })
  async findById(@Param('id') id: string): Promise<DiagnosticResponseDto> {
    const result = await this.service.findById(id);

    if (!result) {
      throw new NotFoundException('Diagnostic introuvable.');
    }

    return result;
  }
}
