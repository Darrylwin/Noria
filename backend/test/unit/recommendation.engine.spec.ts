import { describe, expect, it } from 'vitest';
import { computeRecommendation } from '../../src/diagnostic/domain/recommendation.engine.js';
import { ScoringResult } from '../../src/diagnostic/domain/scoring.engine.js';
import {
  Dimension,
  MaturityLevel,
} from '../../src/diagnostic/enums/dimension.enum.js';

describe('RecommendationEngine (computeRecommendation)', () => {
  /**
   * Helper pour générer un résultat de scoring de base.
   */
  const createMockScoringResult = (
    overrides?: Partial<ScoringResult>,
  ): ScoringResult => ({
    formalizationScore: 80,
    accountingRawScore: 70,
    accountingFinalScore: 70,
    fundingRawScore: 60,
    fundingFinalScore: 60,
    globalScore: 70,
    maturityLevel: MaturityLevel.IN_PROGRESS,
    strongestDimension: Dimension.FORMALIZATION,
    improvementFocus: Dimension.FUNDING,
    cascadeTriggered: false,
    ...overrides,
  });

  describe('Libellés et descriptions par niveau de maturité', () => {
    it('devrait retourner les textes appropriés pour le niveau NEEDS_STRENGTHENING', () => {
      const scoring = createMockScoringResult({
        globalScore: 20,
        formalizationScore: 20,
        accountingRawScore: 20,
        accountingFinalScore: 20,
        fundingRawScore: 20,
        fundingFinalScore: 20,
        maturityLevel: MaturityLevel.NEEDS_STRENGTHENING,
        improvementFocus: Dimension.FORMALIZATION,
      });

      const result = computeRecommendation(scoring);

      expect(result.maturityLabel).toBeDefined();
      expect(typeof result.maturityLabel).toBe('string');
      expect(result.maturityDescription).toBeDefined();
      expect(typeof result.maturityDescription).toBe('string');
      expect(result.mainRecommendation).toBeDefined();
      expect(Array.isArray(result.secondaryRecommendations)).toBe(true);
      expect(result.secondaryRecommendations.length).toBeGreaterThan(0);
    });

    it('devrait retourner les textes appropriés pour le niveau IN_PROGRESS', () => {
      const scoring = createMockScoringResult({
        globalScore: 55,
        maturityLevel: MaturityLevel.IN_PROGRESS,
      });

      const result = computeRecommendation(scoring);

      expect(result.maturityLabel).toBeDefined();
      expect(result.maturityDescription).toBeDefined();
      expect(result.mainRecommendation).toBeDefined();
    });

    it('devrait retourner les textes appropriés pour le niveau ADVANCED', () => {
      const scoring = createMockScoringResult({
        globalScore: 90,
        maturityLevel: MaturityLevel.ADVANCED,
        strongestDimension: Dimension.ACCOUNTING,
        improvementFocus: Dimension.FUNDING,
      });

      const result = computeRecommendation(scoring);

      expect(result.maturityLabel).toBeDefined();
      expect(result.maturityDescription).toBeDefined();
      expect(result.mainRecommendation).toBeDefined();
    });
  });

  describe("Recommandations selon l'axe d'amélioration (improvementFocus)", () => {
    it('devrait adapter les recommandations lorsque la priorité est FORMALIZATION', () => {
      const scoring = createMockScoringResult({
        formalizationScore: 20,
        accountingRawScore: 20,
        accountingFinalScore: 20,
        fundingRawScore: 20,
        fundingFinalScore: 20,
        improvementFocus: Dimension.FORMALIZATION,
      });

      const result = computeRecommendation(scoring);

      expect(result.mainRecommendation).toBeDefined();
      expect(result.secondaryRecommendations.length).toBeGreaterThan(0);
    });

    it('devrait adapter les recommandations lorsque la priorité est ACCOUNTING', () => {
      const scoring = createMockScoringResult({
        formalizationScore: 20,
        accountingRawScore: 20,
        accountingFinalScore: 20,
        fundingRawScore: 20,
        fundingFinalScore: 20,
        improvementFocus: Dimension.ACCOUNTING,
      });

      const result = computeRecommendation(scoring);

      expect(result.mainRecommendation).toBeDefined();
      expect(result.secondaryRecommendations.length).toBeGreaterThan(0);
    });

    it('devrait adapter les recommandations lorsque la priorité est FUNDING', () => {
      const scoring = createMockScoringResult({
        formalizationScore: 20,
        accountingRawScore: 20,
        accountingFinalScore: 20,
        fundingRawScore: 20,
        fundingFinalScore: 20,
        improvementFocus: Dimension.FUNDING,
      });

      const result = computeRecommendation(scoring);

      expect(result.mainRecommendation).toBeDefined();
      expect(result.secondaryRecommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Gestion du déclenchement de la cascade', () => {
    it('devrait fournir des recommandations cohérentes lorsque la cascade est activée', () => {
      const scoring = createMockScoringResult({
        cascadeTriggered: true,
        formalizationScore: 20,
        accountingRawScore: 80,
        accountingFinalScore: 20,
        fundingRawScore: 75,
        fundingFinalScore: 20,
        maturityLevel: MaturityLevel.NEEDS_STRENGTHENING,
        improvementFocus: Dimension.FORMALIZATION,
      });

      const result = computeRecommendation(scoring);

      expect(result.mainRecommendation).toBeDefined();
      expect(result.secondaryRecommendations.length).toBeGreaterThan(0);
    });
  });
});
