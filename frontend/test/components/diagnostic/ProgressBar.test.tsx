import {describe, expect, it} from "vitest";
import {render, screen} from "@testing-library/react";
import {ProgressBar} from "@/app/components/diagnostic/ProgressBar";

describe("ProgressBar", () => {
    it("affiche le numéro de question courante sur le total", () => {
        render(<ProgressBar current={3} total={10}/>);
        expect(screen.getByText("Question 4")).toBeInTheDocument();
        expect(screen.getByText("sur 10")).toBeInTheDocument();
    });

    it("calcule et affiche le pourcentage arrondi", () => {
        render(<ProgressBar current={3} total={10}/>);
        // (3 + 1) / 10 = 40 %
        expect(screen.getByText("40%")).toBeInTheDocument();
    });

    it("affiche 100% sur la dernière question", () => {
        render(<ProgressBar current={9} total={10}/>);
        expect(screen.getByText("100%")).toBeInTheDocument();
    });

    it("affiche un pourcentage cohérent sur la première question", () => {
        render(<ProgressBar current={0} total={10}/>);
        expect(screen.getByText("Question 1")).toBeInTheDocument();
        expect(screen.getByText("10%")).toBeInTheDocument();
    });
});