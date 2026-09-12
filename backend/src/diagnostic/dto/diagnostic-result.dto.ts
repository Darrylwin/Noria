import { Dimension } from '../enums/dimension.enum.js';
import { MaturityLevel } from '../domain/scoring.engine.js';

export class DiagnosticResultDto {
  id: string;
  globalScore: number;
  maturityLevel: MaturityLevel;
  maturityLabel: string;
  maturityDescription: string;
  scores: {
    formalization: number;
    accounting: { raw: number; final: number };
    funding: { raw: number; final: number };
  };
  strongestDimension: Dimension;
  improvementFocus: Dimension;
  cascadeTriggered: boolean;
  mainRecommendation: string;
  secondaryRecommendations: string[];
}
