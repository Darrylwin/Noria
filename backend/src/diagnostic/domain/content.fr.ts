import { Dimension, MaturityLevel } from '../enums/dimension.enum.js';

// --- Types ---

/**
 * Structure de contenu pour un niveau de maturité globale.
 */
export interface MaturityLevelContent {
  label: string;
  description: string;
  generalRecommendation: string;
}

/**
 * Recommandations déclinées par niveau de score (faible, moyen, élevé) pour une dimension.
 */
export interface DimensionLevelRecommendation {
  low: string;
  medium: string;
  high: string;
}

/**
 * Messages d'explication spécifiques déclenchés par la règle de cascade.
 */
export interface CascadeContent {
  main: string;
  secondary: string;
}

// --- Seuils de niveau par dimension ---
export const DIMENSION_LEVEL_THRESHOLD_LOW = 45;
export const DIMENSION_LEVEL_THRESHOLD_HIGH = 75;

// --- Contenu par niveau de maturité globale ---
export const MATURITY_LEVEL_CONTENT: Record<
  MaturityLevel,
  MaturityLevelContent
> = {
  [MaturityLevel.NEEDS_STRENGTHENING]: {
    label: 'Structuration à renforcer',
    description:
      'Votre entreprise fonctionne, mais plusieurs fondations administratives et financières restent à consolider pour sécuriser sa croissance.',
    generalRecommendation:
      'Prioriser une action de structuration simple et rapide plutôt que de chercher à tout corriger en même temps.',
  },
  [MaturityLevel.IN_PROGRESS]: {
    label: 'Structuration en cours',
    description:
      "Des bases solides existent déjà. Certains points méritent encore d'être renforcés pour fiabiliser votre gestion et faciliter vos démarches futures.",
    generalRecommendation:
      'Continuer sur la dynamique engagée en traitant en priorité le point le plus limitant.',
  },
  [MaturityLevel.ADVANCED]: {
    label: 'Structuration avancée',
    description:
      "Votre entreprise dispose d'une bonne maîtrise administrative et financière, un atout réel pour accéder à des opportunités de développement.",
    generalRecommendation:
      'Maintenir cette rigueur et explorer les opportunités de financement ou de croissance qui deviennent accessibles.',
  },
};

// --- Recommandations par dimension et par niveau de score ---
export const DIMENSION_RECOMMENDATIONS: Record<
  Dimension,
  DimensionLevelRecommendation
> = {
  [Dimension.FORMALIZATION]: {
    low: "Finalisez l'enregistrement légal de votre entreprise et séparez vos finances personnelles et professionnelles, c'est la base de toute structuration durable.",
    medium:
      'Poursuivez la mise à jour de vos obligations administratives et centralisez vos documents officiels pour gagner en fiabilité.',
    high: "Votre structuration légale est solide, maintenez cette rigueur, c'est un vrai atout pour vos démarches futures.",
  },
  [Dimension.ACCOUNTING]: {
    low: 'Mettez en place un suivi régulier de vos dépenses et recettes, même simple, pour mieux piloter votre activité.',
    medium:
      'Conservez systématiquement vos pièces justificatives et envisagez un outil de comptabilité adapté à votre taille.',
    high: 'Votre comptabilité est bien tenue, elle constitue une base fiable pour tout dossier futur.',
  },
  [Dimension.FUNDING]: {
    low: "Clarifiez votre niveau d'endettement actuel et identifiez précisément vos besoins avant toute démarche de financement.",
    medium:
      'Formalisez votre besoin de financement (montant, objet, échéance) pour être prêt le moment venu.',
    high: 'Vous êtes bien positionné pour engager une démarche de financement structurée.',
  },
};

// --- Contenu spécifique à la règle de cascade ---
export const CASCADE_CONTENT: CascadeContent = {
  main: "Votre structuration légale et administrative est aujourd'hui le principal levier de progression pour votre entreprise. Elle conditionne la fiabilité de vos documents et facilite l'accès aux opportunités de financement.",
  secondary:
    'Complétez votre enregistrement légal et régularisez vos obligations administratives en priorité.',
};
