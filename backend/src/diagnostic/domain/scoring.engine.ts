import { Dimension } from '../enums/dimension.enum.js';
import { QUESTIONS_CATALOG } from './questions.catalog.js';

// --- Constantes métier ---
const MATURITY_THRESHOLD_LOW = 45;
const MATURITY_THRESHOLD_HIGH = 75;

const CAP_BASE = 50;
const CAP_MULTIPLIER = 0.5;

const FORMALIZATION_WEIGHT = 0.4;
const ACCOUNTING_WEIGHT = 0.3;
const FUNDING_WEIGHT = 0.3;

const CASCADE_FORMALIZATION_THRESHOLD = 50;

const GLOBAL_SCORE_DECIMAL_PLACES = 1;

// --- Types ---
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

export enum MaturityLevel {
  NEEDS_STRENGTHENING = 'NEEDS_STRENGTHENING',
  IN_PROGRESS = 'IN_PROGRESS',
  ADVANCED = 'ADVANCED',
}

// --- Step 1 : conversion réponse -> valeur numérique ---
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

// --- Step 2 : moyennes par dimension ---
function average(...values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

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

// --- Step 3 : plafond ---
function computeCap(formalizationScore: number): number {
  return CAP_BASE + CAP_MULTIPLIER * formalizationScore;
}

// --- Step 4 : scores finaux après plafonnement ---
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

// --- Step 5 : score global ---
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

// --- Step 6 : niveau de maturité ---
function resolveMaturityLevel(globalScore: number): MaturityLevel {
  if (globalScore < MATURITY_THRESHOLD_LOW)
    return MaturityLevel.NEEDS_STRENGTHENING;
  if (globalScore < MATURITY_THRESHOLD_HIGH) return MaturityLevel.IN_PROGRESS;
  return MaturityLevel.ADVANCED;
}

// --- Step 7 : détection de la cascade ---
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

// --- Step 8 : dimension la plus forte ---
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

// --- Step 9 : axe d'amélioration ---
function resolveImprovementFocus(
  cascadeTriggered: boolean,
  formalizationScore: number,
  accountingFinalScore: number,
  fundingFinalScore: number,
): Dimension {
  if (cascadeTriggered) return Dimension.FORMALIZATION;

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

// --- Step 10 : arrondi final ---
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

// --- Point d'entrée public ---
export function computeScore(answers: Answers): ScoringResult {
  // Step 1
  const numericScores = mapAnswersToScores(answers);

  // Step 2
  const { formalizationScore, accountingRawScore, fundingRawScore } =
    computeDimensionRawScores(numericScores);

  // Step 3
  const cap = computeCap(formalizationScore);

  // Step 4
  const { accountingFinalScore, fundingFinalScore } =
    computeDimensionFinalScores(accountingRawScore, fundingRawScore, cap);

  // Step 5
  const globalScoreRaw = computeGlobalScore(
    formalizationScore,
    accountingFinalScore,
    fundingFinalScore,
  );

  // Step 6
  const maturityLevel = resolveMaturityLevel(globalScoreRaw);

  // Step 7
  const cascadeTriggered = detectCascade(
    formalizationScore,
    accountingRawScore,
    fundingRawScore,
    cap,
  );

  // Step 8
  const strongestDimension = resolveStrongestDimension(
    formalizationScore,
    accountingFinalScore,
    fundingFinalScore,
  );

  // Step 9
  const improvementFocus = resolveImprovementFocus(
    cascadeTriggered,
    formalizationScore,
    accountingFinalScore,
    fundingFinalScore,
  );

  // Step 10 — arrondi unique, en toute fin
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
