import {Dimension, MaturityLevel} from "../enums/dimension";

export type QuestionCode =
    | "Q1" | "Q2" | "Q3" | "Q4" | "Q5" | "Q6" | "Q7" | "Q8" | "Q9" | "Q10";

export type AnswerCode = string;

export interface QuestionOption {
    code: AnswerCode;
    label: string;
    scoreValue: number;
}

export interface QuestionDefinition {
    code: QuestionCode;
    dimension: Dimension;
    order: number;
    label: string;
    options: QuestionOption[];
}

export interface DiagnosticSubmitPayload {
    q1: AnswerCode;
    q2: AnswerCode;
    q3: AnswerCode;
    q4: AnswerCode;
    q5: AnswerCode;
    q6: AnswerCode;
    q7: AnswerCode;
    q8: AnswerCode;
    q9: AnswerCode;
    q10: AnswerCode;
}

export interface DimensionFinalRaw {
    raw: number;
    final: number;
}

export interface DiagnosticResult {
    id: string;
    globalScore: number;
    maturityLevel: MaturityLevel;
    maturityLabel: string;
    maturityDescription: string;
    scores: {
        formalization: number;
        accounting: DimensionFinalRaw;
        funding: DimensionFinalRaw;
    };
    strongestDimension: Dimension;
    improvementFocus: Dimension;
    cascadeTriggered: boolean;
    mainRecommendation: string;
    secondaryRecommendations: string[];
}

export interface DiagnosticProgressCache {
    answers: Partial<Record<QuestionCode, AnswerCode>>;
    currentQuestionIndex: number;
    savedAt: string;
}

export type SubmissionStatus = "idle" | "submitting" | "success" | "error";