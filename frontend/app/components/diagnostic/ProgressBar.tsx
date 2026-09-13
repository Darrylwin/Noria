"use client";

import {motion} from "framer-motion";

export function ProgressBar({current, total}: { current: number; total: number }) {
    const percent = ((current + 1) / total) * 100;

    return (
        <div className="w-full">
            <div className="mb-2.5 flex items-center justify-between font-sans text-[13px] font-medium text-ink-soft">
        <span>
          Question {current + 1} <span className="text-ink-soft/60">sur {total}</span>
        </span>
                <span className="tabular-nums text-ink-soft/70">{Math.round(percent)}%</span>
            </div>
            <div className="h-[3px] w-full overflow-hidden rounded-full bg-line">
                <motion.div
                    className="h-full rounded-full bg-accent"
                    initial={false}
                    animate={{width: `${percent}%`}}
                    transition={{type: "spring", stiffness: 120, damping: 20}}
                />
            </div>
        </div>
    );
}