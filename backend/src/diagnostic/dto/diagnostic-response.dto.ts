import { ApiProperty } from '@nestjs/swagger';
import { Dimension, MaturityLevel } from '../enums/dimension.enum.js';

/**
 * Score brut et score final d'une dimension soumise au plafonnement (Comptabilité, Financement).
 */
export class DimensionFinalRawDto {
  @ApiProperty({
    example: 89,
    description: 'Score avant application du plafonnement',
  })
  raw: number;

  @ApiProperty({
    example: 81,
    description: 'Score retenu après application du plafonnement',
  })
  final: number;
}

/**
 * Structure détaillée du sous-objet des scores par dimension.
 */
export class DimensionScoresDto {
  @ApiProperty({
    example: 62,
    description: 'Score de la dimension Formalisation, jamais plafonnée',
  })
  formalization: number;

  @ApiProperty({ type: DimensionFinalRawDto })
  accounting: DimensionFinalRawDto;

  @ApiProperty({ type: DimensionFinalRawDto })
  funding: DimensionFinalRawDto;
}

/**
 * DTO de réponse unifié pour la soumission et la consultation d'un diagnostic.
 */
export class DiagnosticResponseDto {
  @ApiProperty({ example: 'b3e1e6d2-4b2a-4c39-9a2f-1234567890ab' })
  id: string;

  @ApiProperty({ example: 68.4 })
  globalScore: number;

  @ApiProperty({ enum: MaturityLevel, example: MaturityLevel.IN_PROGRESS })
  maturityLevel: MaturityLevel;

  @ApiProperty({ example: 'Structuration en cours' })
  maturityLabel: string;

  @ApiProperty({
    example:
      "Des bases solides existent déjà. Certains points méritent encore d'être renforcés pour fiabiliser votre gestion et faciliter vos démarches futures.",
  })
  maturityDescription: string;

  @ApiProperty({ type: DimensionScoresDto })
  scores: DimensionScoresDto;

  @ApiProperty({ enum: Dimension, example: Dimension.ACCOUNTING })
  strongestDimension: Dimension;

  @ApiProperty({ enum: Dimension, example: Dimension.FUNDING })
  improvementFocus: Dimension;

  @ApiProperty({ example: false })
  cascadeTriggered: boolean;

  @ApiProperty({
    example:
      'Formalisez votre besoin de financement (montant, objet, échéance) pour être prêt le moment venu.',
  })
  mainRecommendation: string;

  @ApiProperty({ type: [String], example: [] })
  secondaryRecommendations: string[];
}
