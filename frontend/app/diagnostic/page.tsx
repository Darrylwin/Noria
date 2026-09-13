"use client";

import {Suspense, useEffect} from "react";
import {useRouter, useSearchParams} from "next/navigation";
import {Container} from "@/app/components/ui/Container";
import {ProgressBar} from "@/app/components/diagnostic/ProgressBar";
import {QuestionCard} from "@/app/components/diagnostic/QuestionCard";
import {Button} from "@/app/components/ui/Button";
import {StateScreen} from "@/app/components/ui/StateScreen";
import {useDiagnosticWizard} from "@/app/hooks/useDiagnosticWizard";

function QuestionnaireContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const mode = searchParams.get("mode") === "new" ? "new" : "resume";

    const wizard = useDiagnosticWizard(mode);

    useEffect(() => {
        if (wizard.submissionStatus === "success" && wizard.resultId) {
            router.push(`/diagnostic/resultat/${wizard.resultId}`);
        }
    }, [wizard.submissionStatus, wizard.resultId, router]);

    if (wizard.isLoadingQuestions) {
        return <StateScreen eyebrow="Chargement" title="Préparation de votre diagnostic…"
                            description="Un instant, nous chargeons le questionnaire."/>;
    }

    if (wizard.loadError) {
        return (
            <StateScreen
                eyebrow="Erreur"
                title="Impossible de charger le questionnaire"
                description={wizard.loadError}
                action={<Button onClick={() => window.location.reload()}>Réessayer</Button>}
            />
        );
    }

    const question = wizard.currentQuestion;
    if (!question) return null;

    const selectedAnswer = wizard.answers[question.code];
    const isSubmitting = wizard.submissionStatus === "submitting";

    return (
        <main className="flex min-h-dvh flex-col py-10">
            <Container className="mb-10">
                <ProgressBar current={wizard.currentIndex} total={wizard.questions.length}/>
            </Container>

            <Container className="flex-1">
                <QuestionCard question={question} selectedAnswer={selectedAnswer} onSelect={wizard.answerCurrent}/>

                {wizard.submissionStatus === "error" && (
                    <div className="mt-6 rounded-2xl border border-danger/25 bg-danger/[0.06] p-4">
                        <p className="font-sans text-[14px] text-danger">{wizard.submissionError}</p>
                        <button onClick={wizard.retrySubmit}
                                className="mt-2 font-sans text-[14px] font-semibold underline underline-offset-2">
                            Réessayer l&apos;envoi
                        </button>
                    </div>
                )}
            </Container>

            <Container className="mt-10">
                <div className="flex items-center justify-between gap-4">
                    <Button
                        variant="ghost"
                        onClick={wizard.goPrevious}
                        disabled={!wizard.canGoPrevious || isSubmitting}
                        className={wizard.canGoPrevious ? "" : "invisible"}
                    >
                        Précédent
                    </Button>

                    <Button onClick={wizard.goNext} disabled={!selectedAnswer || isSubmitting} isLoading={isSubmitting}>
                        {wizard.isLastQuestion ? "Voir mon résultat" : "Suivant"}
                    </Button>
                </div>
            </Container>
        </main>
    );
}

export default function DiagnosticPage() {
    return (
        <Suspense fallback={null}>
            <QuestionnaireContent/>
        </Suspense>
    );
}