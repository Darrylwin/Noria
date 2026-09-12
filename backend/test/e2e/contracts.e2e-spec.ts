import { describe, expect, it } from 'vitest';
import { computeScore } from '../../src/diagnostic/domain/scoring.engine';
import { computeRecommendation } from '../../src/diagnostic/domain/recommendation.engine';
import { Dimension } from '../../src/diagnostic/enums/dimension.enum';
import { MaturityLevel } from '@prisma/client';

const VALID_ANSWERS = {
  Q1: 'REGISTERED',
  Q2: 'YES',
  Q3: 'MOSTLY_UP_TO_DATE',
  Q4: 'PARTIALLY_ORGANIZED',
  Q5: 'SIMPLE_SOFTWARE',
  Q6: 'SYSTEMATICALLY',
  Q7: 'UNDER_ONE_YEAR_OLD',
  Q8: 'INFORMAL',
  Q9: 'APPROXIMATE',
  Q10: 'IDENTIFIED_NOT_DOCUMENTED',
};

describe('Contrat DiagnosticResponseDto', () => {
  const scoring = computeScore(VALID_ANSWERS as any);
  const recommendation = computeRecommendation(scoring);

  describe('champs racine', () => {
    it('globalScore est un nombre', () => {
      expect(typeof scoring.globalScore).toBe('number');
    });

    it('globalScore est arrondi à une décimale maximum', () => {
      const decimals =
        scoring.globalScore.toString().split('.')[1]?.length ?? 0;
      expect(decimals).toBeLessThanOrEqual(1);
    });

    it('maturityLevel est une valeur de MaturityLevel', () => {
      expect(Object.values(MaturityLevel)).toContain(scoring.maturityLevel);
    });

    it('maturityLabel est une chaîne non vide', () => {
      expect(typeof recommendation.maturityLabel).toBe('string');
      expect(recommendation.maturityLabel.length).toBeGreaterThan(0);
    });

    it('maturityDescription est une chaîne non vide', () => {
      expect(typeof recommendation.maturityDescription).toBe('string');
      expect(recommendation.maturityDescription.length).toBeGreaterThan(0);
    });

    it('cascadeTriggered est un booléen', () => {
      expect(typeof scoring.cascadeTriggered).toBe('boolean');
    });

    it('strongestDimension est une valeur de Dimension', () => {
      expect(Object.values(Dimension)).toContain(scoring.strongestDimension);
    });

    it('improvementFocus est une valeur de Dimension', () => {
      expect(Object.values(Dimension)).toContain(scoring.improvementFocus);
    });

    it('mainRecommendation est une chaîne non vide', () => {
      expect(typeof recommendation.mainRecommendation).toBe('string');
      expect(recommendation.mainRecommendation.length).toBeGreaterThan(0);
    });

    it('secondaryRecommendations est un tableau', () => {
      expect(Array.isArray(recommendation.secondaryRecommendations)).toBe(true);
    });

    it('secondaryRecommendations ne dépasse pas 2 éléments', () => {
      expect(
        recommendation.secondaryRecommendations.length,
      ).toBeLessThanOrEqual(2);
    });

    it('chaque élément de secondaryRecommendations est une chaîne non vide', () => {
      for (const text of recommendation.secondaryRecommendations) {
        expect(typeof text).toBe('string');
        expect(text.length).toBeGreaterThan(0);
      }
    });
  });

  describe('champ scores', () => {
    it('scores.formalization est un entier', () => {
      expect(Number.isInteger(scoring.formalizationScore)).toBe(true);
    });

    it('scores.formalization est compris entre 0 et 100', () => {
      expect(scoring.formalizationScore).toBeGreaterThanOrEqual(0);
      expect(scoring.formalizationScore).toBeLessThanOrEqual(100);
    });

    it('scores.accounting.raw est un entier', () => {
      expect(Number.isInteger(scoring.accountingRawScore)).toBe(true);
    });

    it('scores.accounting.final est un entier', () => {
      expect(Number.isInteger(scoring.accountingFinalScore)).toBe(true);
    });

    it('scores.accounting.final <= scores.accounting.raw', () => {
      expect(scoring.accountingFinalScore).toBeLessThanOrEqual(
        scoring.accountingRawScore,
      );
    });

    it('scores.accounting.raw est compris entre 0 et 100', () => {
      expect(scoring.accountingRawScore).toBeGreaterThanOrEqual(0);
      expect(scoring.accountingRawScore).toBeLessThanOrEqual(100);
    });

    it('scores.accounting.final est compris entre 0 et 100', () => {
      expect(scoring.accountingFinalScore).toBeGreaterThanOrEqual(0);
      expect(scoring.accountingFinalScore).toBeLessThanOrEqual(100);
    });

    it('scores.funding.raw est un entier', () => {
      expect(Number.isInteger(scoring.fundingRawScore)).toBe(true);
    });

    it('scores.funding.final est un entier', () => {
      expect(Number.isInteger(scoring.fundingFinalScore)).toBe(true);
    });

    it('scores.funding.final <= scores.funding.raw', () => {
      expect(scoring.fundingFinalScore).toBeLessThanOrEqual(
        scoring.fundingRawScore,
      );
    });

    it('scores.funding.raw est compris entre 0 et 100', () => {
      expect(scoring.fundingRawScore).toBeGreaterThanOrEqual(0);
      expect(scoring.fundingRawScore).toBeLessThanOrEqual(100);
    });

    it('scores.funding.final est compris entre 0 et 100', () => {
      expect(scoring.fundingFinalScore).toBeGreaterThanOrEqual(0);
      expect(scoring.fundingFinalScore).toBeLessThanOrEqual(100);
    });
  });

  describe('cohérence entre champs', () => {
    it('strongestDimension != improvementFocus sauf si toutes les dimensions sont égales', () => {
      const allEqual =
        scoring.formalizationScore === scoring.accountingFinalScore &&
        scoring.accountingFinalScore === scoring.fundingFinalScore;

      if (!allEqual) {
        expect(scoring.strongestDimension).not.toBe(scoring.improvementFocus);
      }
    });

    it('cascade déclenchée implique improvementFocus === FORMALIZATION', () => {
      if (scoring.cascadeTriggered) {
        expect(scoring.improvementFocus).toBe(Dimension.FORMALIZATION);
      }
    });

    it('cascade déclenchée implique secondaryRecommendations non vide', () => {
      if (scoring.cascadeTriggered) {
        expect(recommendation.secondaryRecommendations.length).toBeGreaterThan(
          0,
        );
      }
    });

    it('cascade non déclenchée implique secondaryRecommendations vide', () => {
      if (!scoring.cascadeTriggered) {
        expect(recommendation.secondaryRecommendations).toHaveLength(0);
      }
    });

    it('globalScore compris entre 0 et 100', () => {
      expect(scoring.globalScore).toBeGreaterThanOrEqual(0);
      expect(scoring.globalScore).toBeLessThanOrEqual(100);
    });
  });
});

