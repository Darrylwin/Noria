import {beforeEach, describe, expect, it, vi} from "vitest";
import {diagnosticStorage} from "@/app/lib/storage/diagnosticStorage";
import {DiagnosticProgressCache} from "@/app/lib/types/diagnostic";

const SAMPLE: DiagnosticProgressCache = {
    answers: {Q1: "REGISTERED", Q2: "YES"},
    currentQuestionIndex: 2,
    savedAt: "2026-01-01T00:00:00.000Z",
};

describe("diagnosticStorage", () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it("renvoie null quand aucune progression n'est enregistrée", () => {
        expect(diagnosticStorage.load()).toBeNull();
    });

    it("sauvegarde puis relit exactement la même progression", () => {
        diagnosticStorage.save(SAMPLE);
        expect(diagnosticStorage.load()).toEqual(SAMPLE);
    });

    it("supprime la progression enregistrée", () => {
        diagnosticStorage.save(SAMPLE);
        diagnosticStorage.clear();
        expect(diagnosticStorage.load()).toBeNull();
    });

    it("renvoie null si le contenu stocké n'est pas un JSON valide", () => {
        window.localStorage.setItem("noria-diagnostic-progress", "{invalide");
        expect(diagnosticStorage.load()).toBeNull();
    });

    it("ne lève jamais d'exception si localStorage.getItem échoue (navigation privée, quota, etc.)", () => {
        const spy = vi
            .spyOn(Object.getPrototypeOf(window.localStorage), "getItem")
            .mockImplementation(() => {
                throw new Error("QuotaExceededError");
            });

        expect(() => diagnosticStorage.load()).not.toThrow();
        expect(diagnosticStorage.load()).toBeNull();
        spy.mockRestore();
    });

    it("ne lève jamais d'exception si localStorage.setItem échoue", () => {
        const spy = vi
            .spyOn(Object.getPrototypeOf(window.localStorage), "setItem")
            .mockImplementation(() => {
                throw new Error("QuotaExceededError");
            });

        expect(() => diagnosticStorage.save(SAMPLE)).not.toThrow();
        spy.mockRestore();
    });

    it("ne lève jamais d'exception si localStorage.removeItem échoue", () => {
        const spy = vi
            .spyOn(Object.getPrototypeOf(window.localStorage), "removeItem")
            .mockImplementation(() => {
                throw new Error("SecurityError");
            });

        expect(() => diagnosticStorage.clear()).not.toThrow();
        spy.mockRestore();
    });
});