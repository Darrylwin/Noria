import { ApiProperty } from '@nestjs/swagger';
import { Dimension } from '../../diagnostic/enums/dimension.enum.js';

export class QuestionOptionDto {
  @ApiProperty({ example: 'REGISTERED' })
  code: string;

  @ApiProperty({ example: 'Officiellement enregistrée' })
  label: string;

  @ApiProperty({ example: 100 })
  scoreValue: number;
}

export class QuestionDefinitionDto {
  @ApiProperty({ example: 'Q1' })
  code: string;

  @ApiProperty({ enum: Dimension, example: Dimension.FORMALIZATION })
  dimension: Dimension;

  @ApiProperty({ example: 1 })
  order: number;

  @ApiProperty({
    example: 'Votre entreprise est-elle officiellement enregistrée ?',
  })
  label: string;

  @ApiProperty({ type: [QuestionOptionDto] })
  options: QuestionOptionDto[];
}
