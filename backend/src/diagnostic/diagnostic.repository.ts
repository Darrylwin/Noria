import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Answers, ScoringResult } from './domain/scoring.engine.js';
import {
  computeRecommendation,
  RecommendationResult,
} from './domain/recommendation.engine.js';
import { DiagnosticResponseDto } from './dto/diagnostic-response.dto.js';
import { QUESTIONS_CATALOG } from './domain/questions.catalog.js';

/**
 * Couche de persistance responsable de l'accès aux données Prisma pour les diagnostics.
 */
@Injectable()
export class DiagnosticRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Enregistre une soumission de diagnostic et ses réponses détaillées.
   */
  async save(
    answers: Answers,
    scoring: ScoringResult,
    recommendation: RecommendationResult,
  ): Promise<DiagnosticResponseDto> {
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

  /**
   * Recherche un diagnostic par ID et reconstitue le DTO complet avec recommandations.
   */
  async findById(id: string): Promise<DiagnosticResponseDto | null> {
    const submission = await this.prisma.diagnosticSubmission.findUnique({
      where: { id },
    });

    if (!submission) return null;

    // Reconstitution du ScoringResult à partir des valeurs persistées en BDD
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

    // Calcul déterministe des textes de recommandation
    const recommendation = computeRecommendation(scoring);

    return this.toDto(submission.id, scoring, recommendation);
  }

  /**
   * Mappe les objets du domaine et la clé primaire vers le DTO de réponse client.
   */
  private toDto(
    id: string,
    scoring: ScoringResult,
    recommendation: RecommendationResult,
  ): DiagnosticResponseDto {
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
