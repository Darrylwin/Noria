# Architecture - Frontend NORIA

Ce document décrit l'organisation technique du frontend : ses couches, ses responsabilités, ses flux de données et les
décisions de conception qui les sous-tendent.

---

## 1. Vue d'ensemble

Le frontend est une application Next.js (App Router) qui pilote un parcours en trois écrans : Introduction,
Questionnaire, Résultat. Elle ne contient aucune logique métier de calcul (scoring, seuils, recommandations) - son rôle
se limite à collecter les réponses de l'utilisateur, les transmettre à l'API, et afficher fidèlement ce que l'API
renvoie déjà interprété.

```
Utilisateur
|
v
Écran Introduction  --->  Écran Questionnaire  --->  Écran Résultat
|                          |                          |
|                          v                          |
|                  useDiagnosticWizard                |
|                    (état + orchestration)           |
|                          |                          |
+----------- lib/storage/diagnosticStorage ----------+
|                          |
|                          v
|                  lib/api/diagnosticApi
|                          |
v                          v
localStorage              API HTTP (JSON)
```

Aucune bibliothèque de state global n'est utilisée : le parcours est linéaire, à un seul flux, et un unique hook (
`useDiagnosticWizard`) suffit à en porter tout l'état.

---

## 2. Couches et responsabilités

