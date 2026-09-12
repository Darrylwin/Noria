import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { QUESTIONS_CATALOG } from '../diagnostic/domain/questions.catalog.js';
import { QuestionDefinitionDto } from './dto/question-definition.dto.js';

/**
 * Contrôleur exposant le catalogue des questions du diagnostic NORIA.
 */
@ApiTags('questions')
@Controller('questions')
export class QuestionsController {
  /**
   * GET /questions
   * Retourne la liste complète des 10 questions et leurs options de réponse.
   * Sert de source de vérité unique pour l'affichage du questionnaire côté frontend.
   */
  @Get()
  @ApiOperation({
    summary:
      "Retourne le catalogue complet des 10 questions, dans leur ordre d'affichage",
  })
  @ApiResponse({
    status: 200,
    description: 'Catalogue des questions.',
    type: [QuestionDefinitionDto],
  })
  findAll(): QuestionDefinitionDto[] {
    return QUESTIONS_CATALOG;
  }
}
