import { IsEnum } from 'class-validator';
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

/**
 * Payload d'entrée pour la soumission d'un diagnostic.
 * Valide strictement que chaque question Q1 à Q10 reçoit une réponse valide issue de son énumération dédiée.
 */
export class SubmitDiagnosticDto {
  @IsEnum(Q1Answer)
  q1: Q1Answer;

  @IsEnum(Q2Answer)
  q2: Q2Answer;

  @IsEnum(Q3Answer)
  q3: Q3Answer;

  @IsEnum(Q4Answer)
  q4: Q4Answer;

  @IsEnum(Q5Answer)
  q5: Q5Answer;

  @IsEnum(Q6Answer)
  q6: Q6Answer;

  @IsEnum(Q7Answer)
  q7: Q7Answer;

  @IsEnum(Q8Answer)
  q8: Q8Answer;

  @IsEnum(Q9Answer)
  q9: Q9Answer;

  @IsEnum(Q10Answer)
  q10: Q10Answer;
}
