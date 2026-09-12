import { Dimension } from '../enums/dimension.enum.js';
import { MaturityLevel, ScoringResult } from './scoring.engine.js';
import {
  CASCADE_CONTENT,
  DIMENSION_LEVEL_THRESHOLD_HIGH,
  DIMENSION_LEVEL_THRESHOLD_LOW,
  DIMENSION_RECOMMENDATIONS,
  MATURITY_LEVEL_CONTENT,
} from './content.fr.js';

// --- Types ---
export interface RecommendationResult {
  maturityLabel: string;
  maturityDescription: string;
  mainRecommendation: string;
  secondaryRecommendations: string[];
}

// --- Résolution du niveau d'une dimension ---
function resolveDimensionLevel(score: number): 'low' | 'medium' | 'high' {
  if (score < DIMENSION_LEVEL_THRESHOLD_LOW) return 'low';
  if (score < DIMENSION_LEVEL_THRESHOLD_HIGH) return 'medium';
  return 'high';
}

function getDimensionFinalScore(
  dimension: Dimension,
  scoring: ScoringResult,
): number {
  switch (dimension) {
    case Dimension.FORMALIZATION:
      return scoring.formalizationScore;
    case Dimension.ACCOUNTING:
      return scoring.accountingFinalScore;
    case Dimension.FUNDING:
      return scoring.fundingFinalScore;
  }
}

// --- Point d'entrée public ---
export function computeRecommendation(
  scoring: ScoringResult,
): RecommendationResult {
  const { label, description } =
    MATURITY_LEVEL_CONTENT[scoring.maturityLevel as MaturityLevel];

  if (scoring.cascadeTriggered) {
    return {
      maturityLabel: label,
      maturityDescription: description,
      mainRecommendation: CASCADE_CONTENT.main,
      secondaryRecommendations: [CASCADE_CONTENT.secondary],
    };
  }

  const focusScore = getDimensionFinalScore(scoring.improvementFocus, scoring);
  const level = resolveDimensionLevel(focusScore);
  const mainRecommendation =
    DIMENSION_RECOMMENDATIONS[scoring.improvementFocus][level];

  return {
    maturityLabel: label,
    maturityDescription: description,
    mainRecommendation,
    secondaryRecommendations: [],
  };
}
