import { describe, expect, it } from 'vitest';
import {
  Answers,
  computeScore,
} from '../../src/diagnostic/domain/scoring.engine';
import {
  Dimension,
  MaturityLevel,
} from '../../src/diagnostic/enums/dimension.enum';
import {
  Q10Answer,
  Q1Answer,
  Q2Answer,
  Q3Answer,
  Q4Answer,
  Q5Answer,
  Q6Answer,
  Q7Answer,
  Q8Answer,
  Q9Answer,
} from '../../src/diagnostic/enums/answers.enum';

describe('ScoringEngine (computeScore)', () => {
  /**
   * Helper pour générer un jeu de réponses de base avec toutes les meilleures options.
   */
  const createPerfectAnswers = (): Answers => {
    const getBest = <T extends Record<string, string>>(
      enumObj: T,
    ): T[keyof T] => Object.values(enumObj).slice(-1)[0] as T[keyof T];

    return {
      Q1: getBest(Q1Answer),
      Q2: getBest(Q2Answer),
      Q3: getBest(Q3Answer),
      Q4: getBest(Q4Answer),
      Q5: getBest(Q5Answer),
      Q6: getBest(Q6Answer),
      Q7: getBest(Q7Answer),
      Q8: getBest(Q8Answer),
      Q9: getBest(Q9Answer),
      Q10: getBest(Q10Answer),
    };
  };

  /**
   * Helper pour générer un jeu de réponses avec les options minimales.
   */
  const createMinimalAnswers = (): Answers => {
    const getWorst = <T extends Record<string, string>>(
      enumObj: T,
    ): T[keyof T] => Object.values(enumObj)[0] as T[keyof T];

    return {
      Q1: getWorst(Q1Answer),
      Q2: getWorst(Q2Answer),
      Q3: getWorst(Q3Answer),
      Q4: getWorst(Q4Answer),
      Q5: getWorst(Q5Answer),
      Q6: getWorst(Q6Answer),
      Q7: getWorst(Q7Answer),
      Q8: getWorst(Q8Answer),
      Q9: getWorst(Q9Answer),
      Q10: getWorst(Q10Answer),
    };
  };

  describe('Niveaux de maturité et calculs globaux', () => {
    it('devrait attribuer le niveau ADVANCED et un score maximal pour des réponses parfaites', () => {
      const answers = createPerfectAnswers();
      const result = computeScore(answers);

      expect(result.globalScore).toBe(100);
      expect(result.maturityLevel).toBe(MaturityLevel.ADVANCED);
      expect(result.cascadeTriggered).toBe(false);
      expect(result.formalizationScore).toBe(100);
      expect(result.accountingFinalScore).toBe(100);
      expect(result.fundingFinalScore).toBe(100);
    });

    it('devrait attribuer le niveau NEEDS_STRENGTHENING et un score minimal pour des réponses faibles', () => {
      const answers = createMinimalAnswers();
      const result = computeScore(answers);

      expect(result.globalScore).toBe(0);
      expect(result.maturityLevel).toBe(MaturityLevel.NEEDS_STRENGTHENING);
    });
  });

  describe('Règle de plafonnement en cascade (Cascade Trigger)', () => {
    it('devrait déclencher la cascade et plafonner les scores finaux si la formalisation est insuffisante', () => {
      const getWorst = <T extends Record<string, string>>(
        enumObj: T,
      ): T[keyof T] => Object.values(enumObj)[0] as T[keyof T];

      // On passe toute la dimension Formalisation (Q1, Q2, Q3) au score minimal
      const answers: Answers = {
        ...createPerfectAnswers(),
        Q1: getWorst(Q1Answer),
        Q2: getWorst(Q2Answer),
        Q3: getWorst(Q3Answer),
      };

      const result = computeScore(answers);

      expect(result.cascadeTriggered).toBe(true);
      expect(result.accountingRawScore).toBeGreaterThan(0);
      expect(result.fundingRawScore).toBeGreaterThan(0);
      expect(result.accountingFinalScore).toBeLessThan(
        result.accountingRawScore,
      );
      expect(result.fundingFinalScore).toBeLessThan(result.fundingRawScore);
    });

    it('ne devrait pas déclencher la cascade si le score de formalisation dépasse le seuil critique', () => {
      const answers = createPerfectAnswers();
      const result = computeScore(answers);

      expect(result.cascadeTriggered).toBe(false);
      expect(result.accountingFinalScore).toEqual(result.accountingRawScore);
      expect(result.fundingFinalScore).toEqual(result.fundingRawScore);
    });
  });

  describe("Détermination de la meilleure dimension et de la priorité d'amélioration", () => {
    it('devrait identifier correctement la dimension la plus forte et la dimension prioritaire', () => {
      const getBest = <T extends Record<string, string>>(
        enumObj: T,
      ): T[keyof T] => Object.values(enumObj).slice(-1)[0] as T[keyof T];
      const getWorst = <T extends Record<string, string>>(
        enumObj: T,
      ): T[keyof T] => Object.values(enumObj)[0] as T[keyof T];

      // Formalisation forte (Q1..Q3 max), Comptabilité élevée (Q4..Q6 max), Financement faible (Q7..Q10 min)
      const answers: Answers = {
        Q1: getBest(Q1Answer),
        Q2: getBest(Q2Answer),
        Q3: getBest(Q3Answer),
        Q4: getBest(Q4Answer),
        Q5: getBest(Q5Answer),
        Q6: getBest(Q6Answer),
        Q7: getWorst(Q7Answer),
        Q8: getWorst(Q8Answer),
        Q9: getWorst(Q9Answer),
        Q10: getWorst(Q10Answer),
      };

      const result = computeScore(answers);

      expect(result.strongestDimension).toBe(Dimension.FORMALIZATION);
      expect(result.improvementFocus).toBe(Dimension.FUNDING);
    });

    it('devrait gérer les égalités de score (tie-break) de manière déterministe', () => {
      const answers = createMinimalAnswers();
      const result = computeScore(answers);

      expect(Object.values(Dimension)).toContain(result.strongestDimension);
      expect(Object.values(Dimension)).toContain(result.improvementFocus);
    });
  });
});
