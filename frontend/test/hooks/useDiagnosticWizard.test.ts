import {beforeEach, describe, expect, it, vi} from "vitest";
import {act, renderHook, waitFor} from "@testing-library/react";
import {useDiagnosticWizard} from "@/app/hooks/useDiagnosticWizard";
import * as diagnosticApi from "@/app/lib/api/diagnosticApi";
import {diagnosticStorage} from "@/app/lib/storage/diagnosticStorage";
import {QuestionCode, QuestionDefinition} from "@/app/lib/types/diagnostic";
import {Dimension} from "@/app/lib/enums/dimension";

vi.mock("@/app/lib/api/diagnosticApi", async () => {
    const actual = await vi.importActual<typeof import("@/app/lib/api/diagnosticApi")>(
        "@/app/lib/api/diagnosticApi",
    );
    return {
        ...actual,
        fetchQuestionsCatalog: vi.fn(),
        submitDiagnostic: vi.fn(),
    };
});

function makeQuestions(count: number): QuestionDefinition[] {
    return Array.from({length: count}, (_, index) => ({
        code: `Q${index + 1}` as QuestionCode,
        dimension: Dimension.FORMALIZATION,
        order: index + 1,
        label: `Question ${index + 1}`,
        options: [
            {code: "A", label: "Option A", scoreValue: 0},
            {code: "B", label: "Option B", scoreValue: 100},
        ],
    }));
}

async function answerAllAndAdvance(
    result: { current: ReturnType<typeof useDiagnosticWizard> },
    count: number,
) {
    for (let i = 0; i < count; i += 1) {
        act(() => result.current.answerCurrent("B"));
        // eslint-disable-next-line no-await-in-loop
        await act(async () => {
            await result.current.goNext();
        });
    }
}

