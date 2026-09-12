import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Answers, ScoringResult } from './domain/scoring.engine.js';
import {
  computeRecommendation,
  RecommendationResult,
} from './domain/recommendation.engine.js';
import { DiagnosticResultDto } from './dto/diagnostic-result.dto.js';
import { QUESTIONS_CATALOG } from './domain/questions.catalog.js';

@Injectable()
export class DiagnosticRepository {
  private readonly prisma = new PrismaClient();

  async save(
    answers: Answers,
    scoring: ScoringResult,
    recommendation: RecommendationResult,
  ): Promise<DiagnosticResultDto> {
    const answerRows = Object.entries(answers).map(
      ([questionCode, answerCode]) => {
        const question = QUESTIONS_CATALOG.find((q) => q.code === questionCode);
        const option = question?.options.find((o) => o.code === answerCode);
        return {
          questionCode,
          answerCode,
          scoreValue: option?.scoreValue ?? 0,
        };
      },
    );

    const submission = await this.prisma.diagnosticSubmission.create({
      data: {
        formalizationScore: scoring.formalizationScore,
        accountingRawScore: scoring.accountingRawScore,
        accountingFinalScore: scoring.accountingFinalScore,
        fundingRawScore: scoring.fundingRawScore,
        fundingFinalScore: scoring.fundingFinalScore,
        globalScore: scoring.globalScore,
        maturityLevel: scoring.maturityLevel,
        strongestDimension: scoring.strongestDimension,
        improvementFocus: scoring.improvementFocus,
        cascadeTriggered: scoring.cascadeTriggered,
        answers: {
          create: answerRows,
        },
      },
    });

    return this.toDto(submission.id, scoring, recommendation);
  }

  async findById(id: string): Promise<DiagnosticResultDto | null> {
    const submission = await this.prisma.diagnosticSubmission.findUnique({
      where: { id },
    });

    if (!submission) return null;

    // Reconstituer le scoring depuis les colonnes persistées
    const scoring: ScoringResult = {
      formalizationScore: submission.formalizationScore,
      accountingRawScore: submission.accountingRawScore,
      accountingFinalScore: submission.accountingFinalScore,
      fundingRawScore: submission.fundingRawScore,
      fundingFinalScore: submission.fundingFinalScore,
      globalScore: submission.globalScore,
      maturityLevel: submission.maturityLevel as ScoringResult['maturityLevel'],
      strongestDimension:
        submission.strongestDimension as ScoringResult['strongestDimension'],
      improvementFocus:
        submission.improvementFocus as ScoringResult['improvementFocus'],
      cascadeTriggered: submission.cascadeTriggered,
    };

    // Restituer les textes depuis le moteur de recommandation (déterministe)
    const recommendation = computeRecommendation(scoring);

    return this.toDto(submission.id, scoring, recommendation);
  }

  private toDto(
    id: string,
    scoring: ScoringResult,
    recommendation: RecommendationResult,
  ): DiagnosticResultDto {
    return {
      id,
      globalScore: scoring.globalScore,
      maturityLevel: scoring.maturityLevel,
      maturityLabel: recommendation.maturityLabel,
      maturityDescription: recommendation.maturityDescription,
      scores: {
        formalization: scoring.formalizationScore,
        accounting: {
          raw: scoring.accountingRawScore,
          final: scoring.accountingFinalScore,
        },
        funding: {
          raw: scoring.fundingRawScore,
          final: scoring.fundingFinalScore,
        },
      },
      strongestDimension: scoring.strongestDimension,
      improvementFocus: scoring.improvementFocus,
      cascadeTriggered: scoring.cascadeTriggered,
      mainRecommendation: recommendation.mainRecommendation,
      secondaryRecommendations: recommendation.secondaryRecommendations,
    };
  }
}
