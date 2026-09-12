import { ApiProperty } from '@nestjs/swagger';
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
 *
 * Les 10 champs sont obligatoires et doivent correspondre exactement à un code
 * d'option retourné par GET /questions pour la question correspondante (voir le
 * champ `options[].code` de chaque question). Toute valeur hors énumération, tout
 * champ manquant, ou toute propriété additionnelle non prévue ici est rejeté avec
 * un statut 400 (voir HttpErrorDto) - aucune réponse invalide n'est jamais silencieusement
 * ignorée ou corrigée côté serveur.
 */
export class SubmitDiagnosticDto {
  @ApiProperty({
    enum: Q1Answer,
    example: Q1Answer.REGISTERED,
    description:
      '[Formalisation] Votre entreprise est-elle officiellement enregistrée ? ' +
      'Détermine en partie le score de Formalisation, qui conditionne le plafond ' +
      'appliqué aux dimensions Comptabilité et Financement (voir cascadeTriggered dans la réponse).',
  })
  @IsEnum(Q1Answer)
  q1: Q1Answer;

  @ApiProperty({
    enum: Q2Answer,
    example: Q2Answer.YES,
    description:
      '[Formalisation] Séparez-vous les finances personnelles et professionnelles ?',
  })
  @IsEnum(Q2Answer)
  q2: Q2Answer;

  @ApiProperty({
    enum: Q3Answer,
    example: Q3Answer.MOSTLY_UP_TO_DATE,
    description:
      '[Formalisation] Vos obligations administratives et déclaratives sont-elles à jour ?',
  })
  @IsEnum(Q3Answer)
  q3: Q3Answer;

  @ApiProperty({
    enum: Q4Answer,
    example: Q4Answer.PARTIALLY_ORGANIZED,
    description:
      '[Formalisation] Vos documents administratifs sont-ils organisés et facilement accessibles ?',
  })
  @IsEnum(Q4Answer)
  q4: Q4Answer;

  @ApiProperty({
    enum: Q5Answer,
    example: Q5Answer.SIMPLE_SOFTWARE,
    description:
      '[Comptabilité] Quelle méthode utilisez-vous pour suivre votre comptabilité ? ' +
      'Contribue au score brut de Comptabilité, potentiellement plafonné dans la réponse ' +
      '(voir scores.accounting.raw vs scores.accounting.final).',
  })
  @IsEnum(Q5Answer)
  q5: Q5Answer;

  @ApiProperty({
    enum: Q6Answer,
    example: Q6Answer.SYSTEMATICALLY,
    description:
      '[Comptabilité] Conservez-vous régulièrement vos factures, reçus et autres pièces justificatives ?',
  })
  @IsEnum(Q6Answer)
  q6: Q6Answer;

  @ApiProperty({
    enum: Q7Answer,
    example: Q7Answer.UNDER_ONE_YEAR_OLD,
    description: "[Comptabilité] Disposez-vous d'états financiers récents ?",
  })
  @IsEnum(Q7Answer)
  q7: Q7Answer;

  @ApiProperty({
    enum: Q8Answer,
    example: Q8Answer.INFORMAL,
    description:
      '[Préparation au financement] Votre entreprise a-t-elle déjà obtenu un financement externe ? ' +
      'Contribue au score brut de Financement, potentiellement plafonné dans la réponse ' +
      '(voir scores.funding.raw vs scores.funding.final).',
  })
  @IsEnum(Q8Answer)
  q8: Q8Answer;

  @ApiProperty({
    enum: Q9Answer,
    example: Q9Answer.APPROXIMATE,
    description:
      "[Préparation au financement] Connaissez-vous précisément le niveau d'endettement actuel de votre entreprise ?",
  })
  @IsEnum(Q9Answer)
  q9: Q9Answer;

  @ApiProperty({
    enum: Q10Answer,
    example: Q10Answer.IDENTIFIED_NOT_DOCUMENTED,
    description:
      '[Préparation au financement] Votre besoin de financement est-il identifié et documenté ?',
  })
  @IsEnum(Q10Answer)
  q10: Q10Answer;
}
