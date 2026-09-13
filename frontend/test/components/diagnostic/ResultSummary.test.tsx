import {describe, expect, it} from "vitest";
import {render, screen} from "@testing-library/react";
import {ResultSummary} from "@/app/components/diagnostic/ResultSummary";
import {Dimension, MaturityLevel} from "@/app/lib/enums/dimension";
import {DiagnosticResult} from "@/app/lib/types/diagnostic";

const BASE_RESULT: DiagnosticResult = {
    id: "abc-123",
    globalScore: 68.4,
    maturityLevel: MaturityLevel.IN_PROGRESS,
    maturityLabel: "Structuration en cours",
    maturityDescription: "Des bases solides existent déjà.",
    scores: {
        formalization: 62,
        accounting: {raw: 89, final: 81},
        funding: {raw: 50, final: 50},
    },
    strongestDimension: Dimension.ACCOUNTING,
    improvementFocus: Dimension.FUNDING,
    cascadeTriggered: false,
    mainRecommendation: "Formalisez votre besoin de financement.",
    secondaryRecommendations: [],
};

describe("ResultSummary", () => {
    it("affiche le score global, le libellé et la description du niveau de maturité", () => {
        render(<ResultSummary result={BASE_RESULT}/>);

        expect(screen.getByText("68.4")).toBeInTheDocument();
        expect(screen.getByText("Structuration en cours")).toBeInTheDocument();
        expect(screen.getByText("Des bases solides existent déjà.")).toBeInTheDocument();
    });

    it("affiche les trois dimensions avec leurs scores finaux", () => {
        render(<ResultSummary result={BASE_RESULT}/>);

        expect(screen.getByText("Formalisation")).toBeInTheDocument();
        expect(screen.getByText("Préparation au financement")).toBeInTheDocument();
        expect(screen.getByText("62")).toBeInTheDocument();
        expect(screen.getByText("81")).toBeInTheDocument();
        expect(screen.getByText("50")).toBeInTheDocument();
    });

    it("affiche le point fort et l'axe d'amélioration attendus", () => {
        render(<ResultSummary result={BASE_RESULT}/>);

        // "Comptabilité" apparaît à la fois comme ligne de dimension et comme point fort.
        expect(screen.getAllByText("Comptabilité").length).toBeGreaterThanOrEqual(2);
        expect(screen.getByText("Financement")).toBeInTheDocument();
    });

    it("affiche la recommandation principale", () => {
        render(<ResultSummary result={BASE_RESULT}/>);
        expect(screen.getByText("Formalisez votre besoin de financement.")).toBeInTheDocument();
    });

    it("n'affiche aucune recommandation secondaire si la liste est vide", () => {
        render(<ResultSummary result={BASE_RESULT}/>);
        expect(screen.queryByText(/Complétez votre enregistrement légal/)).not.toBeInTheDocument();
    });

    it("affiche les recommandations secondaires quand la cascade est déclenchée", () => {
        const cascadeResult: DiagnosticResult = {
            ...BASE_RESULT,
            cascadeTriggered: true,
            improvementFocus: Dimension.FORMALIZATION,
            mainRecommendation:
                "Votre structuration légale et administrative est aujourd'hui le principal levier de progression pour votre entreprise.",
            secondaryRecommendations: [
                "Complétez votre enregistrement légal et régularisez vos obligations administratives en priorité.",
            ],
        };

        render(<ResultSummary result={cascadeResult}/>);
        expect(
            screen.getByText(/Complétez votre enregistrement légal et régularisez vos obligations/),
        ).toBeInTheDocument();
    });

    it("ne mentionne jamais les termes techniques internes au moteur de scoring", () => {
        render(<ResultSummary result={BASE_RESULT}/>);
        ["plafonnement", "score brut", "pondération", "cascade"].forEach((term) => {
            expect(screen.queryByText(new RegExp(term, "i"))).not.toBeInTheDocument();
        });
    });

    it("propose un lien pour refaire le diagnostic", () => {
        render(<ResultSummary result={BASE_RESULT}/>);
        expect(screen.getByRole("link", {name: /Refaire le diagnostic/i})).toHaveAttribute("href", "/");
    });
});