import {describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {QuestionCard} from "@/app/components/diagnostic/QuestionCard";
import {Dimension} from "@/app/lib/enums/dimension";
import {QuestionDefinition} from "@/app/lib/types/diagnostic";

const QUESTION: QuestionDefinition = {
    code: "Q1",
    dimension: Dimension.FORMALIZATION,
    order: 1,
    label: "Votre entreprise est-elle officiellement enregistrée ?",
    options: [
        {code: "NOT_REGISTERED", label: "Pas encore enregistrée", scoreValue: 0},
        {code: "REGISTRATION_IN_PROGRESS", label: "En cours d'enregistrement", scoreValue: 50},
        {code: "REGISTERED", label: "Officiellement enregistrée", scoreValue: 100},
    ],
};

describe("QuestionCard", () => {
    it("affiche la question et toutes ses options", () => {
        render(<QuestionCard question={QUESTION} selectedAnswer={undefined} onSelect={() => {
        }}/>);

        expect(screen.getByText(QUESTION.label)).toBeInTheDocument();
        QUESTION.options.forEach((option) => {
            expect(screen.getByText(option.label)).toBeInTheDocument();
        });
    });

    it("affiche le nom de la dimension associée à la question", () => {
        render(<QuestionCard question={QUESTION} selectedAnswer={undefined} onSelect={() => {
        }}/>);
        expect(screen.getByText("Formalisation")).toBeInTheDocument();
    });

    it("marque comme sélectionnée l'option correspondant à selectedAnswer", () => {
        render(<QuestionCard question={QUESTION} selectedAnswer="REGISTERED" onSelect={() => {
        }}/>);

        const options = screen.getAllByRole("radio");
        const selected = options.find((el) => el.getAttribute("aria-checked") === "true");
        expect(selected).toHaveTextContent("Officiellement enregistrée");
    });

    it("appelle onSelect avec le code de l'option cliquée", async () => {
        const onSelect = vi.fn();
        const user = userEvent.setup();
        render(<QuestionCard question={QUESTION} selectedAnswer={undefined} onSelect={onSelect}/>);

        await user.click(screen.getByText("En cours d'enregistrement"));
        expect(onSelect).toHaveBeenCalledWith("REGISTRATION_IN_PROGRESS");
    });
});