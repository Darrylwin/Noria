"use client";

import {motion} from "framer-motion";
import Link from "next/link";
import {DiagnosticResult} from "@/app/lib/types/diagnostic";
import {Dimension} from "@/app/lib/enums/dimension";
import {DIMENSION_META} from "@/app/lib/utils/dimension-meta";
import {ScoreGauge} from "./ScoreGauge";
import {DimensionRow} from "./DimensionRow";
import {Button} from "@/app/components/ui/Button";

const FADE_UP = {
    hidden: {opacity: 0, y: 16},
    show: (delay: number) => ({
        opacity: 1,
        y: 0,
        transition: {duration: 0.5, delay, ease: [0.22, 1, 0.36, 1]},
    }),
};

export function ResultSummary({result}: { result: DiagnosticResult }) {
    const strongest = DIMENSION_META[result.strongestDimension];
    const focus = DIMENSION_META[result.improvementFocus];

    return (
        <div className="pb-16">
            <motion.div variants={FADE_UP} initial="hidden" animate="show" custom={0} className="text-center">
                <ScoreGauge score={result.globalScore} maturityLevel={result.maturityLevel}/>
                <h1 className="mt-6 font-display text-[24px] font-medium text-ink">{result.maturityLabel}</h1>
                <p className="mx-auto mt-3 max-w-[46ch] font-sans text-[15px] leading-relaxed text-ink-soft">
                    {result.maturityDescription}
                </p>
            </motion.div>

            <motion.div
                variants={FADE_UP}
                initial="hidden"
                animate="show"
                custom={0.15}
                className="mt-12 rounded-3xl border border-line bg-paper-raised p-6 sm:p-8"
            >
                <p className="mb-6 font-sans text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-soft/70">
                    Vos scores par dimension
                </p>
                <div className="flex flex-col gap-6">
                    <DimensionRow dimension={Dimension.FORMALIZATION} score={result.scores.formalization} delay={0.2}/>
                    <DimensionRow dimension={Dimension.ACCOUNTING} score={result.scores.accounting.final} delay={0.3}/>
                    <DimensionRow dimension={Dimension.FUNDING} score={result.scores.funding.final} delay={0.4}/>
                </div>
            </motion.div>

            <div className="mt-6 grid grid-cols-2 gap-4">
                <motion.div variants={FADE_UP} initial="hidden" animate="show" custom={0.25}
                            className="rounded-2xl border border-line bg-paper-raised p-5">
                    <p className="mb-2 font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft/60">Point
                        fort</p>
                    <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{backgroundColor: strongest.colorVar}}/>
                        <span className="font-display text-[16px] font-medium text-ink">{strongest.shortLabel}</span>
                    </div>
                </motion.div>

                <motion.div variants={FADE_UP} initial="hidden" animate="show" custom={0.3}
                            className="rounded-2xl border border-line bg-paper-raised p-5">
                    <p className="mb-2 font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft/60">Axe
                        d&apos;amélioration</p>
                    <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{backgroundColor: focus.colorVar}}/>
                        <span className="font-display text-[16px] font-medium text-ink">{focus.shortLabel}</span>
                    </div>
                </motion.div>
            </div>

            <motion.div variants={FADE_UP} initial="hidden" animate="show" custom={0.4}
                        className="mt-6 rounded-3xl bg-ink p-7 text-paper sm:p-8">
                <p className="mb-3 font-sans text-[12px] font-semibold uppercase tracking-[0.1em] text-paper/60">Recommandation</p>
                <p className="font-display text-[19px] font-medium leading-snug">{result.mainRecommendation}</p>

                {result.secondaryRecommendations.length > 0 && (
                    <div className="mt-5 flex flex-col gap-2 border-t border-paper/15 pt-5">
                        {result.secondaryRecommendations.map((text, index) => (
                            <p key={index} className="font-sans text-[14px] leading-relaxed text-paper/80">{text}</p>
                        ))}
                    </div>
                )}
            </motion.div>

            <motion.div variants={FADE_UP} initial="hidden" animate="show" custom={0.5}
                        className="mt-10 flex justify-center">
                <Link href="/">
                    <Button variant="secondary">Refaire le diagnostic</Button>
                </Link>
            </motion.div>
        </div>
    );
}