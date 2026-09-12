import { Dimension } from '../enums/dimension.enum';
import { ScoringResult } from './scoring.engine';
import {
  CASCADE_CONTENT,
  DIMENSION_LEVEL_THRESHOLD_HIGH,
  DIMENSION_LEVEL_THRESHOLD_LOW,
  DIMENSION_RECOMMENDATIONS,
  MATURITY_LEVEL_CONTENT,
} from './content.fr';

/**
 * Structure du résultat de recommandation retourné à l'utilisateur.
 */
export interface RecommendationResult {
  maturityLabel: string;
  maturityDescription: string;
  mainRecommendation: string;
  secondaryRecommendations: string[];
}

/**
 * Résout le niveau qualitatif ('low' | 'medium' | 'high') d'une dimension
 * selon les seuils métier définis dans le catalogue de contenu.
 */
function resolveDimensionLevel(score: number): 'low' | 'medium' | 'high' {
  if (score < DIMENSION_LEVEL_THRESHOLD_LOW) return 'low';
  if (score < DIMENSION_LEVEL_THRESHOLD_HIGH) return 'medium';
  return 'high';
}

/**
 * Extrait le score final retenu pour la dimension identifiée comme axe d'amélioration.
 */
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

/**
 * Fonction pure de génération de recommandations stratégiques.
 *
 * JUSTIFICATION MÉTIER :
 * 1. Si la cascade est déclenchée (cascadeTriggered === true), le moteur priorise immédiatement
 *    les messages d'alerte sur la formalisation légale et administrative (CASCADE_CONTENT),
 *    car la non-formalisation bloque la valeur réelle des autres dimensions.
 * 2. Hors cascade, le moteur sélectionne uniquement la recommandation associée à l'axe
 *    d'amélioration (improvementFocus) et à son niveau de score final. Aucune recommandation
 *    secondaire n'est définie en dehors du cas de cascade dans ce prototype : le tableau
 *    `secondaryRecommendations` reste vide dans le cas standard.
 */
export function computeRecommendation(
  scoring: ScoringResult,
): RecommendationResult {
  const { label, description } = MATURITY_LEVEL_CONTENT[scoring.maturityLevel];

  // Cas 1 : Cascade déclenchée -> Recommandation prioritaire de formalisation
  if (scoring.cascadeTriggered) {
    return {
      maturityLabel: label,
      maturityDescription: description,
      mainRecommendation: CASCADE_CONTENT.main,
      secondaryRecommendations: [CASCADE_CONTENT.secondary],
    };
  }

  // Cas 2 : Parcours standard basé sur l'axe d'amélioration
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
