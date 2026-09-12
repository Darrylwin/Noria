import { describe, expect, it } from 'vitest';
import { computeScore, MaturityLevel } from '../../src/diagnostic/domain/scoring.engine.js';
import { Dimension } from '../../src/diagnostic/enums/dimension.enum.js';

// Helpers pour construire des réponses rapidement
const allMin = () => ({
  Q1: 'NOT_REGISTERED',
  Q2: 'NO',
  Q3: 'NOT_UP_TO_DATE',
  Q4: 'SCATTERED',
  Q5: 'NONE',
  Q6: 'RARELY_OR_NEVER',
  Q7: 'NEVER_PRODUCED',
  Q8: 'NEVER',
  Q9: 'UNCLEAR',
  Q10: 'NOT_IDENTIFIED',
});

const allMax = () => ({
  Q1: 'REGISTERED',
  Q2: 'YES',
  Q3: 'FULLY_UP_TO_DATE',
  Q4: 'WELL_ORGANIZED',
  Q5: 'DEDICATED_ACCOUNTANT',
  Q6: 'SYSTEMATICALLY',
  Q7: 'UNDER_ONE_YEAR_OLD',
  Q8: 'FORMAL',
  Q9: 'PRECISE',
  Q10: 'IDENTIFIED_AND_DOCUMENTED',
});

describe('computeScore - valeurs limites globales', () => {
  it('toutes les réponses au minimum : score global 0, niveau NEEDS_STRENGTHENING', () => {
    const result = computeScore(allMin() as any);
    expect(result.globalScore).toBe(0);
    expect(result.maturityLevel).toBe(MaturityLevel.NEEDS_STRENGTHENING);
  });

  it('toutes les réponses au maximum : score global 100, niveau ADVANCED', () => {
    const result = computeScore(allMax() as any);
    expect(result.globalScore).toBe(100);
    expect(result.maturityLevel).toBe(MaturityLevel.ADVANCED);
  });
});

describe('computeScore - plafond (cap)', () => {
  it('formalisation à 0 : plafond à 50, les deux autres dimensions plafonnées si > 50', () => {
    const result = computeScore({
      Q1: 'NOT_REGISTERED',
      Q2: 'NO',
      Q3: 'NOT_UP_TO_DATE',
      Q4: 'SCATTERED',
      // Comptabilité et financement au max
      Q5: 'DEDICATED_ACCOUNTANT',
      Q6: 'SYSTEMATICALLY',
      Q7: 'UNDER_ONE_YEAR_OLD',
      Q8: 'FORMAL',
      Q9: 'PRECISE',
      Q10: 'IDENTIFIED_AND_DOCUMENTED',
    } as any);

    expect(result.formalizationScore).toBe(0);
    expect(result.accountingFinalScore).toBe(50);
    expect(result.fundingFinalScore).toBe(50);
    expect(result.accountingFinalScore).toBeLessThanOrEqual(
      result.accountingRawScore,
    );
    expect(result.fundingFinalScore).toBeLessThanOrEqual(
      result.fundingRawScore,
    );
  });

  it('formalisation à 100 : plafond à 100, aucune dimension plafonnée', () => {
    const result = computeScore(allMax() as any);
    expect(result.accountingFinalScore).toBe(result.accountingRawScore);
    expect(result.fundingFinalScore).toBe(result.fundingRawScore);
    expect(result.cascadeTriggered).toBe(false);
  });

  it('plafond intermédiaire : formalisation à 50, plafond à 75', () => {
    const result = computeScore({
      Q1: 'REGISTRATION_IN_PROGRESS', // 50
      Q2: 'YES', // 100
      Q3: 'NOT_UP_TO_DATE', // 0
      Q4: 'WELL_ORGANIZED', // 100
      // formalization = (50+100+0+100)/4 = 62.5 => cap = 50 + 0.5*62.5 = 81.25
      Q5: 'DEDICATED_ACCOUNTANT', // 100
      Q6: 'SYSTEMATICALLY', // 100
      Q7: 'UNDER_ONE_YEAR_OLD', // 100 => accounting raw = 100 > 81.25 => plafonné
      Q8: 'NEVER', // 0
      Q9: 'UNCLEAR', // 0
      Q10: 'NOT_IDENTIFIED', // 0 => funding raw = 0 < 81.25 => non plafonné
    } as any);

    expect(result.accountingFinalScore).toBeLessThan(result.accountingRawScore);
    expect(result.fundingFinalScore).toBe(result.fundingRawScore);
  });

  it('scores bruts déjà sous le plafond : aucun plafonnement effectif', () => {
    // exemple 2 du doc
    const result = computeScore({
      Q1: 'REGISTRATION_IN_PROGRESS', // 50
      Q2: 'NO', // 0
      Q3: 'PARTIALLY_UP_TO_DATE', // 33
      Q4: 'SCATTERED', // 0
      // formalization ≈ 20.75 => cap ≈ 60.375
      Q5: 'INFORMAL_TRACKING', // 33
      Q6: 'IRREGULARLY', // 50
      Q7: 'NEVER_PRODUCED', // 0  => accounting raw ≈ 27.7 < cap
      Q8: 'INFORMAL', // 50
      Q9: 'UNCLEAR', // 0
      Q10: 'NOT_IDENTIFIED', // 0  => funding raw ≈ 16.7 < cap
    } as any);

    expect(result.accountingFinalScore).toBe(result.accountingRawScore);
    expect(result.fundingFinalScore).toBe(result.fundingRawScore);
    expect(result.cascadeTriggered).toBe(false);
  });
});

