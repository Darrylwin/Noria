"use client";

import {motion} from "framer-motion";
import {Dimension} from "@/app/lib/enums/dimension";
import {DIMENSION_META} from "@/app/lib/utils/dimension-meta";

export function DimensionRow({
                                 dimension,
                                 score,
                                 delay = 0,
                             }: {
    dimension: Dimension;
    score: number;
    delay?: number;
}) {
    const meta = DIMENSION_META[dimension];

    return (
        <div>
            <div className="mb-2 flex items-baseline justify-between">
                <span className="font-sans text-[14px] font-semibold text-ink">{meta.label}</span>
                <span className="font-display text-[18px] font-medium text-ink">{score}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full" style={{backgroundColor: meta.softVar}}>
                <motion.div
                    className="h-full rounded-full"
                    style={{backgroundColor: meta.colorVar}}
                    initial={{width: 0}}
                    animate={{width: `${score}%`}}
                    transition={{duration: 0.9, delay, ease: [0.22, 1, 0.36, 1]}}
                />
            </div>
        </div>
    );
}