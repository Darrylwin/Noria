"use client";

import {Suspense, useEffect, useState} from "react";
import {useRouter, useSearchParams} from "next/navigation";
import {Container} from "@/app/components/ui/Container";
import {ProgressBar} from "@/app/components/diagnostic/ProgressBar";
import {QuestionCard} from "@/app/components/diagnostic/QuestionCard";
import {Button} from "@/app/components/ui/Button";
import {StateScreen} from "@/app/components/ui/StateScreen";
import {useDiagnosticWizard} from "@/app/hooks/useDiagnosticWizard";

// Au-delà de ce délai, on considère que le chargement initial est anormalement
// long : cas typique d'un "cold start" sur un hébergement serverless gratuit.
// En dessous, on affiche un simple écran de chargement neutre pour ne pas
// inquiéter inutilement l'utilisateur sur un chargement rapide normal.
const SLOW_LOADING_THRESHOLD_MS = 2500;

function QuestionnaireContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const mode = searchParams.get("mode") === "new" ? "new" : "resume";

    const wizard = useDiagnosticWizard(mode);
    const [isLoadingSlowly, setIsLoadingSlowly] = useState(false);

    useEffect(() => {
        if (!wizard.isLoadingQuestions) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsLoadingSlowly(false);
            return;
        }

        const timer = setTimeout(() => setIsLoadingSlowly(true), SLOW_LOADING_THRESHOLD_MS);
        return () => clearTimeout(timer);
    }, [wizard.isLoadingQuestions]);

    useEffect(() => {
        if (wizard.submissionStatus === "success" && wizard.resultId) {
            router.push(`/diagnostic/resultat/${wizard.resultId}`);
        }
    }, [wizard.submissionStatus, wizard.resultId, router]);

    if (wizard.isLoadingQuestions) {
        return isLoadingSlowly ? (
            <StateScreen
                eyebrow="Presque prêt"
                title="Le serveur se réveille…"
                description="Notre hébergement gratuit met parfois quelques secondes à démarrer après une période d'inactivité. Merci de patienter, ça ne devrait plus être long - désolé pour le désagrément."
            />
        ) : (
            <StateScreen
                eyebrow="Chargement"
                title="Préparation de votre diagnostic…"
                description="Un instant, nous chargeons le questionnaire."
            />
        );
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