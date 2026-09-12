import { Dimension, MaturityLevel } from '../enums/dimension.enum';

/**
 * Structure détaillée du sous-objet des scores par dimension.
 */
export class DimensionScoresDto {
  formalization: number;
  accounting: {
    raw: number;
    final: number;
  };
  funding: {
    raw: number;
    final: number;
  };
}

/**
 * DTO de réponse unifié pour la soumission et la consultation d'un diagnostic.
 */
export class DiagnosticResponseDto {
  id: string;
  globalScore: number;
  maturityLevel: MaturityLevel;
  maturityLabel: string;
  maturityDescription: string;
  scores: DimensionScoresDto;
  strongestDimension: Dimension;
  improvementFocus: Dimension;
  cascadeTriggered: boolean;
  mainRecommendation: string;
  secondaryRecommendations: string[];
}
