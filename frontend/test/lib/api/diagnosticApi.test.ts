import {afterEach, describe, expect, it, vi} from "vitest";
import {ApiError, fetchDiagnosticById, fetchQuestionsCatalog, submitDiagnostic,} from "@/app/lib/api/diagnosticApi";
import {DiagnosticSubmitPayload} from "@/app/lib/types/diagnostic";

const PAYLOAD: DiagnosticSubmitPayload = {
    q1: "REGISTERED", q2: "YES", q3: "FULLY_UP_TO_DATE", q4: "WELL_ORGANIZED",
    q5: "DEDICATED_ACCOUNTANT", q6: "SYSTEMATICALLY", q7: "UNDER_ONE_YEAR_OLD",
    q8: "FORMAL", q9: "PRECISE", q10: "IDENTIFIED_AND_DOCUMENTED",
};

function mockFetchOnce(response: Record<string, unknown>) {
    global.fetch = vi.fn().mockResolvedValue(response as unknown as Response);
}

describe("diagnosticApi", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("renvoie le catalogue de questions en cas de succès", async () => {
        const catalog = [{code: "Q1"}];
        mockFetchOnce({ok: true, text: async () => JSON.stringify(catalog)});

        const result = await fetchQuestionsCatalog();
        expect(result).toEqual(catalog);
    });

    it("soumet le diagnostic et renvoie le résultat", async () => {
        const apiResult = {id: "abc-123"};
        mockFetchOnce({ok: true, text: async () => JSON.stringify(apiResult)});

        const result = await submitDiagnostic(PAYLOAD);
        expect(result).toEqual(apiResult);
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("/diagnostics"),
            expect.objectContaining({method: "POST"}),
        );
    });

    it("lève une ApiError générique si le serveur est injoignable", async () => {
        global.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

        await expect(fetchQuestionsCatalog()).rejects.toBeInstanceOf(ApiError);
        await expect(fetchQuestionsCatalog()).rejects.toMatchObject({
            message: "Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.",
        });
    });

    it("traduit une erreur 404 en message dédié", async () => {
        mockFetchOnce({
            ok: false,
            status: 404,
            json: async () => ({statusCode: 404, message: "Not Found", error: "Not Found"}),
        });

        await expect(fetchDiagnosticById("id-inconnu")).rejects.toMatchObject({
            status: 404,
            message: "Ce diagnostic est introuvable.",
        });
    });

    it("traduit une erreur 429 en message d'attente", async () => {
        mockFetchOnce({
            ok: false,
            status: 429,
            json: async () => ({statusCode: 429, message: "Too Many Requests", error: "Too Many Requests"}),
        });

        await expect(submitDiagnostic(PAYLOAD)).rejects.toMatchObject({
            message: "Trop de tentatives depuis cette adresse. Merci de patienter quelques instants.",
        });
    });

    it("traduit une erreur 500 en message générique", async () => {
        mockFetchOnce({
            ok: false,
            status: 500,
            json: async () => ({statusCode: 500, message: "Internal Server Error", error: "Internal Server Error"}),
        });

        await expect(submitDiagnostic(PAYLOAD)).rejects.toMatchObject({
            message: "Une erreur est survenue, veuillez réessayer.",
        });
    });

    it("expose les messages de champ (fieldMessages) lorsqu'ils sont fournis par l'API", async () => {
        mockFetchOnce({
            ok: false,
            status: 400,
            json: async () => ({
                statusCode: 400,
                message: ["q3 must be a valid enum value"],
                error: "Bad Request",
            }),
        });

        try {
            await submitDiagnostic(PAYLOAD);
            expect.unreachable("submitDiagnostic aurait dû lever une ApiError");
        } catch (error) {
            expect(error).toBeInstanceOf(ApiError);
            expect((error as ApiError).fieldMessages).toEqual(["q3 must be a valid enum value"]);
        }
    });

    it("gère une réponse d'erreur non-JSON sans planter", async () => {
        mockFetchOnce({
            ok: false,
            status: 500,
            json: async () => {
                throw new Error("not json");
            },
        });

        await expect(submitDiagnostic(PAYLOAD)).rejects.toMatchObject({
            message: "Une erreur est survenue, veuillez réessayer.",
        });
    });

    it("renvoie undefined si le corps de la réponse succès est vide", async () => {
        mockFetchOnce({ok: true, text: async () => ""});

        const result = await fetchDiagnosticById("some-id");
        expect(result).toBeUndefined();
    });
});