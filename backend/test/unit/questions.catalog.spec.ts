import { describe, expect, it } from 'vitest';
import { QUESTIONS_CATALOG } from '../../src/diagnostic/domain/questions.catalog.js';
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
} from '../../src/diagnostic/enums/answers.enum.js';

const ALL_ANSWER_CODES: Record<string, string[]> = {
  Q1: Object.values(Q1Answer),
  Q2: Object.values(Q2Answer),
  Q3: Object.values(Q3Answer),
  Q4: Object.values(Q4Answer),
  Q5: Object.values(Q5Answer),
  Q6: Object.values(Q6Answer),
  Q7: Object.values(Q7Answer),
  Q8: Object.values(Q8Answer),
  Q9: Object.values(Q9Answer),
  Q10: Object.values(Q10Answer),
};

const VALID_SCORE_VALUES = new Set([0, 33, 50, 66, 100]);

describe('QUESTIONS_CATALOG — complétude', () => {
  it('contient exactement 10 questions', () => {
    expect(QUESTIONS_CATALOG).toHaveLength(10);
  });

  it('les codes de question vont de Q1 à Q10 sans doublon', () => {
    const codes = QUESTIONS_CATALOG.map((q) => q.code);
    expect(new Set(codes).size).toBe(10);
    for (let i = 1; i <= 10; i++) {
      expect(codes).toContain(`Q${i}`);
    }
  });

  it('les ordres vont de 1 à 10 sans doublon', () => {
    const orders = QUESTIONS_CATALOG.map((q) => q.order);
    expect(new Set(orders).size).toBe(10);
    for (let i = 1; i <= 10; i++) {
      expect(orders).toContain(i);
    }
  });
});

describe('QUESTIONS_CATALOG — cohérence des options', () => {
  it('chaque question a au moins 2 options', () => {
    for (const question of QUESTIONS_CATALOG) {
      expect(question.options.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('les codes de réponse sont uniques au sein de chaque question', () => {
    for (const question of QUESTIONS_CATALOG) {
      const codes = question.options.map((o) => o.code);
      expect(new Set(codes).size).toBe(codes.length);
    }
  });

  it('chaque valeur de score est parmi les valeurs autorisées (0, 33, 50, 66, 100)', () => {
    for (const question of QUESTIONS_CATALOG) {
      for (const option of question.options) {
        expect(VALID_SCORE_VALUES.has(option.scoreValue)).toBe(true);
      }
    }
  });
});

describe('QUESTIONS_CATALOG — correspondance avec les enums', () => {
  it('chaque code de réponse du catalogue correspond exactement à un code dans les enums', () => {
    for (const question of QUESTIONS_CATALOG) {
      const expectedCodes = ALL_ANSWER_CODES[question.code];
      const catalogCodes = question.options.map((o) => o.code);

      expect(catalogCodes.sort()).toEqual(expectedCodes.sort());
    }
  });

  it('chaque code des enums est présent dans le catalogue', () => {
    for (const [questionCode, enumCodes] of Object.entries(ALL_ANSWER_CODES)) {
      const question = QUESTIONS_CATALOG.find((q) => q.code === questionCode);
      expect(question).toBeDefined();

      const catalogCodes = question!.options.map((o) => o.code);
      for (const enumCode of enumCodes) {
        expect(catalogCodes).toContain(enumCode);
      }
    }
  });
});
