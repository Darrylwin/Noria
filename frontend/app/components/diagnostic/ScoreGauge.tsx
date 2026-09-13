"use client";

import {motion} from "framer-motion";
import {MaturityLevel} from "@/app/lib/enums/dimension";
import {MATURITY_COLOR_VAR} from "@/app/lib/utils/dimension-meta";

const SIZE = 200;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ScoreGauge({score, maturityLevel}: { score: number; maturityLevel: MaturityLevel }) {
    const progress = Math.min(Math.max(score, 0), 100) / 100;
    const color = MATURITY_COLOR_VAR[maturityLevel] ?? "var(--color-accent)";

    return (
        <div className="relative mx-auto flex h-[200px] w-[200px] items-center justify-center">
            <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
                <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--color-line)"
                        strokeWidth={STROKE}/>
                <motion.circle
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={RADIUS}
                    fill="none"
                    stroke={color}
                    strokeWidth={STROKE}
                    strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE}
                    initial={{strokeDashoffset: CIRCUMFERENCE}}
                    animate={{strokeDashoffset: CIRCUMFERENCE * (1 - progress)}}
                    transition={{duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.15}}
                />
            </svg>
            <div className="absolute flex flex-col items-center">
                <motion.span
                    initial={{opacity: 0, y: 6}}
                    animate={{opacity: 1, y: 0}}
                    transition={{delay: 0.4, duration: 0.4}}
                    className="font-display text-[52px] font-medium leading-none text-ink"
                >
                    {score.toFixed(1)}
                </motion.span>
                <span className="mt-1 font-sans text-[12px] font-medium uppercase tracking-[0.1em] text-ink-soft/70">
          sur 100
        </span>
            </div>
        </div>
    );
}