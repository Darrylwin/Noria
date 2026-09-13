import {ReactNode} from "react";
import {Container} from "./Container";

export function StateScreen({
                                eyebrow,
                                title,
                                description,
                                action,
                            }: {
    eyebrow?: string;
    title: string;
    description?: string;
    action?: ReactNode;
}) {
    return (
        <main className="flex min-h-dvh items-center justify-center">
            <Container className="text-center">
                {eyebrow && (
                    <p className="mb-3 font-sans text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                        {eyebrow}
                    </p>
                )}
                <h1 className="font-display text-[26px] font-medium leading-tight text-ink">{title}</h1>
                {description && (
                    <p className="mx-auto mt-3 max-w-[42ch] font-sans text-[15px] leading-relaxed text-ink-soft">
                        {description}
                    </p>
                )}
                {action && <div className="mt-8 flex justify-center">{action}</div>}
            </Container>
        </main>
    );
}