describe('computeScore - cascade', () => {
  it('exemple 1 du doc : cascade déclenchée, axe forcé sur FORMALIZATION', () => {
    // formalisation ≈ 25, comptabilité 90, financement 80
    const result = computeScore({
      Q1: 'NOT_REGISTERED', // 0
      Q2: 'NO', // 0
      Q3: 'MOSTLY_UP_TO_DATE', // 66
      Q4: 'PARTIALLY_ORGANIZED', // 50
      // formalization = (0+0+66+50)/4 = 29 => cap = 50 + 0.5*29 = 64.5
      Q5: 'DEDICATED_ACCOUNTANT', // 100
      Q6: 'SYSTEMATICALLY', // 100
      Q7: 'UNDER_ONE_YEAR_OLD', // 100 => accounting raw = 100 > 64.5
      Q8: 'FORMAL', // 100
      Q9: 'PRECISE', // 100
      Q10: 'IDENTIFIED_AND_DOCUMENTED', // 100 => funding raw = 100 > 64.5
    } as any);

    expect(result.cascadeTriggered).toBe(true);
    expect(result.improvementFocus).toBe(Dimension.FORMALIZATION);
  });

  it('formalisation < 50 mais autres dimensions naturellement faibles : pas de cascade', () => {
    const result = computeScore({
      Q1: 'NOT_REGISTERED', // 0
      Q2: 'NO', // 0
      Q3: 'PARTIALLY_UP_TO_DATE', // 33
      Q4: 'PARTIALLY_ORGANIZED', // 50
      // formalization = (0+0+33+50)/4 = 20.75 => cap ≈ 60.375
      Q5: 'INFORMAL_TRACKING', // 33
      Q6: 'IRREGULARLY', // 50
      Q7: 'NEVER_PRODUCED', // 0  => accounting raw ≈ 27.7 < cap
      Q8: 'INFORMAL', // 50
      Q9: 'UNCLEAR', // 0
      Q10: 'NOT_IDENTIFIED', // 0  => funding raw ≈ 16.7 < cap
    } as any);

    expect(result.cascadeTriggered).toBe(false);
  });

  it('formalisation >= 50 : cascade impossible quelle que soit la valeur des autres', () => {
    const result = computeScore({
      Q1: 'REGISTERED', // 100
      Q2: 'YES', // 100
      Q3: 'NOT_UP_TO_DATE', // 0
      Q4: 'SCATTERED', // 0
      // formalization = 50 exactement => cap = 75
      Q5: 'DEDICATED_ACCOUNTANT', // 100
      Q6: 'SYSTEMATICALLY', // 100
      Q7: 'UNDER_ONE_YEAR_OLD', // 100 => accounting raw = 100 > 75
      Q8: 'FORMAL', // 100
      Q9: 'PRECISE', // 100
      Q10: 'IDENTIFIED_AND_DOCUMENTED', // 100
    } as any);

    expect(result.cascadeTriggered).toBe(false);
  });
});

describe('computeScore - niveaux de maturité aux bornes exactes', () => {
  it('score global < 45 : NEEDS_STRENGTHENING', () => {
    const result = computeScore({
      Q1: 'NOT_REGISTERED', // 0
      Q2: 'NO', // 0
      Q3: 'NOT_UP_TO_DATE', // 0
      Q4: 'SCATTERED', // 0
      // formalization = 0 => cap = 50
      Q5: 'SIMPLE_SOFTWARE', // 66
      Q6: 'IRREGULARLY', // 50
      Q7: 'NEVER_PRODUCED', // 0  => accounting raw ≈ 38.7 => final ≈ 38.7
      Q8: 'INFORMAL', // 50
      Q9: 'UNCLEAR', // 0
      Q10: 'NOT_IDENTIFIED', // 0  => funding raw ≈ 16.7 => final ≈ 16.7
      // global = 0*0.4 + 38.7*0.3 + 16.7*0.3 ≈ 16.6 < 45
    } as any);

    expect(result.maturityLevel).toBe(MaturityLevel.NEEDS_STRENGTHENING);
  });

  it('score global >= 75 : ADVANCED', () => {
    const result = computeScore(allMax() as any);
    expect(result.globalScore).toBeGreaterThanOrEqual(75);
    expect(result.maturityLevel).toBe(MaturityLevel.ADVANCED);
  });
});

