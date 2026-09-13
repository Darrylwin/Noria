import {DiagnosticProgressCache} from "../types/diagnostic";

const STORAGE_KEY = "noria-diagnostic-progress";

/**
 * Point d'accès unique au cache navigateur de progression du diagnostic.
 * Isolé du reste du frontend pour pouvoir changer de mécanisme de stockage
 * plus tard (ex. IndexedDB) sans impacter les composants ou le hook wizard.
 * Toute erreur d'accès (navigation privée, quota dépassé, storage désactivé)
 * est capturée silencieusement : la reprise est un confort, jamais une
 * condition de fonctionnement du diagnostic.
 */
export const diagnosticStorage = {
    load(): DiagnosticProgressCache | null {
        if (typeof window === "undefined") return null;
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            return JSON.parse(raw) as DiagnosticProgressCache;
        } catch {
            return null;
        }
    },

    save(cache: DiagnosticProgressCache): void {
        if (typeof window === "undefined") return;
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
        } catch {
            // Stockage indisponible : le diagnostic continue en mémoire uniquement.
        }
    },

    clear(): void {
        if (typeof window === "undefined") return;
        try {
            window.localStorage.removeItem(STORAGE_KEY);
        } catch {
            // Rien à faire si la suppression échoue elle-même.
        }
    },
};