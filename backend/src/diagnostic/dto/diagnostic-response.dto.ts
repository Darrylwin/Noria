import { ApiProperty } from '@nestjs/swagger';
import { Dimension, MaturityLevel } from '../enums/dimension.enum.js';

/**
 * Score d'une dimension soumise au mécanisme de plafonnement (Comptabilité, Financement
 * uniquement - la Formalisation n'est jamais plafonnée et n'a donc pas cette structure).
 */
export class DimensionFinalRawDto {
  @ApiProperty({
    example: 89,
    description:
      'Score calculé à partir des réponses de cette dimension seule, avant tout plafonnement. ' +
      "Utile pour un affichage pédagogique de l'effet du plafonnement, mais ce n'est jamais " +
      'cette valeur qui doit être affichée comme résultat principal.',
  })
  raw: number;

  @ApiProperty({
    example: 81,
    description:
      'Score réellement retenu pour le calcul du score global et de tous les indicateurs ' +
      "(maturityLevel, strongestDimension, improvementFocus). C'est TOUJOURS cette valeur " +
      "qui doit être affichée à l'utilisateur comme le score de cette dimension. " +
      'Si final < raw, cela signifie que le score a été plafonné par une Formalisation ' +
      'insuffisante - ce lien de cause à effet ne doit jamais être exposé explicitement ' +
      "à l'utilisateur final (voir mainRecommendation en cas de cascadeTriggered).",
  })
  final: number;
}

/**
 * Scores des 3 dimensions du diagnostic. formalization est un nombre simple (jamais
 * plafonné), accounting et funding ont une structure raw/final (voir DimensionFinalRawDto).
 */
export class DimensionScoresDto {
  @ApiProperty({
    example: 62,
    description:
      'Score de la dimension Formalisation (0-100). Cette dimension détermine le plafond ' +
      'appliqué aux deux autres (formule : 50 + 0.5 × ce score) - plus il est faible, plus ' +
      'le plafond est bas.',
  })
  formalization: number;

  @ApiProperty({ type: DimensionFinalRawDto })
  accounting: DimensionFinalRawDto;

  @ApiProperty({ type: DimensionFinalRawDto })
  funding: DimensionFinalRawDto;
}

/**
 * Résultat complet d'un diagnostic, renvoyé à la fois par POST /diagnostics (création)
 * et GET /diagnostics/:id (relecture) - structure strictement identique dans les deux cas,
 * pour permettre au frontend de réutiliser le même composant d'affichage.
 */
export class DiagnosticResponseDto {
  @ApiProperty({
    example: 'b3e1e6d2-4b2a-4c39-9a2f-1234567890ab',
    description:
      "Identifiant unique de la soumission. À utiliser dans l'URL de la page de résultat " +
      '(ex. /diagnostic/resultat/{id}) pour permettre un rechargement de page via GET /diagnostics/:id ' +
      'sans perdre le résultat.',
  })
  id: string;

  @ApiProperty({
    example: 68.4,
    description:
      'Score global de maturité (0-100, une décimale). Formule : 40% Formalisation + 30% ' +
      "Comptabilité (final) + 30% Financement (final). C'est l'indicateur le plus visible " +
      "de l'écran de résultat.",
  })
  globalScore: number;

  @ApiProperty({
    enum: MaturityLevel,
    example: MaturityLevel.IN_PROGRESS,
    description:
      'Palier de maturité dérivé de globalScore : NEEDS_STRENGTHENING (< 45), ' +
      "IN_PROGRESS (45 à 74.9), ADVANCED (≥ 75). Utiliser maturityLabel pour l'affichage, " +
      "cette valeur enum sert uniquement à la logique (ex. couleur d'un badge).",
  })
  maturityLevel: MaturityLevel;

  @ApiProperty({
    example: 'Structuration en cours',
    description:
      'Libellé français du niveau de maturité, prêt à afficher tel quel.',
  })
  maturityLabel: string;

  @ApiProperty({
    example:
      "Des bases solides existent déjà. Certains points méritent encore d'être renforcés pour fiabiliser votre gestion et faciliter vos démarches futures.",
    description:
      'Texte explicatif du niveau de maturité, à afficher juste sous maturityLabel. ' +
      'Prêt à afficher tel quel, jamais à reformuler côté frontend.',
  })
  maturityDescription: string;

  @ApiProperty({ type: DimensionScoresDto })
  scores: DimensionScoresDto;

  @ApiProperty({
    enum: Dimension,
    example: Dimension.ACCOUNTING,
    description:
      "Dimension où l'entreprise obtient le meilleur score final. En cas d'égalité stricte, " +
      "l'ordre de priorité est FORMALIZATION puis ACCOUNTING puis FUNDING.",
  })
  strongestDimension: Dimension;

  @ApiProperty({
    enum: Dimension,
    example: Dimension.FUNDING,
    description:
      'Dimension identifiée comme axe de progression prioritaire. Si cascadeTriggered est ' +
      'vrai, cette valeur est TOUJOURS FORMALIZATION, quel que soit le score des autres ' +
      "dimensions - c'est un forçage métier volontaire, pas une anomalie. Hors cascade, " +
      "l'ordre de priorité en cas d'égalité est ACCOUNTING puis FUNDING puis FORMALIZATION.",
  })
  improvementFocus: Dimension;

  @ApiProperty({
    example: false,
    description:
      'Indique si le mécanisme de "cascade" a été déclenché : une Formalisation insuffisante ' +
      '(< 50) a effectivement plafonné au moins une des deux autres dimensions (leur score brut ' +
      'dépassait le plafond autorisé). Quand true, mainRecommendation et secondaryRecommendations ' +
      'portent un message spécifique de priorisation de la Formalisation, différent du texte ' +
      'standard associé à improvementFocus. IMPORTANT : le frontend ne doit jamais afficher les ' +
      'mots "plafonnement", "score brut", "pondération" ou "cascade" à l\'utilisateur - cette ' +
      "valeur ne sert qu'à la logique interne, jamais à un affichage littéral de son nom.",
  })
  cascadeTriggered: boolean;

  @ApiProperty({
    example:
      'Formalisez votre besoin de financement (montant, objet, échéance) pour être prêt le moment venu.',
    description:
      "Recommandation textuelle principale, à afficher en priorité sur l'écran de résultat. " +
      'Toujours non vide, prête à afficher telle quelle.',
  })
  mainRecommendation: string;

  @ApiProperty({
    type: [String],
    example: [],
    description:
      'Recommandations complémentaires, 0 à 2 éléments maximum. Dans ce prototype, ce tableau ' +
      "n'est jamais vide UNIQUEMENT quand cascadeTriggered est true (il contient alors exactement " +
      '1 élément). Dans tous les autres cas, il est vide - ne pas coder de logique de pagination ' +
      "ou d'accordéon suggérant qu'il peut y en avoir davantage.",
  })
  secondaryRecommendations: string[];
}