describe('Contrat SubmitDiagnosticDto - codes de réponse acceptés', () => {
  it('Q1 accepte exactement NOT_REGISTERED, REGISTRATION_IN_PROGRESS, REGISTERED', () => {
    const valid = ['NOT_REGISTERED', 'REGISTRATION_IN_PROGRESS', 'REGISTERED'];
    for (const code of valid) {
      expect(() =>
        computeScore({ ...VALID_ANSWERS, Q1: code } as any),
      ).not.toThrow();
    }
  });

  it('Q2 accepte exactement NO, YES', () => {
    const valid = ['NO', 'YES'];
    for (const code of valid) {
      expect(() =>
        computeScore({ ...VALID_ANSWERS, Q2: code } as any),
      ).not.toThrow();
    }
  });

  it('Q3 accepte exactement NOT_UP_TO_DATE, PARTIALLY_UP_TO_DATE, MOSTLY_UP_TO_DATE, FULLY_UP_TO_DATE', () => {
    const valid = [
      'NOT_UP_TO_DATE',
      'PARTIALLY_UP_TO_DATE',
      'MOSTLY_UP_TO_DATE',
      'FULLY_UP_TO_DATE',
    ];
    for (const code of valid) {
      expect(() =>
        computeScore({ ...VALID_ANSWERS, Q3: code } as any),
      ).not.toThrow();
    }
  });

  it('Q4 accepte exactement SCATTERED, PARTIALLY_ORGANIZED, WELL_ORGANIZED', () => {
    const valid = ['SCATTERED', 'PARTIALLY_ORGANIZED', 'WELL_ORGANIZED'];
    for (const code of valid) {
      expect(() =>
        computeScore({ ...VALID_ANSWERS, Q4: code } as any),
      ).not.toThrow();
    }
  });

  it('Q5 accepte exactement NONE, INFORMAL_TRACKING, SIMPLE_SOFTWARE, DEDICATED_ACCOUNTANT', () => {
    const valid = [
      'NONE',
      'INFORMAL_TRACKING',
      'SIMPLE_SOFTWARE',
      'DEDICATED_ACCOUNTANT',
    ];
    for (const code of valid) {
      expect(() =>
        computeScore({ ...VALID_ANSWERS, Q5: code } as any),
      ).not.toThrow();
    }
  });

  it('Q6 accepte exactement RARELY_OR_NEVER, IRREGULARLY, SYSTEMATICALLY', () => {
    const valid = ['RARELY_OR_NEVER', 'IRREGULARLY', 'SYSTEMATICALLY'];
    for (const code of valid) {
      expect(() =>
        computeScore({ ...VALID_ANSWERS, Q6: code } as any),
      ).not.toThrow();
    }
  });

  it('Q7 accepte exactement NEVER_PRODUCED, OVER_ONE_YEAR_OLD, UNDER_ONE_YEAR_OLD', () => {
    const valid = ['NEVER_PRODUCED', 'OVER_ONE_YEAR_OLD', 'UNDER_ONE_YEAR_OLD'];
    for (const code of valid) {
      expect(() =>
        computeScore({ ...VALID_ANSWERS, Q7: code } as any),
      ).not.toThrow();
    }
  });

  it('Q8 accepte exactement NEVER, INFORMAL, FORMAL', () => {
    const valid = ['NEVER', 'INFORMAL', 'FORMAL'];
    for (const code of valid) {
      expect(() =>
        computeScore({ ...VALID_ANSWERS, Q8: code } as any),
      ).not.toThrow();
    }
  });

  it('Q9 accepte exactement UNCLEAR, APPROXIMATE, PRECISE', () => {
    const valid = ['UNCLEAR', 'APPROXIMATE', 'PRECISE'];
    for (const code of valid) {
      expect(() =>
        computeScore({ ...VALID_ANSWERS, Q9: code } as any),
      ).not.toThrow();
    }
  });

  it('Q10 accepte exactement NOT_IDENTIFIED, IDENTIFIED_NOT_DOCUMENTED, IDENTIFIED_AND_DOCUMENTED', () => {
    const valid = [
      'NOT_IDENTIFIED',
      'IDENTIFIED_NOT_DOCUMENTED',
      'IDENTIFIED_AND_DOCUMENTED',
    ];
    for (const code of valid) {
      expect(() =>
        computeScore({ ...VALID_ANSWERS, Q10: code } as any),
      ).not.toThrow();
    }
  });

  it("une valeur inconnue pour n'importe quelle question lève une erreur", () => {
    const questions = [
      'Q1',
      'Q2',
      'Q3',
      'Q4',
      'Q5',
      'Q6',
      'Q7',
      'Q8',
      'Q9',
      'Q10',
    ];
    for (const q of questions) {
      expect(() =>
        computeScore({ ...VALID_ANSWERS, [q]: 'VALEUR_INVALIDE' } as any),
      ).toThrow();
    }
  });
});
