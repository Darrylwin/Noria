# Contributing

Guide de développement pour contribuer au backend Noria. À lire avant d'ouvrir une pull request.

---

## Prérequis

- Node.js >= 22
- Docker (pour PostgreSQL en local)
- Un éditeur configuré avec Prettier et oxlint

---

## Installation

```bash
cd backend
npm install
cp .env.example .env
docker compose up -d
npx prisma migrate dev
npx prisma generate
npm run start:dev
```

---

## Workflow

### Branches

- `main` - branche stable, toujours déployable.
- Toute modification passe par une branche de fonctionnalité courte, nommée de façon explicite.

```bash
git checkout -b fix/scoring-tie-break
git checkout -b feat/add-combination-c
```

### Commits

Les messages de commit décrivent l'intention du changement, pas son contenu ligne à ligne.

```bash
# Bien
git commit -m "Fix tie-break priority for improvementFocus when scores are equal"
git commit -m "Add funding dimension cap to scoring pipeline"

# Pas bien
git commit -m "Fix bug"
git commit -m "Update scoring.engine.ts"
```

Anglais ou français, de façon cohérente sur tout le projet.

### Pull requests

- Une PR par sujet.
- Les tests doivent passer (`npm test`) avant d'ouvrir la PR.
- Le lint doit passer (`npm run lint`) avant d'ouvrir la PR.
- Décrire ce qui change et pourquoi, pas comment (le code montre le comment).

---

## Conventions de code

### Langue

- Tous les identifiants techniques (fichiers, classes, fonctions, variables, enums, routes, commentaires) : **anglais**.
- Tous les textes destinés à l'utilisateur : **français**, dans `content.fr.ts` uniquement.

### Nommage

| Élément                | Convention                                            | Exemple                            |
|------------------------|-------------------------------------------------------|------------------------------------|
| Fichiers NestJS        | `kebab-case`                                          | `diagnostic.service.ts`            |
| Composants React       | `PascalCase`                                          | `QuestionCard.tsx`                 |
| Classes                | `PascalCase`                                          | `DiagnosticService`                |
| Fonctions et variables | `camelCase`                                           | `computeScore`                     |
| Enums                  | `PascalCase` (nom) + `SCREAMING_SNAKE_CASE` (valeurs) | `MaturityLevel.IN_PROGRESS`        |
| Constantes métier      | `SCREAMING_SNAKE_CASE`                                | `CAP_BASE`, `FORMALIZATION_WEIGHT` |

### Valeurs magiques

Aucune valeur numérique en dur dans le code métier. Les seuils, poids et constantes de la formule sont définis comme
constantes nommées dans `scoring.engine.ts` :

```typescript
// Bien
const CAP_BASE = 50;
const CAP_MULTIPLIER = 0.5;

// Pas bien
const cap = 50 + (0.5 * formalizationScore);
```

### Type `any`

Évité sauf justification explicite en commentaire inline. Les cast `as any` dans les tests pour les réponses aux
questions sont acceptés - les enums sont validés par le catalogue, pas par TypeScript à ce niveau.

### Imports circulaires

Interdits entre le domain et les couches d'infrastructure. Le domain ne doit jamais importer depuis un service, un
controller ou un repository.

---

## Règles par couche

Avant d'écrire du code, vérifier dans quelle couche il appartient.

**Un calcul ou une règle métier chiffrée** → `domain/scoring.engine.ts` ou `domain/recommendation.engine.ts`, nulle part
ailleurs.

**Un texte destiné à l'utilisateur** → `domain/content.fr.ts`, nulle part ailleurs.

**Une question, son ordre, ses options, ses valeurs de score** → `domain/questions.catalog.ts`, nulle part ailleurs.

**Une validation de forme de requête** → DTO avec `class-validator`, pas dans le controller ni le service.

**Un accès à Prisma** → `diagnostic.repository.ts` uniquement.

**Une orchestration d'appels** → `diagnostic.service.ts`, sans logique de calcul.

---

## Ajouter une règle métier

1. Écrire le test unitaire dans `test/unit/scoring.engine.spec.ts` ou `test/unit/recommendation.engine.spec.ts` en
   premier.