| Couche          | Dossier                            | Responsabilité                                                  | Ne doit jamais                                                        |
|-----------------|------------------------------------|-----------------------------------------------------------------|-----------------------------------------------------------------------|
| Pages (routing) | `app/*/page.tsx`                   | Composer les écrans, gérer la navigation Next.js                | Contenir de logique métier ou d'accès direct à `localStorage`/`fetch` |
| Composants UI   | `app/components/`                  | Affichage pur, réactif aux props reçues                         | Appeler l'API ou lire/écrire le stockage directement                  |
| Hooks           | `app/hooks/`                       | Orchestrer l'état d'un parcours (ex. le questionnaire)          | Contenir des règles de calcul (scoring, seuils)                       |
| Client API      | `app/lib/api/`                     | Point d'entrée HTTP unique vers le backend                      | Être contourné par un `fetch` ad hoc ailleurs dans le code            |
| Stockage        | `app/lib/storage/`                 | Point d'entrée unique vers `localStorage`                       | Être contourné par un accès direct à `window.localStorage` ailleurs   |
| Types & enums   | `app/lib/types/`, `app/lib/enums/` | Typage partagé entre les couches                                | Porter de la logique exécutable                                       |
| Utilitaires     | `app/lib/utils/`                   | Fonctions pures sans état (classnames, métadonnées d'affichage) | Faire d'appel réseau ou de calcul métier                              |

Cette séparation garantit qu'un composant d'affichage peut être testé, modifié ou remplacé sans jamais toucher à la
façon dont les données sont récupérées ou persistées, et inversement.

---

## 3. Flux de données détaillé

### 3.1 Chargement du questionnaire

```
Page /diagnostic
-> useDiagnosticWizard(mode)
-> fetchQuestionsCatalog()      (lib/api/diagnosticApi)
-> tri par `order`
-> si mode === "resume" : diagnosticStorage.load()
-> si mode === "new"    : diagnosticStorage.clear()
```

Le mode (`new` | `resume`) est déterminé par un paramètre d'URL (`?mode=`), lu une seule fois au montage. Le hook ne
réagit pas à un changement ultérieur de ce paramètre pendant la session : le mode est figé pour la durée de vie de la
page.

### 3.2 Réponse à une question

```
OptionButton (clic)
-> onSelect(code)
-> QuestionCard.onSelect
-> wizard.answerCurrent(code)
-> setAnswers(...)
-> diagnosticStorage.save({ answers, currentQuestionIndex, savedAt })
```

Chaque réponse est persistée immédiatement dans `localStorage`, sans action explicite de l'utilisateur au-delà de la
sélection elle-même. Modifier une réponse déjà donnée écrase simplement la valeur précédente pour ce code de question.

### 3.3 Navigation entre questions

- `goNext()` avance l'index si la question courante n'est pas la dernière, et persiste le nouvel index.
- Sur la dernière question, `goNext()` déclenche `submit()` au lieu d'avancer.
- `goPrevious()` recule l'index sans jamais supprimer une réponse déjà enregistrée.

### 3.4 Soumission finale

```
wizard.submit()
-> buildPayload()             (vérifie que les 10 réponses sont présentes)
-> submissionStatus = "submitting"
-> submitDiagnostic(payload)  (lib/api/diagnosticApi)
-> succès : diagnosticStorage.clear() + resultId = result.id + status = "success"
-> échec  : submissionError = message + status = "error"
```

Le composant de page observe `submissionStatus === "success"` via un effet et redirige vers `/diagnostic/resultat/[id]`.
Le state `submitting` désactive mécaniquement le bouton de soumission, ce qui empêche tout double envoi sans logique de
verrouillage supplémentaire.

### 3.5 Affichage du résultat

```
Page /diagnostic/resultat/[id]
-> fetchDiagnosticById(id)   (lib/api/diagnosticApi)
-> succès : affichage via ResultSummary
-> échec  : StateScreen avec message adapté (404 -> "introuvable", autre -> générique)
```

Cette page peut être atteinte directement par URL et rechargée sans perdre l'information : le résultat est ré-obtenu
depuis l'API à chaque montage, il n'existe pas de dépendance à un état en mémoire créé pendant le questionnaire.

---

## 4. Le hook `useDiagnosticWizard`

C'est le composant central de l'application côté état. Il expose une API unique consommée par la page questionnaire :

```typescript
interface UseDiagnosticWizardResult {
    questions: QuestionDefinition[];
    isLoadingQuestions: boolean;
    loadError: string | null;
    currentIndex: number;
    currentQuestion: QuestionDefinition | null;
    answers: Partial<Record<QuestionCode, AnswerCode>>;
    answerCurrent: (code: AnswerCode) => void;
    goNext: () => Promise<void>;
    goPrevious: () => void;
    canGoPrevious: boolean;
    isLastQuestion: boolean;
    submissionStatus: SubmissionStatus;
    submissionError: string | null;
    retrySubmit: () => Promise<void>;
    resultId: string | null;
}
```

Décisions de conception :

- **Un seul hook, pas de context React** : le state n'a besoin d'être partagé qu'entre la page et ses enfants directs,
  un `useState` élevé au niveau du hook suffit sans complexité de Context/Provider.
- **Machine à états explicite pour la soumission** (`idle` → `submitting` → `success` | `error`) plutôt qu'un simple
  booléen `isSubmitting` : permet de distinguer proprement l'état initial, l'échec, et le succès dans l'UI sans
  combinaisons de booléens ambiguës.
- **`useMemo` sur la valeur de retour** : évite que chaque re-render du hook ne crée un nouvel objet de résultat, ce qui
  casserait les dépendances de `useEffect` dans les composants consommateurs.
- **Persistance délibérément découplée du state React** : `persist()` est appelé explicitement à chaque mutation
  pertinente (réponse, navigation), plutôt que via un `useEffect` qui observerait `answers`/`currentIndex`. Cela rend le
  moment exact de l'écriture disque explicite et prévisible.

---

## 5. Le module de stockage (`diagnosticStorage`)

```typescript
export const diagnosticStorage = {
    load(): DiagnosticProgressCache | null,
    save(cache: DiagnosticProgressCache): void,
    clear(): void,
};
```

Ce module est le seul point de contact avec `localStorage` dans tout le frontend. Deux garanties structurelles :

1. **Isolation du mécanisme de stockage** : si `localStorage` devait être remplacé par `IndexedDB` ou une autre
   solution, un seul fichier serait à modifier.
2. **Tolérance aux pannes silencieuse** : toute exception (navigation privée, quota dépassé, stockage désactivé par une
   politique navigateur) est capturée et transformée en `null` (lecture) ou en no-op (écriture/suppression). La reprise
   du questionnaire est un confort, jamais une condition de fonctionnement - une erreur de stockage ne doit jamais faire
   échouer le parcours.

---

## 6. Le client API (`diagnosticApi`)

```typescript
class ApiError extends Error {
    constructor(message: string, status?: number, fieldMessages?: string[]);
}

function request<T>(path: string, init?: RequestInit): Promise<T>
```

`request()` est la seule fonction qui appelle réellement `fetch`. Toutes les fonctions publiques (
`fetchQuestionsCatalog`, `submitDiagnostic`, `fetchDiagnosticById`) passent par elle. Deux catégories d'erreurs sont
normalisées en `ApiError` avant de remonter à l'appelant :

- **Erreur réseau** (`fetch` rejette) : traduite en message générique de connexion, sans exposer de détail technique.
- **Réponse HTTP non `ok`** : le code de statut est mappé vers un message français adapté (`resolveErrorMessage`), avec
  une liste de messages de champ (`fieldMessages`) conservée si l'API en fournit (utile pour des erreurs de validation
  détaillées).

