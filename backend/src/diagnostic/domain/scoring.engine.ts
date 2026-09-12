import { Dimension, MaturityLevel } from '../enums/dimension.enum';
import { QUESTIONS_CATALOG } from './questions.catalog';

// --- Constantes métier de scoring ---

/** Seuils de niveau de maturité globale */
const MATURITY_THRESHOLD_LOW = 45;
const MATURITY_THRESHOLD_HIGH = 75;

/** Constantes de la formule de plafonnement : Plafond = 50 + (0.5 * Formalisation) */
const CAP_BASE = 50;
const CAP_MULTIPLIER = 0.5;

/** Pondérations des dimensions dans le score global (Somme = 1.0) */
const FORMALIZATION_WEIGHT = 0.4;
const ACCOUNTING_WEIGHT = 0.3;
const FUNDING_WEIGHT = 0.3;

/** Seuil de Formalisation sous lequel la cascade peut se déclencher (< 50) */
const CASCADE_FORMALIZATION_THRESHOLD = 50;

/** Précision de l'arrondi pour le score global */
const GLOBAL_SCORE_DECIMAL_PLACES = 1;

// --- Types du moteur de scoring ---

export type QuestionCode =
  'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Q5' | 'Q6' | 'Q7' | 'Q8' | 'Q9' | 'Q10';

export type AnswerCode = string;
export type Answers = Record<QuestionCode, AnswerCode>;

export interface DimensionScores {
  formalizationScore: number;
  accountingRawScore: number;
  accountingFinalScore: number;
  fundingRawScore: number;
  fundingFinalScore: number;
}

export interface ScoringResult {
  formalizationScore: number;
  accountingRawScore: number;
  accountingFinalScore: number;
  fundingRawScore: number;
  fundingFinalScore: number;
  globalScore: number;
  maturityLevel: MaturityLevel;
  cascadeTriggered: boolean;
  strongestDimension: Dimension;
  improvementFocus: Dimension;
}

// --- STEP 1 : Conversion réponse -> valeur numérique ---

/**
 * Mappe les codes de réponse reçus en leurs valeurs numériques brutes (0, 33, 50, 66, 100)
 * en se basant sur le barème figé du catalogue de questions.
 */
function mapAnswersToScores(answers: Answers): Record<QuestionCode, number> {
  const result = {} as Record<QuestionCode, number>;

  for (const question of QUESTIONS_CATALOG) {
    const code = question.code as QuestionCode;
    const answerCode = answers[code];
    const option = question.options.find((o) => o.code === answerCode);

    if (option === undefined) {
      throw new Error(
        `Réponse invalide "${answerCode}" pour la question ${code}`,
      );
    }

    result[code] = option.scoreValue;
  }

  return result;
}

// --- STEP 2 : Calcul des moyennes brutes par dimension ---

