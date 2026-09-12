import { Controller, Get } from '@nestjs/common';
import {
  QuestionDefinition,
  QUESTIONS_CATALOG,
} from '../diagnostic/domain/questions.catalog.js';

/**
 * Contrôleur exposant le catalogue des questions du diagnostic NORIA.
 */
@Controller('questions')
export class QuestionsController {
  /**
   * GET /questions
   * Retourne la liste complète des 10 questions et leurs options de réponse.
   * Sert de source de vérité unique pour l'affichage du questionnaire côté frontend.
   */
  @Get()
  findAll(): QuestionDefinition[] {
    return QUESTIONS_CATALOG;
  }
}
