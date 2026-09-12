import { Dimension } from '../enums/dimension.enum.js';
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
} from '../enums/answers.enum.js';

export interface QuestionOption {
  code: string;
  label: string;
  scoreValue: number;
}

export interface QuestionDefinition {
  code: string;
  dimension: Dimension;
  order: number;
  label: string;
  options: QuestionOption[];
}

export const QUESTIONS_CATALOG: QuestionDefinition[] = [
  {
    code: 'Q1',
    dimension: Dimension.FORMALIZATION,
    order: 1,
    label: 'Votre entreprise est-elle officiellement enregistrée ?',
    options: [
      {
        code: Q1Answer.NOT_REGISTERED,
        label: 'Pas encore enregistrée',
        scoreValue: 0,
      },
      {
        code: Q1Answer.REGISTRATION_IN_PROGRESS,
        label: "En cours d'enregistrement",
        scoreValue: 50,
      },
      {
        code: Q1Answer.REGISTERED,
        label: 'Officiellement enregistrée',
        scoreValue: 100,
      },
    ],
  },
  {
    code: 'Q2',
    dimension: Dimension.FORMALIZATION,
    order: 2,
    label: 'Séparez-vous les finances personnelles et professionnelles ?',
    options: [
      { code: Q2Answer.NO, label: 'Non', scoreValue: 0 },
      { code: Q2Answer.YES, label: 'Oui', scoreValue: 100 },
    ],
  },
  {
    code: 'Q3',
    dimension: Dimension.FORMALIZATION,
    order: 3,
    label:
      'Vos obligations administratives et déclaratives sont-elles à jour ?',
    options: [
      { code: Q3Answer.NOT_UP_TO_DATE, label: 'Pas à jour', scoreValue: 0 },
      {
        code: Q3Answer.PARTIALLY_UP_TO_DATE,
        label: 'Partiellement à jour',
        scoreValue: 33,
      },
      {
        code: Q3Answer.MOSTLY_UP_TO_DATE,
        label: 'Globalement à jour',
        scoreValue: 66,
      },
      {
        code: Q3Answer.FULLY_UP_TO_DATE,
        label: 'Totalement à jour',
        scoreValue: 100,
      },
    ],
  },
  {
    code: 'Q4',
    dimension: Dimension.FORMALIZATION,
    order: 4,
    label:
      'Vos documents administratifs sont-ils organisés et facilement accessibles ?',
    options: [
      { code: Q4Answer.SCATTERED, label: 'Dispersés', scoreValue: 0 },
      {
        code: Q4Answer.PARTIALLY_ORGANIZED,
        label: 'Partiellement organisés',
        scoreValue: 50,
      },
      {
        code: Q4Answer.WELL_ORGANIZED,
        label: 'Bien organisés',
        scoreValue: 100,
      },
    ],
  },
  {
    code: 'Q5',
    dimension: Dimension.ACCOUNTING,
    order: 5,
    label: 'Quelle méthode utilisez-vous pour suivre votre comptabilité ?',
    options: [
      { code: Q5Answer.NONE, label: 'Aucune comptabilité', scoreValue: 0 },
      {
        code: Q5Answer.INFORMAL_TRACKING,
        label: 'Cahier ou suivi informel',
        scoreValue: 33,
      },
      {
        code: Q5Answer.SIMPLE_SOFTWARE,
        label: 'Logiciel simple',
        scoreValue: 66,
      },
      {
        code: Q5Answer.DEDICATED_ACCOUNTANT,
        label: 'Comptable ou dispositif dédié',
        scoreValue: 100,
      },
    ],
  },
  {
    code: 'Q6',
    dimension: Dimension.ACCOUNTING,
    order: 6,
    label:
      'Conservez-vous régulièrement vos factures, reçus et autres pièces justificatives ?',
    options: [
      {
        code: Q6Answer.RARELY_OR_NEVER,
        label: 'Rarement ou jamais',
        scoreValue: 0,
      },
      { code: Q6Answer.IRREGULARLY, label: 'Irrégulièrement', scoreValue: 50 },
      {
        code: Q6Answer.SYSTEMATICALLY,
        label: 'Systématiquement',
        scoreValue: 100,
      },
    ],
  },
  {
    code: 'Q7',
    dimension: Dimension.ACCOUNTING,
    order: 7,
    label: "Disposez-vous d'états financiers récents ?",
    options: [
      {
        code: Q7Answer.NEVER_PRODUCED,
        label: 'Jamais produits',
        scoreValue: 0,
      },
      {
        code: Q7Answer.OVER_ONE_YEAR_OLD,
        label: "Produits il y a plus d'un an",
        scoreValue: 50,
      },
      {
        code: Q7Answer.UNDER_ONE_YEAR_OLD,
        label: "Produits depuis moins d'un an",
        scoreValue: 100,
      },
    ],
  },
  {
    code: 'Q8',
    dimension: Dimension.FUNDING,
    order: 8,
    label: 'Votre entreprise a-t-elle déjà obtenu un financement externe ?',
    options: [
      { code: Q8Answer.NEVER, label: 'Jamais', scoreValue: 0 },
      { code: Q8Answer.INFORMAL, label: 'Informel', scoreValue: 50 },
      { code: Q8Answer.FORMAL, label: 'Formel', scoreValue: 100 },
    ],
  },
  {
    code: 'Q9',
    dimension: Dimension.FUNDING,
    order: 9,
    label:
      "Connaissez-vous précisément le niveau d'endettement actuel de votre entreprise ?",
    options: [
      { code: Q9Answer.UNCLEAR, label: 'Non clairement', scoreValue: 0 },
      {
        code: Q9Answer.APPROXIMATE,
        label: 'Approximativement',
        scoreValue: 50,
      },
      { code: Q9Answer.PRECISE, label: 'Précisément', scoreValue: 100 },
    ],
  },
  {
    code: 'Q10',
    dimension: Dimension.FUNDING,
    order: 10,
    label: 'Votre besoin de financement est-il identifié et documenté ?',
    options: [
      { code: Q10Answer.NOT_IDENTIFIED, label: 'Pas identifié', scoreValue: 0 },
      {
        code: Q10Answer.IDENTIFIED_NOT_DOCUMENTED,
        label: 'Identifié mais non documenté',
        scoreValue: 50,
      },
      {
        code: Q10Answer.IDENTIFIED_AND_DOCUMENTED,
        label: 'Identifié et documenté',
        scoreValue: 100,
      },
    ],
  },
];