function average(...values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calcule la moyenne arithmétique non arrondie des réponses pour chaque dimension.
 */
function computeDimensionRawScores(scores: Record<QuestionCode, number>): {
  formalizationScore: number;
  accountingRawScore: number;
  fundingRawScore: number;
} {
  return {
    formalizationScore: average(scores.Q1, scores.Q2, scores.Q3, scores.Q4),
    accountingRawScore: average(scores.Q5, scores.Q6, scores.Q7),
    fundingRawScore: average(scores.Q8, scores.Q9, scores.Q10),
  };
}

// --- STEP 3 : Calcul du plafond ---

/**
 * JUSTIFICATION MÉTIER :
 * Le score de Formalisation détermine la capacité juridique et administrative réelle
 * de l'entreprise à exploiter sa comptabilité ou à lever des fonds. Un manque de formalisation
 * crée un "plafond de verre" qui limite la valeur des autres dimensions.
 */
function computeCap(formalizationScore: number): number {
  return CAP_BASE + CAP_MULTIPLIER * formalizationScore;
}

// --- STEP 4 : Application du plafonnement ---

/**
 * Plafonne la Comptabilité et la Préparation au Financement par le plafond de Formalisation.
 * La Formalisation n'est jamais plafonnée.
 */
function computeDimensionFinalScores(
  accountingRawScore: number,
  fundingRawScore: number,
  cap: number,
): { accountingFinalScore: number; fundingFinalScore: number } {
  return {
    accountingFinalScore: Math.min(accountingRawScore, cap),
    fundingFinalScore: Math.min(fundingRawScore, cap),
  };
}

// --- STEP 5 : Calcul du score global ---

/**
 * Calcule le score global pondéré : Formalisation (40%), Comptabilité (30%), Financement (30%).
 * Utilise les scores finaux (après plafonnement).
 */
function computeGlobalScore(
  formalizationScore: number,
  accountingFinalScore: number,
  fundingFinalScore: number,
): number {
  return (
    FORMALIZATION_WEIGHT * formalizationScore +
    ACCOUNTING_WEIGHT * accountingFinalScore +
    FUNDING_WEIGHT * fundingFinalScore
  );
}

// --- STEP 6 : Résolution du niveau de maturité ---

function resolveMaturityLevel(globalScore: number): MaturityLevel {
  if (globalScore < MATURITY_THRESHOLD_LOW) {
    return MaturityLevel.NEEDS_STRENGTHENING;
  }
  if (globalScore < MATURITY_THRESHOLD_HIGH) {
    return MaturityLevel.IN_PROGRESS;
  }
  return MaturityLevel.ADVANCED;
}

// --- STEP 7 : Détection du déclenchement de la cascade ---

/**
 * JUSTIFICATION MÉTIER :
 * La détection compare les scores BRUTS au plafond car la cascade reflète le phénomène
 * où une entreprise a développé une maturité pratique (ex: bonne comptabilité) mais se retrouve
 * bridée par son absence d'enregistrement légal. On vérifie si la Formalisation < 50 ET qu'au moins
 * une autre dimension brute dépasse ce plafond.
 */
function detectCascade(
  formalizationScore: number,
  accountingRawScore: number,
  fundingRawScore: number,
  cap: number,
): boolean {
  const accountingIsCapped = accountingRawScore > cap;
  const fundingIsCapped = fundingRawScore > cap;

  return (
    formalizationScore < CASCADE_FORMALIZATION_THRESHOLD &&
    (accountingIsCapped || fundingIsCapped)
  );
}

// --- STEP 8 : Détermination de la dimension la plus forte ---

/**
 * JUSTIFICATION MÉTIER :
 * La comparaison s'effectue sur les scores FINAUX (ceux réellement retenus pour la valeur de l'entreprise).
 * En cas d'égalité stricte, l'ordre de priorité favorise les fondations structurantes :
 * 1. FORMALIZATION -> 2. ACCOUNTING -> 3. FUNDING.
 */
function resolveStrongestDimension(
  formalizationScore: number,
  accountingFinalScore: number,
  fundingFinalScore: number,
): Dimension {
  if (
    formalizationScore >= accountingFinalScore &&
    formalizationScore >= fundingFinalScore
  ) {
    return Dimension.FORMALIZATION;
  }
  if (accountingFinalScore >= fundingFinalScore) {
    return Dimension.ACCOUNTING;
  }
  return Dimension.FUNDING;
}

// --- STEP 9 : Détermination de l'axe d'amélioration ---

/**
 * JUSTIFICATION MÉTIER :
 * - Si la cascade est déclenchée, l'axe d'amélioration est FORCÉ à FORMALIZATION car régulariser
 *   l'entreprise est le prérequis absolu pour débloquer le potentiel des autres dimensions.
 * - Hors cascade, on cherche la dimension la plus faible sur les scores finaux.
 * - En cas d'égalité stricte, le tie-break cible d'abord les faiblesses opérationnelles internes :
 *   1. ACCOUNTING -> 2. FUNDING -> 3. FORMALIZATION.
 */
function resolveImprovementFocus(
  cascadeTriggered: boolean,
  formalizationScore: number,
  accountingFinalScore: number,
  fundingFinalScore: number,
): Dimension {
  if (cascadeTriggered) {
    return Dimension.FORMALIZATION;
  }

  if (
    accountingFinalScore <= formalizationScore &&
    accountingFinalScore <= fundingFinalScore
  ) {
    return Dimension.ACCOUNTING;
  }
  if (fundingFinalScore <= formalizationScore) {
    return Dimension.FUNDING;
  }
  return Dimension.FORMALIZATION;
}

// --- STEP 10 : Arrondi final unique ---

/**
 * JUSTIFICATION MÉTIER :
 * L'arrondi est appliqué UNE SEULE FOIS en toute fin de pipeline afin d'éviter la propagation
 * d'erreurs d'arrondi dans les étapes intermédiaires (moyennes, calcul de plafond).
 * - Scores de dimensions : arrondis à l'entier le plus proche.
 * - Score global : arrondi à 1 décimale.
 */
function roundScores(
  raw: DimensionScores & { globalScore: number },
): DimensionScores & { globalScore: number } {
  return {
    formalizationScore: Math.round(raw.formalizationScore),
    accountingRawScore: Math.round(raw.accountingRawScore),
    accountingFinalScore: Math.round(raw.accountingFinalScore),
    fundingRawScore: Math.round(raw.fundingRawScore),
    fundingFinalScore: Math.round(raw.fundingFinalScore),
    globalScore: parseFloat(
      raw.globalScore.toFixed(GLOBAL_SCORE_DECIMAL_PLACES),
    ),
  };
}

// --- POINT D'ENTRÉE PUBLIC (FONCTION PURE) ---

/**
 * Fonction pure de calcul de scoring NORIA.
 * Entrée : 10 codes de réponse.
 * Sortie : Scores calculés, niveau de maturité, statut de cascade, point fort et axe d'amélioration.
 */
export function computeScore(answers: Answers): ScoringResult {
  // Step 1 : Mapping réponses -> scores
  const numericScores = mapAnswersToScores(answers);

  // Step 2 : Calcul des scores bruts
  const { formalizationScore, accountingRawScore, fundingRawScore } =
    computeDimensionRawScores(numericScores);

  // Step 3 : Calcul du plafond imposé par la formalisation
  const cap = computeCap(formalizationScore);

  // Step 4 : Plafonnement des scores finaux
  const { accountingFinalScore, fundingFinalScore } =
    computeDimensionFinalScores(accountingRawScore, fundingRawScore, cap);

  // Step 5 : Score global brut
  const globalScoreRaw = computeGlobalScore(
    formalizationScore,
    accountingFinalScore,
    fundingFinalScore,
  );

  // Step 6 : Niveau de maturité
  const maturityLevel = resolveMaturityLevel(globalScoreRaw);

  // Step 7 : Détection de la cascade
  const cascadeTriggered = detectCascade(
    formalizationScore,
    accountingRawScore,
    fundingRawScore,
    cap,
  );

  // Step 8 : Point fort
  const strongestDimension = resolveStrongestDimension(
    formalizationScore,
    accountingFinalScore,
    fundingFinalScore,
  );

  // Step 9 : Axe d'amélioration
  const improvementFocus = resolveImprovementFocus(
    cascadeTriggered,
    formalizationScore,
    accountingFinalScore,
    fundingFinalScore,
  );

  // Step 10 : Arrondi final unique
  const rounded = roundScores({
    formalizationScore,
    accountingRawScore,
    accountingFinalScore,
    fundingRawScore,
    fundingFinalScore,
    globalScore: globalScoreRaw,
  });

  return {
    ...rounded,
    maturityLevel,
    cascadeTriggered,
    strongestDimension,
    improvementFocus,
  };
}