describe("useDiagnosticWizard", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        window.localStorage.clear();
        vi.mocked(diagnosticApi.fetchQuestionsCatalog).mockResolvedValue(makeQuestions(10));
    });

    it("charge le catalogue et démarre à la première question en mode 'new'", async () => {
        const {result} = renderHook(() => useDiagnosticWizard("new"));

        await waitFor(() => expect(result.current.isLoadingQuestions).toBe(false));

        expect(result.current.questions).toHaveLength(10);
        expect(result.current.currentIndex).toBe(0);
        expect(result.current.canGoPrevious).toBe(false);
    });

    it("efface le cache existant lorsqu'on démarre un nouveau diagnostic", async () => {
        diagnosticStorage.save({
            answers: {Q1: "A"},
            currentQuestionIndex: 3,
            savedAt: new Date().toISOString(),
        });

        const {result} = renderHook(() => useDiagnosticWizard("new"));
        await waitFor(() => expect(result.current.isLoadingQuestions).toBe(false));

        expect(diagnosticStorage.load()).toBeNull();
        expect(result.current.currentIndex).toBe(0);
    });

    it("reprend la progression sauvegardée en mode 'resume'", async () => {
        diagnosticStorage.save({
            answers: {Q1: "A", Q2: "B"},
            currentQuestionIndex: 2,
            savedAt: new Date().toISOString(),
        });

        const {result} = renderHook(() => useDiagnosticWizard("resume"));
        await waitFor(() => expect(result.current.isLoadingQuestions).toBe(false));

        expect(result.current.currentIndex).toBe(2);
        expect(result.current.answers.Q1).toBe("A");
        expect(result.current.answers.Q2).toBe("B");
    });

    it("affiche une erreur de chargement si le catalogue ne peut pas être récupéré", async () => {
        vi.mocked(diagnosticApi.fetchQuestionsCatalog).mockRejectedValue(new Error("network"));

        const {result} = renderHook(() => useDiagnosticWizard("new"));
        await waitFor(() => expect(result.current.isLoadingQuestions).toBe(false));

        expect(result.current.loadError).toMatch(/Impossible de charger le questionnaire/);
    });

    it("enregistre la réponse sélectionnée et la persiste dans le cache", async () => {
        const {result} = renderHook(() => useDiagnosticWizard("new"));
        await waitFor(() => expect(result.current.isLoadingQuestions).toBe(false));

        act(() => result.current.answerCurrent("B"));

        expect(result.current.answers.Q1).toBe("B");
        expect(diagnosticStorage.load()?.answers.Q1).toBe("B");
    });

    it("remplace une réponse déjà donnée par une nouvelle sélection, sans confirmation", async () => {
        const {result} = renderHook(() => useDiagnosticWizard("new"));
        await waitFor(() => expect(result.current.isLoadingQuestions).toBe(false));

        act(() => result.current.answerCurrent("A"));
        expect(result.current.answers.Q1).toBe("A");

        act(() => result.current.answerCurrent("B"));
        expect(result.current.answers.Q1).toBe("B");
    });

    it("le bouton précédent ne supprime jamais une réponse déjà donnée", async () => {
        const {result} = renderHook(() => useDiagnosticWizard("new"));
        await waitFor(() => expect(result.current.isLoadingQuestions).toBe(false));

        act(() => result.current.answerCurrent("A"));
        await act(async () => {
            await result.current.goNext();
        });
        expect(result.current.currentIndex).toBe(1);

        act(() => result.current.goPrevious());
        expect(result.current.currentIndex).toBe(0);
        expect(result.current.answers.Q1).toBe("A");
    });

    it("ne soumet rien tant que les 10 réponses ne sont pas complètes", async () => {
        const {result} = renderHook(() => useDiagnosticWizard("new"));
        await waitFor(() => expect(result.current.isLoadingQuestions).toBe(false));

        // Répond à Q1..Q9 seulement, atteint la dernière question sans y répondre.
        await answerAllAndAdvance(result, 9);

        await act(async () => {
            await result.current.goNext();
        });

        expect(diagnosticApi.submitDiagnostic).not.toHaveBeenCalled();
        expect(result.current.submissionStatus).toBe("idle");
    });

    it("passe en 'submitting' puis 'success' une fois les 10 réponses complètes", async () => {
        vi.mocked(diagnosticApi.submitDiagnostic).mockResolvedValue({
            id: "resultat-123",
        } as never);

        const {result} = renderHook(() => useDiagnosticWizard("new"));
        await waitFor(() => expect(result.current.isLoadingQuestions).toBe(false));

        await answerAllAndAdvance(result, 10);

        await waitFor(() => expect(result.current.submissionStatus).toBe("success"));
        expect(result.current.resultId).toBe("resultat-123");
    });

    it("supprime le cache navigateur après une soumission réussie", async () => {
        vi.mocked(diagnosticApi.submitDiagnostic).mockResolvedValue({id: "resultat-123"} as never);

        const {result} = renderHook(() => useDiagnosticWizard("new"));
        await waitFor(() => expect(result.current.isLoadingQuestions).toBe(false));

        await answerAllAndAdvance(result, 10);

        await waitFor(() => expect(result.current.submissionStatus).toBe("success"));
        expect(diagnosticStorage.load()).toBeNull();
    });

    it(
        "passe en état 'error' avec le message de l'API en cas d'échec de soumission, sans perdre les réponses",
        async () => {
            // Message volontairement distinct du message générique de repli, pour vérifier
            // que le message réellement renvoyé par l'API est bien propagé à l'écran.
            vi.mocked(diagnosticApi.submitDiagnostic).mockRejectedValue(
                new diagnosticApi.ApiError(
                    "Trop de tentatives depuis cette adresse. Merci de patienter quelques instants.",
                    429,
                ),
            );

            const {result} = renderHook(() => useDiagnosticWizard("new"));
            await waitFor(() => expect(result.current.isLoadingQuestions).toBe(false));

            await answerAllAndAdvance(result, 10);

            await waitFor(() => expect(result.current.submissionStatus).toBe("error"));
            expect(result.current.submissionError).toBe(
                "Trop de tentatives depuis cette adresse. Merci de patienter quelques instants.",
            );
            expect(result.current.answers.Q10).toBe("B");
        },
    );

    it("retrySubmit relance la soumission sans perdre les réponses déjà saisies", async () => {
        vi.mocked(diagnosticApi.submitDiagnostic)
            .mockRejectedValueOnce(new diagnosticApi.ApiError("Une erreur est survenue, veuillez réessayer."))
            .mockResolvedValueOnce({id: "resultat-456"} as never);

        const {result} = renderHook(() => useDiagnosticWizard("new"));
        await waitFor(() => expect(result.current.isLoadingQuestions).toBe(false));

        await answerAllAndAdvance(result, 10);
        await waitFor(() => expect(result.current.submissionStatus).toBe("error"));

        await act(async () => {
            await result.current.retrySubmit();
        });

        await waitFor(() => expect(result.current.submissionStatus).toBe("success"));
        expect(result.current.resultId).toBe("resultat-456");
    });
});