2. Implémenter la règle dans le fichier de domain concerné.
3. Vérifier que tous les tests passent.
4. Si la règle change le barème ou la formule, incrémenter `SCORING_ENGINE_VERSION` dans `scoring.engine.ts`.
5. Documenter la règle dans `docs/BUSINESS_RULES.md`.

---

## Ajouter un endpoint

1. Vérifier que le besoin ne peut pas être couvert par un endpoint existant.
2. Documenter le contrat dans `docs/API_GUIDELINES.md` avant d'écrire le code.
3. Créer le DTO de validation si le endpoint accepte un payload.
4. Implémenter controller → service → repository dans cet ordre.
5. Ajouter les cas dans `test/e2e/app.e2e-spec.ts`.

---

## Modifier les textes français

Les textes utilisateur vivent exclusivement dans `domain/content.fr.ts`. Une modification de texte ne doit toucher à
aucun autre fichier.

```bash
# Seul fichier à modifier pour un changement de texte
src/diagnostic/domain/content.fr.ts
```

Les tests unitaires du moteur de recommandations (`test/unit/recommendation.engine.spec.ts`) comparent les textes
renvoyés aux constantes de `content.fr.ts`. Ils passent automatiquement après une modification de texte sans nécessiter
de mise à jour des tests.

---

## Ajouter une combinaison de dimensions

Une nouvelle combinaison (ex. Combinaison C) nécessite :

1. De nouveaux enums de réponses dans `src/diagnostic/enums/`.
2. Un nouveau catalogue dans `src/diagnostic/domain/` (ou une extension du catalogue existant avec un champ
   `combination`).
3. Une nouvelle fonction de scoring dans `domain/`, ou une extension de `scoring.engine.ts` avec un paramètre de
   combinaison.
4. De nouveaux textes dans `content.fr.ts`.
5. Des tests unitaires couvrant la nouvelle logique.

L'infrastructure (controller, repository, module, base de données) n'a pas à être réécrite.

---

## Tests

### Lancer les tests

```bash
# Tous les tests (unit + e2e)
npm test

# Mode watch pendant le développement
npm run test:watch

# Couverture
npm run test:cov
```

### Où écrire les tests

```
test/
├── unit/    # fonctions pures du domain, pas de NestJS, pas de base de données
└── e2e/     # API complète via HTTP, requiert PostgreSQL
```

Les tests unitaires ne démarrent pas NestJS. Les tests e2e démarrent une instance NestJS en mémoire et écrivent en
base - ils nettoient leurs données dans `beforeAll` et `afterAll`.

### Ce qu'on teste

- **Moteur de scoring** : toutes les étapes du pipeline, les cas limites, la cascade, les tie-breaks, les invariants.
- **Moteur de recommandations** : chaque dimension à chaque niveau, le cas cascade, les libellés de maturité.
- **Catalogue** : présence des 10 questions, unicité des codes, correspondance exacte avec les enums.
- **API** : soumission valide, persistance, cas d'erreur (400, 404), rechargement du résultat.

### Ce qu'on ne teste pas

- Le rendu CSS ou les couleurs.
- Les comportements NestJS internes (injection de dépendances, décorateurs).
- La configuration Prisma ou les migrations.

---

## Lint et format

```bash
# Lint
npm run lint

# Format
npm run format
```

oxlint est rapide et strict. Prettier est configuré dans `.prettierrc`. Les deux doivent passer sans avertissement avant
toute PR.

---

## Variables d'environnement

Ne jamais commiter de valeurs réelles dans `.env`. Seul `.env.example` est versionné, avec des valeurs de développement
local non sensibles.

Si une nouvelle variable d'environnement est ajoutée :

1. L'ajouter dans `.env.example` avec une valeur d'exemple.
2. L'ajouter dans `src/config/env.validation.ts` avec sa validation.
3. La documenter dans `README.md`.

---

## Migrations Prisma

```bash
# Créer une migration après modification du schéma
npx prisma migrate dev --name description-courte-en-anglais

# Appliquer les migrations sans en créer de nouvelle (CI, production)
npx prisma migrate deploy
```

Les fichiers de migration sont commités dans `prisma/migrations/`. Ne jamais modifier un fichier de migration déjà
appliqué en production. Toute correction passe par une nouvelle migration.