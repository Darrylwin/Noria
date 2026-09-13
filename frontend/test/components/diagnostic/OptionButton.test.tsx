import {describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {OptionButton} from "@/app/components/diagnostic/OptionButton";

describe("OptionButton", () => {
    it("affiche le label fourni", () => {
        render(<OptionButton label="Officiellement enregistrée" isSelected={false} onSelect={() => {
        }}/>);
        expect(screen.getByText("Officiellement enregistrée")).toBeInTheDocument();
    });

    it("reflète l'état sélectionné via aria-checked", () => {
        render(<OptionButton label="Oui" isSelected onSelect={() => {
        }}/>);
        expect(screen.getByRole("radio")).toHaveAttribute("aria-checked", "true");
    });

    it("n'est pas marqué comme sélectionné par défaut", () => {
        render(<OptionButton label="Non" isSelected={false} onSelect={() => {
        }}/>);
        expect(screen.getByRole("radio")).toHaveAttribute("aria-checked", "false");
    });

    it("appelle onSelect au clic", async () => {
        const onSelect = vi.fn();
        const user = userEvent.setup();
        render(<OptionButton label="Non" isSelected={false} onSelect={onSelect}/>);

        await user.click(screen.getByRole("radio"));
        expect(onSelect).toHaveBeenCalledTimes(1);
    });
});