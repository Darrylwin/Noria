import {Dimension} from "../enums/dimension";

interface DimensionMeta {
    label: string;
    shortLabel: string;
    colorVar: string;
    softVar: string;
}

/**
 * Métadonnées purement présentationnelles (couleur, libellé court) associées
 * à chaque dimension pour l'affichage. Ne contient aucune règle de calcul :
 * les scores, seuils et formules restent exclusivement dans le backend.
 */
export const DIMENSION_META: Record<Dimension, DimensionMeta> = {
    [Dimension.FORMALIZATION]: {
        label: "Formalisation",
        shortLabel: "Formalisation",
        colorVar: "var(--color-formalization)",
        softVar: "var(--color-formalization-soft)",
    },
    [Dimension.ACCOUNTING]: {
        label: "Comptabilité",
        shortLabel: "Comptabilité",
        colorVar: "var(--color-accounting)",
        softVar: "var(--color-accounting-soft)",
    },
    [Dimension.FUNDING]: {
        label: "Préparation au financement",
        shortLabel: "Financement",
        colorVar: "var(--color-funding)",
        softVar: "var(--color-funding-soft)",
    },
};

/** Mappe un niveau de maturité déjà calculé côté serveur vers une couleur d'affichage. */
export const MATURITY_COLOR_VAR: Record<string, string> = {
    NEEDS_STRENGTHENING: "var(--color-danger)",
    IN_PROGRESS: "var(--color-warning)",
    ADVANCED: "var(--color-success)",
};