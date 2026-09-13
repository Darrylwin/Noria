/**
 * Miroir exact des enums de réponses du backend.
 * Sert uniquement de garde-fou de typage côté frontend - les textes et
 * l'ordre d'affichage viennent toujours de GET /questions, jamais d'ici.
 */
export enum Q1Answer {
    NOT_REGISTERED = "NOT_REGISTERED",
    REGISTRATION_IN_PROGRESS = "REGISTRATION_IN_PROGRESS",
    REGISTERED = "REGISTERED",
}

export enum Q2Answer {
    NO = "NO",
    YES = "YES",
}

export enum Q3Answer {
    NOT_UP_TO_DATE = "NOT_UP_TO_DATE",
    PARTIALLY_UP_TO_DATE = "PARTIALLY_UP_TO_DATE",
    MOSTLY_UP_TO_DATE = "MOSTLY_UP_TO_DATE",
    FULLY_UP_TO_DATE = "FULLY_UP_TO_DATE",
}

export enum Q4Answer {
    SCATTERED = "SCATTERED",
    PARTIALLY_ORGANIZED = "PARTIALLY_ORGANIZED",
    WELL_ORGANIZED = "WELL_ORGANIZED",
}

export enum Q5Answer {
    NONE = "NONE",
    INFORMAL_TRACKING = "INFORMAL_TRACKING",
    SIMPLE_SOFTWARE = "SIMPLE_SOFTWARE",
    DEDICATED_ACCOUNTANT = "DEDICATED_ACCOUNTANT",
}

export enum Q6Answer {
    RARELY_OR_NEVER = "RARELY_OR_NEVER",
    IRREGULARLY = "IRREGULARLY",
    SYSTEMATICALLY = "SYSTEMATICALLY",
}

export enum Q7Answer {
    NEVER_PRODUCED = "NEVER_PRODUCED",
    OVER_ONE_YEAR_OLD = "OVER_ONE_YEAR_OLD",
    UNDER_ONE_YEAR_OLD = "UNDER_ONE_YEAR_OLD",
}

export enum Q8Answer {
    NEVER = "NEVER",
    INFORMAL = "INFORMAL",
    FORMAL = "FORMAL",
}

export enum Q9Answer {
    UNCLEAR = "UNCLEAR",
    APPROXIMATE = "APPROXIMATE",
    PRECISE = "PRECISE",
}

export enum Q10Answer {
    NOT_IDENTIFIED = "NOT_IDENTIFIED",
    IDENTIFIED_NOT_DOCUMENTED = "IDENTIFIED_NOT_DOCUMENTED",
    IDENTIFIED_AND_DOCUMENTED = "IDENTIFIED_AND_DOCUMENTED",
}