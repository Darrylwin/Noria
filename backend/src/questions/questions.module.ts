import { Module } from '@nestjs/common';
import { QuestionsController } from './questions.controller.js';

/**
 * Module d'exposition du catalogue statique de questions.
 */
@Module({
  controllers: [QuestionsController],
})
export class QuestionsModule {}
