"use client";

import {useEffect, useState} from "react";
import Link from "next/link";
import {motion} from "framer-motion";
import {Container} from "@/app/components/ui/Container";
import {Button} from "@/app/components/ui/Button";
import {diagnosticStorage} from "@/app/lib/storage/diagnosticStorage";

export default function IntroductionPage() {
    const [hasProgress, setHasProgress] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHasProgress(Boolean(diagnosticStorage.load()));
    }, []);

    return (
        <main className="flex min-h-dvh flex-col items-center justify-center py-16">
            <Container className="text-center">
                <motion.div
                    initial={{opacity: 0, y: 12}}
                    animate={{opacity: 1, y: 0}}
                    transition={{duration: 0.5, ease: [0.22, 1, 0.36, 1]}}
                >
                    <div className="mb-8 flex justify-center">
            <span
                className="rounded-full border border-line bg-paper-raised px-4 py-1.5 font-sans text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
              Noria · Diagnostic MPME
            </span>
                    </div>

                    <h1 className="font-display text-[38px] font-medium leading-[1.15] text-ink sm:text-[46px]">
                        Où en est la <em className="italic text-accent">structuration</em> de votre entreprise&nbsp;?
                    </h1>

                    <p className="mx-auto mt-6 max-w-[42ch] font-sans text-[16px] leading-relaxed text-ink-soft">
                        Dix questions, trois minutes. Vous obtenez un score clair et des recommandations
                        concrètes pour renforcer votre formalisation, votre comptabilité et votre
                        préparation au financement.
                    </p>

                    <div className="mt-10 flex flex-col items-center gap-4">
                        <Link href="/diagnostic?mode=new" className="w-full sm:w-auto">
                            <Button className="w-full sm:w-auto">Commencer le diagnostic</Button>
                        </Link>

                        {hasProgress && (
                            <Link href="/diagnostic?mode=resume">
                                <Button variant="ghost">Reprendre mon diagnostic en cours</Button>
                            </Link>
                        )}
                    </div>

                    <p className="mt-10 font-sans text-[13px] text-ink-soft/60">
                        Environ 3 à 5 minutes · Aucune inscription requise
                    </p>
                </motion.div>
            </Container>
        </main>
    );
}