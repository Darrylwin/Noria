"use client";

import {AnimatePresence, motion} from "framer-motion";
import {AnswerCode, QuestionDefinition} from "@/app/lib/types/diagnostic";
import {DIMENSION_META} from "@/app/lib/utils/dimension-meta";
import {OptionButton} from "./OptionButton";

export function QuestionCard({
                                 question,
                                 selectedAnswer,
                                 onSelect,
                             }: {
    question: QuestionDefinition;
    selectedAnswer: AnswerCode | undefined;
    onSelect: (code: AnswerCode) => void;
}) {
    const meta = DIMENSION_META[question.dimension];

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={question.code}
                initial={{opacity: 0, x: 24}}
                animate={{opacity: 1, x: 0}}
                exit={{opacity: 0, x: -24}}
                transition={{duration: 0.28, ease: [0.22, 1, 0.36, 1]}}
            >
                <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5"
                     style={{backgroundColor: meta.softVar}}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{backgroundColor: meta.colorVar}}/>
                    <span className="font-sans text-[12px] font-semibold uppercase tracking-[0.08em]"
                          style={{color: meta.colorVar}}>
            {meta.label}
          </span>
                </div>

                <h2 className="mb-8 font-display text-[26px] font-medium leading-[1.25] text-ink sm:text-[30px]">
                    {question.label}
                </h2>

                <div role="radiogroup" aria-label={question.label} className="flex flex-col gap-3">
                    {question.options.map((option) => (
                        <OptionButton
                            key={option.code}
                            label={option.label}
                            isSelected={selectedAnswer === option.code}
                            onSelect={() => onSelect(option.code)}
                        />
                    ))}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}