// Q1 - Enregistrement légal
export enum Q1Answer {
  NOT_REGISTERED = 'NOT_REGISTERED',
  REGISTRATION_IN_PROGRESS = 'REGISTRATION_IN_PROGRESS',
  REGISTERED = 'REGISTERED',
}

// Q2 - Séparation finances
export enum Q2Answer {
  NO = 'NO',
  YES = 'YES',
}

// Q3 - Obligations administratives
export enum Q3Answer {
  NOT_UP_TO_DATE = 'NOT_UP_TO_DATE',
  PARTIALLY_UP_TO_DATE = 'PARTIALLY_UP_TO_DATE',
  MOSTLY_UP_TO_DATE = 'MOSTLY_UP_TO_DATE',
  FULLY_UP_TO_DATE = 'FULLY_UP_TO_DATE',
}

// Q4 - Documents administratifs
export enum Q4Answer {
  SCATTERED = 'SCATTERED',
  PARTIALLY_ORGANIZED = 'PARTIALLY_ORGANIZED',
  WELL_ORGANIZED = 'WELL_ORGANIZED',
}

// Q5 - Méthode comptable
export enum Q5Answer {
  NONE = 'NONE',
  INFORMAL_TRACKING = 'INFORMAL_TRACKING',
  SIMPLE_SOFTWARE = 'SIMPLE_SOFTWARE',
  DEDICATED_ACCOUNTANT = 'DEDICATED_ACCOUNTANT',
}

// Q6 - Conservation des justificatifs
export enum Q6Answer {
  RARELY_OR_NEVER = 'RARELY_OR_NEVER',
  IRREGULARLY = 'IRREGULARLY',
  SYSTEMATICALLY = 'SYSTEMATICALLY',
}

// Q7 - États financiers récents
export enum Q7Answer {
  NEVER_PRODUCED = 'NEVER_PRODUCED',
  OVER_ONE_YEAR_OLD = 'OVER_ONE_YEAR_OLD',
  UNDER_ONE_YEAR_OLD = 'UNDER_ONE_YEAR_OLD',
}

// Q8 - Financement externe
export enum Q8Answer {
  NEVER = 'NEVER',
  INFORMAL = 'INFORMAL',
  FORMAL = 'FORMAL',
}

// Q9 - Niveau d'endettement
export enum Q9Answer {
  UNCLEAR = 'UNCLEAR',
  APPROXIMATE = 'APPROXIMATE',
  PRECISE = 'PRECISE',
}

// Q10 - Besoin de financement
export enum Q10Answer {
  NOT_IDENTIFIED = 'NOT_IDENTIFIED',
  IDENTIFIED_NOT_DOCUMENTED = 'IDENTIFIED_NOT_DOCUMENTED',
  IDENTIFIED_AND_DOCUMENTED = 'IDENTIFIED_AND_DOCUMENTED',
}
