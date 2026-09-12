import { describe, it, expect } from 'vitest';
import { computeRecommendation } from './recommendation.engine.js';
import { MaturityLevel, ScoringResult } from './scoring.engine.js';
import { Dimension } from '../enums/dimension.enum.js';
import {
  CASCADE_CONTENT,
  DIMENSION_RECOMMENDATIONS,
  MATURITY_LEVEL_CONTENT,
} from './content.fr.js';

function makeScoring(overrides: Partial<ScoringResult>): ScoringResult {
  return {
    formalizationScore: 50,
    accountingRawScore: 50,
    accountingFinalScore: 50,
    fundingRawScore: 50,
    fundingFinalScore: 50,
    globalScore: 50,
    maturityLevel: MaturityLevel.IN_PROGRESS,
    cascadeTriggered: false,
    strongestDimension: Dimension.FORMALIZATION,
    improvementFocus: Dimension.FUNDING,
    ...overrides,
  };
}

describe('computeRecommendation - cascade', () => {
  it('cascade déclenchée : utilise le texte cascade principal et secondaire', () => {
    const result = computeRecommendation(
      makeScoring({
        cascadeTriggered: true,
        improvementFocus: Dimension.FORMALIZATION,
      }),
    );

    expect(result.mainRecommendation).toBe(CASCADE_CONTENT.main);
    expect(result.secondaryRecommendations).toHaveLength(1);
    expect(result.secondaryRecommendations[0]).toBe(CASCADE_CONTENT.secondary);
  });

  it('cascade non déclenchée : pas de texte cascade', () => {
    const result = computeRecommendation(
      makeScoring({ cascadeTriggered: false }),
    );

    expect(result.mainRecommendation).not.toBe(CASCADE_CONTENT.main);
    expect(result.secondaryRecommendations).toHaveLength(0);
  });
});

describe('computeRecommendation - recommandations par dimension et niveau', () => {
  it('FORMALIZATION faible (score < 45) : texte low', () => {
    const result = computeRecommendation(
      makeScoring({
        improvementFocus: Dimension.FORMALIZATION,
        formalizationScore: 20,
      }),
    );
    expect(result.mainRecommendation).toBe(
      DIMENSION_RECOMMENDATIONS[Dimension.FORMALIZATION].low,
    );
  });

  it('FORMALIZATION intermédiaire (45 <= score < 75) : texte medium', () => {
    const result = computeRecommendation(
      makeScoring({
        improvementFocus: Dimension.FORMALIZATION,
        formalizationScore: 60,
      }),
    );
    expect(result.mainRecommendation).toBe(
      DIMENSION_RECOMMENDATIONS[Dimension.FORMALIZATION].medium,
    );
  });

  it('FORMALIZATION élevée (score >= 75) : texte high', () => {
    const result = computeRecommendation(
      makeScoring({
        improvementFocus: Dimension.FORMALIZATION,
        formalizationScore: 80,
      }),
    );
    expect(result.mainRecommendation).toBe(
      DIMENSION_RECOMMENDATIONS[Dimension.FORMALIZATION].high,
    );
  });

  it('ACCOUNTING faible : texte low', () => {
    const result = computeRecommendation(
      makeScoring({
        improvementFocus: Dimension.ACCOUNTING,
        accountingFinalScore: 10,
      }),
    );
    expect(result.mainRecommendation).toBe(
      DIMENSION_RECOMMENDATIONS[Dimension.ACCOUNTING].low,
    );
  });

  it('ACCOUNTING intermédiaire : texte medium', () => {
    const result = computeRecommendation(
      makeScoring({
        improvementFocus: Dimension.ACCOUNTING,
        accountingFinalScore: 55,
      }),
    );
    expect(result.mainRecommendation).toBe(
      DIMENSION_RECOMMENDATIONS[Dimension.ACCOUNTING].medium,
    );
  });

  it('ACCOUNTING élevée : texte high', () => {
    const result = computeRecommendation(
      makeScoring({
        improvementFocus: Dimension.ACCOUNTING,
        accountingFinalScore: 90,
      }),
    );
    expect(result.mainRecommendation).toBe(
      DIMENSION_RECOMMENDATIONS[Dimension.ACCOUNTING].high,
    );
  });

  it('FUNDING faible : texte low', () => {
    const result = computeRecommendation(
      makeScoring({
        improvementFocus: Dimension.FUNDING,
        fundingFinalScore: 30,
      }),
    );
    expect(result.mainRecommendation).toBe(
      DIMENSION_RECOMMENDATIONS[Dimension.FUNDING].low,
    );
  });

  it('FUNDING intermédiaire : texte medium', () => {
    const result = computeRecommendation(
      makeScoring({
        improvementFocus: Dimension.FUNDING,
        fundingFinalScore: 60,
      }),
    );
    expect(result.mainRecommendation).toBe(
      DIMENSION_RECOMMENDATIONS[Dimension.FUNDING].medium,
    );
  });

  it('FUNDING élevée : texte high', () => {
    const result = computeRecommendation(
      makeScoring({
        improvementFocus: Dimension.FUNDING,
        fundingFinalScore: 75,
      }),
    );
    expect(result.mainRecommendation).toBe(
      DIMENSION_RECOMMENDATIONS[Dimension.FUNDING].high,
    );
  });
});

describe('computeRecommendation - libellés de niveau de maturité', () => {
  it('NEEDS_STRENGTHENING : label et description corrects', () => {
    const result = computeRecommendation(
      makeScoring({ maturityLevel: MaturityLevel.NEEDS_STRENGTHENING }),
    );
    expect(result.maturityLabel).toBe(
      MATURITY_LEVEL_CONTENT[MaturityLevel.NEEDS_STRENGTHENING].label,
    );
    expect(result.maturityDescription).toBe(
      MATURITY_LEVEL_CONTENT[MaturityLevel.NEEDS_STRENGTHENING].description,
    );
  });

  it('IN_PROGRESS : label et description corrects', () => {
    const result = computeRecommendation(
      makeScoring({ maturityLevel: MaturityLevel.IN_PROGRESS }),
    );
    expect(result.maturityLabel).toBe(
      MATURITY_LEVEL_CONTENT[MaturityLevel.IN_PROGRESS].label,
    );
    expect(result.maturityDescription).toBe(
      MATURITY_LEVEL_CONTENT[MaturityLevel.IN_PROGRESS].description,
    );
  });

  it('ADVANCED : label et description corrects', () => {
    const result = computeRecommendation(
      makeScoring({ maturityLevel: MaturityLevel.ADVANCED }),
    );
    expect(result.maturityLabel).toBe(
      MATURITY_LEVEL_CONTENT[MaturityLevel.ADVANCED].label,
    );
    expect(result.maturityDescription).toBe(
      MATURITY_LEVEL_CONTENT[MaturityLevel.ADVANCED].description,
    );
  });
});

describe('computeRecommendation - invariants', () => {
  it('recommandations secondaires ne dépassent jamais 2 éléments', () => {
    const withCascade = computeRecommendation(
      makeScoring({ cascadeTriggered: true }),
    );
    const withoutCascade = computeRecommendation(
      makeScoring({ cascadeTriggered: false }),
    );

    expect(withCascade.secondaryRecommendations.length).toBeLessThanOrEqual(2);
    expect(withoutCascade.secondaryRecommendations.length).toBeLessThanOrEqual(
      2,
    );
  });

  it('cascade false : secondaryRecommendations est vide', () => {
    const result = computeRecommendation(
      makeScoring({ cascadeTriggered: false }),
    );
    expect(result.secondaryRecommendations).toHaveLength(0);
  });
});
