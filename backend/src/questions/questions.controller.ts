import { Controller, Get } from '@nestjs/common';
import {
  QuestionDefinition,
  QUESTIONS_CATALOG,
} from '../diagnostic/domain/questions.catalog.js';

@Controller('questions')
export class QuestionsController {
  @Get()
  findAll(): QuestionDefinition[] {
    return QUESTIONS_CATALOG;
  }
}
