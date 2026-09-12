import { Body, Controller, Get, HttpCode, HttpStatus, NotFoundException, Param, Post, } from '@nestjs/common';
import { ApiExtraModels, ApiOperation, ApiParam, ApiResponse, ApiTags, getSchemaPath, } from '@nestjs/swagger';
import { DiagnosticService } from './diagnostic.service.js';
import { SubmitDiagnosticDto } from './dto/submit-diagnostic.dto.js';
import { DiagnosticResponseDto } from './dto/diagnostic-response.dto.js';
import { HttpErrorDto } from '../common/dto/http-error.dto.js';

/**
 * Expose les points d'entrée HTTP pour l'évaluation de maturité et la consultation des résultats.
 */
@ApiTags('diagnostics')
// Enregistre HttpErrorDto dans components.schemas du document OpenAPI même s'il n'est
// jamais retourné directement par une route (les réponses d'erreur l'utilisent via
// getSchemaPath ci-dessous, dans un allOf, pour combiner le schéma réutilisable avec
// un exemple différent par cas d'erreur).
@ApiExtraModels(HttpErrorDto)
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
    summary: 'Soumet les 10 réponses au questionnaire et calcule le diagnostic',
    description:
      'Endpoint non idempotent : chaque appel crée une nouvelle soumission, même avec un ' +
      "payload identique à un appel précédent (aucune déduplication n'est effectuée). " +
      'Le calcul est entièrement synchrone et déterministe : les mêmes 10 réponses produisent ' +
      'toujours exactement le même résultat. Limité à 10 requêtes par minute par adresse IP ' +
      '(voir réponse 429) et à un payload de 10 Ko maximum (voir réponse 413).',
  })
  @ApiResponse({
    status: 201,
    description: 'Diagnostic calculé et persisté avec succès.',
    type: DiagnosticResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Payload invalide : champ manquant, valeur hors énumération pour une question, ' +
      'ou propriété inconnue envoyée en plus des 10 attendues (rejetée, jamais ignorée silencieusement).',
    schema: {
      allOf: [{ $ref: getSchemaPath(HttpErrorDto) }],
      example: {
        statusCode: 400,
        message: ['q3 must be a valid enum value'],
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 413,
    description: 'Payload dépassant la limite de 10 Ko.',
    schema: {
      allOf: [{ $ref: getSchemaPath(HttpErrorDto) }],
      example: {
        statusCode: 413,
        message: 'Le contenu de la requête est trop volumineux.',
        error: 'Payload Too Large',
      },
    },
  })
  @ApiResponse({
    status: 429,
    description:
      'Plus de 10 requêtes envoyées depuis la même adresse IP dans la dernière minute.',
    schema: { allOf: [{ $ref: getSchemaPath(HttpErrorDto) }] },
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
    description:
      'Endpoint de lecture seule, sans effet de bord. Prévu pour permettre le rechargement ' +
      'de la page de résultat (ex. après un F5) sans perdre le résultat déjà calculé. ' +
      'La réponse est structurellement identique à celle de POST /diagnostics.',
  })
  @ApiParam({
    name: 'id',
    description:
      'Identifiant UUID retourné par POST /diagnostics lors de la création.',
    example: 'b3e1e6d2-4b2a-4c39-9a2f-1234567890ab',
  })
  @ApiResponse({
    status: 200,
    description: 'Diagnostic trouvé.',
    type: DiagnosticResponseDto,
  })
  @ApiResponse({
    status: 404,
    description:
      'Aucun diagnostic ne correspond à cet identifiant (jamais créé, ou id malformé). ' +
      'Le frontend doit alors afficher un message invitant à refaire le diagnostic, jamais ' +
      'une erreur technique brute.',
    schema: {
      allOf: [{ $ref: getSchemaPath(HttpErrorDto) }],
      example: {
        statusCode: 404,
        message: 'Diagnostic introuvable.',
        error: 'Not Found',
      },
    },
  })
  async findById(@Param('id') id: string): Promise<DiagnosticResponseDto> {
    const result = await this.service.findById(id);

    if (!result) {
      throw new NotFoundException('Diagnostic introuvable.');
    }

    return result;
  }
}
