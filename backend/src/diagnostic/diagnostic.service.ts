import { Injectable } from '@nestjs/common';
import { Answers, computeScore } from './domain/scoring.engine.js';
import { computeRecommendation } from './domain/recommendation.engine.js';
import { DiagnosticRepository } from './diagnostic.repository.js';
import { SubmitDiagnosticDto } from './dto/submit-diagnostic.dto.js';
import { DiagnosticResponseDto } from './dto/diagnostic-response.dto.js';

/**
 * Service applicatif orchestrant le workflow du diagnostic NORIA.
 * Découple les endpoints HTTP de la logique métier et de la persistance.
 */
@Injectable()
export class DiagnosticService {
  constructor(private readonly repository: DiagnosticRepository) {}

  /**
   * Traite la soumission d'un diagnostic :
   * 1. Mappe le DTO vers le type Answers du domaine.
   * 2. Calcule les scores (moteur pure).
   * 3. Génère les recommandations (moteur pure).
   * 4. Persiste en BDD et retourne le résultat complet.
   */
  async submit(dto: SubmitDiagnosticDto): Promise<DiagnosticResponseDto> {
    const answers: Answers = {
      Q1: dto.q1,
      Q2: dto.q2,
      Q3: dto.q3,
      Q4: dto.q4,
      Q5: dto.q5,
      Q6: dto.q6,
      Q7: dto.q7,
      Q8: dto.q8,
      Q9: dto.q9,
      Q10: dto.q10,
    };

    const scoring = computeScore(answers);
    const recommendation = computeRecommendation(scoring);

    return this.repository.save(answers, scoring, recommendation);
  }

  /**
   * Récupère un diagnostic existant par son identifiant unique.
   */
  async findById(id: string): Promise<DiagnosticResponseDto | null> {
    return this.repository.findById(id);
  }
}
