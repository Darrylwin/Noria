import { Injectable } from '@nestjs/common';
import { Answers, computeScore } from './domain/scoring.engine.js';
import { computeRecommendation } from './domain/recommendation.engine.js';
import { DiagnosticRepository } from './diagnostic.repository.js';
import { SubmitDiagnosticDto } from './dto/submit-diagnostic.dto.js';
import { DiagnosticResultDto } from './dto/diagnostic-result.dto.js';

@Injectable()
export class DiagnosticService {
  constructor(private readonly repository: DiagnosticRepository) {}

  async submit(dto: SubmitDiagnosticDto): Promise<DiagnosticResultDto> {
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

  async findById(id: string): Promise<DiagnosticResultDto | null> {
    return this.repository.findById(id);
  }
}