describe('computeScore - tie-break point fort', () => {
  it('égalité stricte entre toutes les dimensions : FORMALIZATION prioritaire', () => {
    const result = computeScore({
      Q1: 'REGISTERED', // 100
      Q2: 'YES', // 100
      Q3: 'NOT_UP_TO_DATE', // 0
      Q4: 'SCATTERED', // 0
      // formalization = 50
      Q5: 'DEDICATED_ACCOUNTANT', // 100
      Q6: 'RARELY_OR_NEVER', // 0
      Q7: 'NEVER_PRODUCED', // 0  => accounting raw = 33.3 < cap 75 => final 33
      Q8: 'FORMAL', // 100
      Q9: 'UNCLEAR', // 0
      Q10: 'NOT_IDENTIFIED', // 0  => funding raw = 33.3 < 75 => final 33
    } as any);

    // formalization=50, accounting≈33, funding≈33 => strongest = FORMALIZATION
    expect(result.strongestDimension).toBe(Dimension.FORMALIZATION);
  });

  it('égalité entre ACCOUNTING et FUNDING : ACCOUNTING prioritaire pour le point fort', () => {
    const result = computeScore({
      Q1: 'NOT_REGISTERED', // 0
      Q2: 'NO', // 0
      Q3: 'NOT_UP_TO_DATE', // 0
      Q4: 'SCATTERED', // 0
      // formalization = 0 => cap = 50
      Q5: 'DEDICATED_ACCOUNTANT', // 100
      Q6: 'RARELY_OR_NEVER', // 0
      Q7: 'NEVER_PRODUCED', // 0  => accounting raw = 33.3 => final = 33
      Q8: 'FORMAL', // 100
      Q9: 'UNCLEAR', // 0
      Q10: 'NOT_IDENTIFIED', // 0  => funding raw = 33.3 => final = 33
    } as any);

    // formalization=0, accounting=33, funding=33 => strongest = ACCOUNTING
    expect(result.strongestDimension).toBe(Dimension.ACCOUNTING);
  });
});

describe("computeScore - tie-break axe d'amélioration", () => {
  it("égalité entre ACCOUNTING et FUNDING : ACCOUNTING prioritaire pour l'axe", () => {
    const result = computeScore({
      Q1: 'REGISTERED', // 100
      Q2: 'YES', // 100
      Q3: 'FULLY_UP_TO_DATE', // 100
      Q4: 'WELL_ORGANIZED', // 100
      // formalization = 100 => cap = 100
      Q5: 'NONE', // 0
      Q6: 'RARELY_OR_NEVER', // 0
      Q7: 'NEVER_PRODUCED', // 0  => accounting raw = 0
      Q8: 'NEVER', // 0
      Q9: 'UNCLEAR', // 0
      Q10: 'NOT_IDENTIFIED', // 0  => funding raw = 0
    } as any);

    // accounting=0, funding=0, cascade=false => ACCOUNTING prioritaire
    expect(result.improvementFocus).toBe(Dimension.ACCOUNTING);
  });
});

describe('computeScore - invariants', () => {
  it('accountingFinalScore <= accountingRawScore, toujours', () => {
    const result = computeScore(allMax() as any);
    expect(result.accountingFinalScore).toBeLessThanOrEqual(
      result.accountingRawScore,
    );
  });

  it('fundingFinalScore <= fundingRawScore, toujours', () => {
    const result = computeScore(allMax() as any);
    expect(result.fundingFinalScore).toBeLessThanOrEqual(
      result.fundingRawScore,
    );
  });

  it('globalScore toujours entre 0 et 100', () => {
    const r1 = computeScore(allMin() as any);
    const r2 = computeScore(allMax() as any);
    expect(r1.globalScore).toBeGreaterThanOrEqual(0);
    expect(r2.globalScore).toBeLessThanOrEqual(100);
  });

  it('déterminisme : deux appels identiques produisent le même résultat', () => {
    const answers = allMax() as any;
    expect(computeScore(answers)).toEqual(computeScore(answers));
  });

  it('cascadeTriggered ne peut jamais être vrai si formalizationScore >= 50', () => {
    const result = computeScore({
      Q1: 'REGISTERED', // 100
      Q2: 'YES', // 100
      Q3: 'NOT_UP_TO_DATE', // 0
      Q4: 'SCATTERED', // 0
      // formalization = 50 exactement
      Q5: 'DEDICATED_ACCOUNTANT', // 100
      Q6: 'SYSTEMATICALLY', // 100
      Q7: 'UNDER_ONE_YEAR_OLD', // 100
      Q8: 'FORMAL', // 100
      Q9: 'PRECISE', // 100
      Q10: 'IDENTIFIED_AND_DOCUMENTED', // 100
    } as any);

    expect(result.formalizationScore).toBeGreaterThanOrEqual(50);
    expect(result.cascadeTriggered).toBe(false);
  });
});
