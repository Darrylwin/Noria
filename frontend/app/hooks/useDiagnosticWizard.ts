"use client";

import {useCallback, useEffect, useMemo, useState} from "react";
import {diagnosticStorage} from "@/app/lib/storage/diagnosticStorage";
import {
    AnswerCode,
    DiagnosticSubmitPayload,
    QuestionCode,
    QuestionDefinition,
    SubmissionStatus,
} from "@/app/lib/types/diagnostic";
import {fetchQuestionsCatalog, submitDiagnostic} from "@/app/lib/api/diagnosticApi";
import {ApiError} from "next/dist/server/api-utils";

const QUESTION_CODES: QuestionCode[] = [
    "Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8", "Q9", "Q10",
];

type WizardMode = "new" | "resume";

interface UseDiagnosticWizardResult {
    questions: QuestionDefinition[];
    isLoadingQuestions: boolean;
    loadError: string | null;
    currentIndex: number;
    currentQuestion: QuestionDefinition | null;
    answers: Partial<Record<QuestionCode, AnswerCode>>;
    answerCurrent: (code: AnswerCode) => void;
    goNext: () => Promise<void>;
    goPrevious: () => void;
    canGoPrevious: boolean;
    isLastQuestion: boolean;
    submissionStatus: SubmissionStatus;
    submissionError: string | null;
    retrySubmit: () => Promise<void>;
    resultId: string | null;
}

/**
 * Orchestre l'état complet du parcours questionnaire : chargement du catalogue,
 * navigation entre les 10 questions, sauvegarde automatique dans le cache
 * navigateur (section 15.2 de la spec) et soumission finale. Aucune règle
 * métier de scoring n'est évaluée ici, uniquement navigation et persistance locale.
 */
export function useDiagnosticWizard(mode: WizardMode): UseDiagnosticWizardResult {
    const [questions, setQuestions] = useState<QuestionDefinition[]>([]);
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [answers, setAnswers] = useState<Partial<Record<QuestionCode, AnswerCode>>>({});
    const [currentIndex, setCurrentIndex] = useState(0);

    const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>("idle");
    const [submissionError, setSubmissionError] = useState<string | null>(null);
    const [resultId, setResultId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const catalog = await fetchQuestionsCatalog();
                if (cancelled) return;

                const sorted = [...catalog].sort((a, b) => a.order - b.order);
                setQuestions(sorted);

                if (mode === "resume") {
                    const cached = diagnosticStorage.load();
                    if (cached) {
                        setAnswers(cached.answers);
                        setCurrentIndex(Math.min(cached.currentQuestionIndex, sorted.length - 1));
                    }
                } else {
                    diagnosticStorage.clear();
                }
            } catch {
                if (!cancelled) {
                    setLoadError(
                        "Impossible de charger le questionnaire. Vérifiez votre connexion et réessayez.",
                    );
                }
            } finally {
                if (!cancelled) setIsLoadingQuestions(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
        // "mode" est figé pour la durée de vie de la page (dépend du paramètre d'URL initial).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const currentQuestion = questions[currentIndex] ?? null;
    const isLastQuestion = currentIndex === questions.length - 1;
    const canGoPrevious = currentIndex > 0;

    const persist = useCallback(
        (nextAnswers: Partial<Record<QuestionCode, AnswerCode>>, nextIndex: number) => {
            diagnosticStorage.save({
                answers: nextAnswers,
                currentQuestionIndex: nextIndex,
                savedAt: new Date().toISOString(),
            });
        },
        [],
    );

    const answerCurrent = useCallback(
        (code: AnswerCode) => {
            if (!currentQuestion) return;
            setAnswers((prev) => {
                const next = {...prev, [currentQuestion.code]: code};
                persist(next, currentIndex);
                return next;
            });
        },
        [currentQuestion, currentIndex, persist],
    );

    const buildPayload = useCallback((): DiagnosticSubmitPayload | null => {
        const isComplete = QUESTION_CODES.every((code) => Boolean(answers[code]));
        if (!isComplete) return null;

        return {
            q1: answers.Q1!, q2: answers.Q2!, q3: answers.Q3!, q4: answers.Q4!, q5: answers.Q5!,
            q6: answers.Q6!, q7: answers.Q7!, q8: answers.Q8!, q9: answers.Q9!, q10: answers.Q10!,
        };
    }, [answers]);

    const submit = useCallback(async () => {
        const payload = buildPayload();
        if (!payload) return;

        setSubmissionStatus("submitting");
        setSubmissionError(null);

        try {
            const result = await submitDiagnostic(payload);
            diagnosticStorage.clear();
            setResultId(result.id);
            setSubmissionStatus("success");
        } catch (error) {
            const message =
                error instanceof ApiError ? error.message : "Une erreur est survenue, veuillez réessayer.";
            setSubmissionError(message);
            setSubmissionStatus("error");
        }
    }, [buildPayload]);

    const goNext = useCallback(async () => {
        if (isLastQuestion) {
            await submit();
            return;
        }
        setCurrentIndex((prev) => {
            const next = Math.min(prev + 1, questions.length - 1);
            persist(answers, next);
            return next;
        });
    }, [isLastQuestion, submit, questions.length, answers, persist]);

    const goPrevious = useCallback(() => {
        setCurrentIndex((prev) => {
            const next = Math.max(prev - 1, 0);
            persist(answers, next);
            return next;
        });
    }, [answers, persist]);

    const retrySubmit = useCallback(async () => {
        await submit();
    }, [submit]);

    return useMemo(
        () => ({
            questions, isLoadingQuestions, loadError, currentIndex, currentQuestion, answers,
            answerCurrent, goNext, goPrevious, canGoPrevious, isLastQuestion, submissionStatus,
            submissionError, retrySubmit, resultId,
        }),
        [
            questions, isLoadingQuestions, loadError, currentIndex, currentQuestion, answers,
            answerCurrent, goNext, goPrevious, canGoPrevious, isLastQuestion, submissionStatus,
            submissionError, retrySubmit, resultId,
        ],
    );
}