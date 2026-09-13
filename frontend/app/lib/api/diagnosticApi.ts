import {DiagnosticResult, DiagnosticSubmitPayload, QuestionDefinition} from "../types/diagnostic";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const API_PREFIX = "/api/v1";
const DEFAULT_TIMEOUT_MS = 30_000;

interface HttpErrorBody {
    statusCode: number;
    message: string | string[];
    error: string;
}

/**
 * Erreur normalisée exposée aux composants : message toujours prêt à afficher
 * en français, jamais de détail technique (voir docs/API_GUIDELINES.md côté backend).
 */
export class ApiError extends Error {
    constructor(
        message: string,
        public readonly status?: number,
        public readonly fieldMessages?: string[],
    ) {
        super(message);
        this.name = "ApiError";
    }
}

function resolveErrorMessage(status: number, body: HttpErrorBody | null): string {
    switch (status) {
        case 404:
            return "Ce diagnostic est introuvable.";
        case 429:
            return "Trop de tentatives depuis cette adresse. Merci de patienter quelques instants.";
        case 413:
            return "La requête envoyée est trop volumineuse.";
        case 500:
            return "Une erreur est survenue, veuillez réessayer.";
        default:
            return typeof body?.message === "string"
                ? body.message
                : "Une erreur est survenue, veuillez réessayer.";
    }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    let response: Response;
    try {
        response = await fetch(`${API_BASE_URL}${API_PREFIX}${path}`, {
            ...init,
            signal: controller.signal,
            headers: {"Content-Type": "application/json", ...init?.headers},
        });
    } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
            throw new ApiError("Le serveur met trop de temps à répondre. Réessayez.");
        }
        throw new ApiError(
            "Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.",
        );
    } finally {
        clearTimeout(timer);
    }

    if (!response.ok) {
        let body: HttpErrorBody | null = null;
        try {
            body = (await response.json()) as HttpErrorBody;
        } catch {
            // Réponse d'erreur non-JSON : traitée comme une erreur générique ci-dessous.
        }

        const fieldMessages = Array.isArray(body?.message) ? body?.message : undefined;
        throw new ApiError(resolveErrorMessage(response.status, body), response.status, fieldMessages);
    }

    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
}

export function fetchQuestionsCatalog(): Promise<QuestionDefinition[]> {
    return request<QuestionDefinition[]>("/questions", {method: "GET", cache: "no-store"});
}

export function submitDiagnostic(payload: DiagnosticSubmitPayload): Promise<DiagnosticResult> {
    return request<DiagnosticResult>("/diagnostics", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export function fetchDiagnosticById(id: string): Promise<DiagnosticResult> {
    return request<DiagnosticResult>(`/diagnostics/${id}`, {method: "GET", cache: "no-store"});
}