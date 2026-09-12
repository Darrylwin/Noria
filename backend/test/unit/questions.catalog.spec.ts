import { describe, expect, it } from 'vitest';
import { QUESTIONS_CATALOG } from '../../src/diagnostic/domain/questions.catalog';
import { Dimension } from '../../src/diagnostic/enums/dimension.enum';

describe('QuestionsCatalog (QUESTIONS_CATALOG)', () => {
  it('devrait contenir exactement 10 questions', () => {
    expect(QUESTIONS_CATALOG).toBeDefined();
    expect(QUESTIONS_CATALOG).toHaveLength(10);
  });

  it('devrait posséder des codes de questions uniques allant de Q1 à Q10', () => {
    const codes = QUESTIONS_CATALOG.map((q) => q.code);
    const uniqueCodes = new Set(codes);

    expect(uniqueCodes.size).toBe(10);
    expect(codes).toEqual([
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
    ]);
  });

  it('devrait associer chaque question à une dimension valide', () => {
    const validDimensions = Object.values(Dimension);

    QUESTIONS_CATALOG.forEach((question) => {
      expect(question.dimension).toBeDefined();
      expect(validDimensions).toContain(question.dimension);
    });
  });

  it('devrait vérifier que chaque question comporte des options valides avec des scores non négatifs', () => {
    QUESTIONS_CATALOG.forEach((question) => {
      expect(question.options).toBeDefined();
      expect(Array.isArray(question.options)).toBe(true);
      expect(question.options.length).toBeGreaterThan(0);

      question.options.forEach((option) => {
        expect(option.code).toBeDefined();
        expect(typeof option.code).toBe('string');
        expect(option.scoreValue).toBeDefined();
        expect(typeof option.scoreValue).toBe('number');
        expect(option.scoreValue).toBeGreaterThanOrEqual(0);
      });
    });
  });

  it("devrait garantir l'unicité globale des codes d'options de réponse", () => {
    const allOptionCodes = QUESTIONS_CATALOG.flatMap((q) =>
      q.options.map((o) => o.code),
    );
    const uniqueOptionCodes = new Set(allOptionCodes);

    expect(uniqueOptionCodes.size).toBe(allOptionCodes.length);
  });

  it("devrait couvrir l'intégralité des trois dimensions NORIA (Formalisation, Comptabilité, Financement)", () => {
    const coveredDimensions = new Set(
      QUESTIONS_CATALOG.map((q) => q.dimension),
    );

    expect(coveredDimensions.has(Dimension.FORMALIZATION)).toBe(true);
    expect(coveredDimensions.has(Dimension.ACCOUNTING)).toBe(true);
    expect(coveredDimensions.has(Dimension.FUNDING)).toBe(true);
  });
});