Aucun composant ni hook n'appelle `fetch` directement : ce point de passage unique garantit que toute évolution de la
gestion d'erreur (nouveau code de statut, changement de format) se fait à un seul endroit.

---

## 7. Composants d'affichage

Organisés en deux familles :

- **`components/ui/`** : composants génériques réutilisables, sans connaissance du domaine diagnostic (`Button`,
  `Spinner`, `Container`, `StateScreen`). Ils ne reçoivent que des props primitives ou des `ReactNode`.
- **`components/diagnostic/`** : composants spécifiques au parcours (`QuestionCard`, `OptionButton`, `ProgressBar`,
  `ResultSummary`, `DimensionRow`, `ScoreGauge`). Ils consomment des types du domaine (`QuestionDefinition`,
  `DiagnosticResult`) mais ne contiennent aucune règle de calcul - ils affichent des valeurs déjà résolues.

`dimension-meta.ts` centralise le mapping entre une dimension (`Dimension.FORMALIZATION`, etc.) et sa représentation
visuelle (libellé court, variable de couleur CSS). Ce fichier est explicitement documenté comme purement
présentationnel : aucun seuil, aucune règle de calcul n'y transite, uniquement des choix d'affichage.

---

## 8. Typage et synchronisation avec l'API

Le frontend duplique manuellement, sous forme de types TypeScript, les structures que le backend expose :

- `types/diagnostic.ts` : miroir des DTOs de requête/réponse (`DiagnosticSubmitPayload`, `DiagnosticResult`,
  `QuestionDefinition`, etc.).
- `enums/dimension.ts`, `enums/answer.ts` : miroir des enums backend.

Cette duplication est volontaire et assumée : elle évite d'introduire un package partagé ou un mécanisme de génération
de types pour un projet de cette taille. Le risque de divergence est limité par le fait que les **textes et valeurs de
score ne sont jamais dupliqués** - seuls les codes techniques (`Q1`...`Q10`, `REGISTERED`, `YES`, etc.) le sont. Les
libellés affichés, les options disponibles et les valeurs de score proviennent systématiquement de l'API (
`GET /questions`), jamais d'une constante locale.

---

## 9. Gestion des erreurs à l'échelle de l'application

Trois niveaux distincts, qui ne se substituent jamais l'un à l'autre :

1. **Erreur de chargement initial du catalogue** (`loadError`) : affichée via `StateScreen` avec action de rechargement
   complet de la page.
2. **Erreur de soumission** (`submissionError`) : affichée inline sous le questionnaire, avec un bouton « Réessayer
   l'envoi » qui relance `submit()` sans perdre les réponses déjà saisies.
3. **Erreur de récupération du résultat** (page résultat) : affichée via `StateScreen` avec une action de retour à
   l'introduction plutôt qu'un rechargement, car un résultat introuvable ne se résout pas par un nouvel essai de la même
   requête.

Dans tous les cas, le message affiché provient de `ApiError.message` (déjà traduit en français non technique par le
client API) ou d'un message de repli générique - jamais d'un détail brut de la réponse serveur.

---

## 10. Ce que cette architecture rend facile

- **Remplacer le mécanisme de persistance client** (`localStorage` → autre chose) : un seul fichier à modifier.
- **Changer la façon dont les erreurs API sont traduites** : un seul fichier (`resolveErrorMessage`) à modifier, aucun
  composant ne connaît les codes de statut HTTP directement.
- **Ajouter un nouvel écran de fin de parcours** : le hook expose déjà tout l'état nécessaire, aucun composant existant
  n'a besoin d'être modifié.
- **Tester chaque couche isolément** : les composants d'affichage peuvent être testés avec des props statiques, le hook
  peut être testé avec l'API et le stockage mockés, sans jamais avoir besoin de monter une page complète.

## 11. Ce que cette architecture rend volontairement rigide

- **Aucun accès direct à `fetch` ou `localStorage` en dehors des deux modules dédiés** : c'est une contrainte assumée,
  pas un oubli. Toute tentative de contournement (par exemple un appel `fetch` directement dans un composant) doit être
  considérée comme une régression architecturale à corriger, pas comme une optimisation locale acceptable.
- **Le frontend ne recalcule jamais un score ou un seuil affiché** : même si cela semblait plus simple ponctuellement (
  par exemple pour un aperçu instantané avant soumission), cette règle n'est jamais contournée, afin de garantir qu'un
  seul endroit dans tout le système peut produire une interprétation du diagnostic.