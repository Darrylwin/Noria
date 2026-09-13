"use client";

import {motion} from "framer-motion";
import {cn} from "@/app/lib/utils/cn";

export function OptionButton({
                                 label,
                                 isSelected,
                                 onSelect,
                             }: {
    label: string;
    isSelected: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={onSelect}
            className={cn(
                "group relative flex w-full items-center gap-4 rounded-2xl border px-5 py-4 text-left",
                "font-sans text-[15px] font-medium transition-all duration-150",
                isSelected
                    ? "border-ink bg-ink text-paper shadow-[0_4px_16px_-4px_rgba(21,23,31,0.35)]"
                    : "border-line bg-paper-raised text-ink hover:border-ink/30 hover:bg-ink/[0.02]",
            )}
        >
      <span
          className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors",
              isSelected ? "border-paper bg-paper" : "border-ink/25 bg-transparent",
          )}
      >
        {isSelected && (
            <motion.span
                initial={{scale: 0}}
                animate={{scale: 1}}
                transition={{type: "spring", stiffness: 400, damping: 20}}
                className="h-2.5 w-2.5 rounded-full bg-ink"
            />
        )}
      </span>
            <span className="leading-snug">{label}</span>
        </button>
    );
}