"use client";

import {useEffect, useState} from "react";
import {useParams} from "next/navigation";
import Link from "next/link";
import {Container} from "@/app/components/ui/Container";
import {StateScreen} from "@/app/components/ui/StateScreen";
import {Button} from "@/app/components/ui/Button";
import {ResultSummary} from "@/app/components/diagnostic/ResultSummary";
import {ApiError, fetchDiagnosticById} from "@/app/lib/api/diagnosticApi";
import {DiagnosticResult} from "@/app/lib/types/diagnostic";

type LoadState =
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; result: DiagnosticResult };

export default function ResultPage() {
    const params = useParams<{ id: string }>();
    const [state, setState] = useState<LoadState>({status: "loading"});

    useEffect(() => {
        let cancelled = false;

        fetchDiagnosticById(params.id)
            .then((result) => {
                if (!cancelled) setState({status: "ready", result});
            })
            .catch((error) => {
                if (cancelled) return;
                const message = error instanceof ApiError ? error.message : "Une erreur est survenue, veuillez réessayer.";
                setState({status: "error", message});
            });

        return () => {
            cancelled = true;
        };
    }, [params.id]);

    if (state.status === "loading") {
        return <StateScreen eyebrow="Chargement" title="Préparation de votre résultat…"/>;
    }

    if (state.status === "error") {
        return (
            <StateScreen
                eyebrow="Résultat introuvable"
                title="Nous ne retrouvons pas ce diagnostic"
                description={state.message}
                action={
                    <Link href="/">
                        <Button>Refaire le diagnostic</Button>
                    </Link>
                }
            />
        );
    }

    return (
        <main className="min-h-dvh py-14">
            <Container>
                <ResultSummary result={state.result}/>
            </Container>
        </main>
    );
}