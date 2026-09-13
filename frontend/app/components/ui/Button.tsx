"use client";

import {ButtonHTMLAttributes, forwardRef} from "react";
import {cn} from "@/app/lib/utils/cn";
import {Spinner} from "./Spinner";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    isLoading?: boolean;
}

const VARIANT_CLASSES: Record<Variant, string> = {
    primary: "bg-ink text-paper hover:bg-ink/90 disabled:bg-ink/40",
    secondary: "bg-transparent text-ink border border-line hover:border-ink/40 hover:bg-ink/[0.03]",
    ghost: "bg-transparent text-ink-soft hover:text-ink",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({className, variant = "primary", isLoading, disabled, children, ...props}, ref) => (
        <button
            ref={ref}
            disabled={disabled || isLoading}
            className={cn(
                "inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5",
                "font-sans text-[15px] font-semibold tracking-tight transition-all duration-200",
                "disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]",
                VARIANT_CLASSES[variant],
                className,
            )}
            {...props}
        >
            {isLoading && <Spinner/>}
            <span>{children}</span>
        </button>
    ),
);
Button.displayName = "Button";