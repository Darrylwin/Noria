# NORIA - Frontend

Frontend du diagnostic ALODO MPME, Combinaison : Formalisation, Comptabilité, Préparation au financement.

Application Next.js (App Router) consommant l'API NestJS du dossier `../backend`. Ce frontend ne contient aucune règle
de scoring ou de recommandation : il affiche uniquement ce que l'API lui fournit déjà interprété.

---

## Sommaire

- [Stack technique](#stack-technique)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Variables d'environnement](#variables-denvironnement)
- [Scripts disponibles](#scripts-disponibles)
- [Structure du projet](#structure-du-projet)
- [Tests](#tests)
- [Docker](#docker)
- [Conventions](#conventions)
- [Limites connues](#limites-connues)

---

## Stack technique

| Élément    | Choix                                |
|------------|--------------------------------------|
| Framework  | Next.js 16 (App Router)              |
| UI         | React 19                             |
| Style      | Tailwind CSS v4                      |
| Animations | Framer Motion                        |
| Tests      | Vitest + Testing Library             |
| Typage     | TypeScript strict                    |
| Lint       | ESLint (config `eslint-config-next`) |

Aucune bibliothèque de state global (Redux ou équivalent) : le parcours questionnaire est linéaire et géré par un seul
hook (`useDiagnosticWizard`).

---

## Prérequis

- Node.js 22+
- Le backend NestJS doit tourner et être accessible (voir `../backend/README.md`), sauf si vous ne travaillez que sur
  l'UI avec des données mockées.

---

## Installation

```bash
cd frontend
npm install
cp .env.example .env
```

Renseignez `.env` avec l'URL de l'API backend (voir ci-dessous), puis démarrez le serveur de développement :

```bash
npm run dev
```

L'application est disponible sur [http://localhost:3000](http://localhost:3000).

---

## Variables d'environnement

| Variable              | Obligatoire | Description                                                |
|-----------------------|-------------|------------------------------------------------------------|
| `NEXT_PUBLIC_API_URL` | Oui         | URL de base de l'API backend (ex. `http://localhost:3001`) |

Next.js inline les variables préfixées `NEXT_PUBLIC_*` **au moment du build**, pas au runtime. Si vous changez cette
valeur après un `npm run build`, il faut reconstruire l'application (voir `Dockerfile`).

---

## Scripts disponibles

| Script               | Commande             | Description                                           |
|----------------------|----------------------|-------------------------------------------------------|
| Développement        | `npm run dev`        | Démarre le serveur de développement Next.js           |
| Build                | `npm run build`      | Build de production (`output: standalone`)            |
| Démarrage production | `npm start`          | Démarre le serveur buildé                             |
| Lint                 | `npm run lint`       | Vérifie le code avec ESLint                           |
| Typecheck            | `npm run typecheck`  | Vérifie les types TypeScript sans émettre de fichiers |
| Tests                | `npm test`           | Exécute la suite de tests une fois (Vitest)           |
| Tests (watch)        | `npm run test:watch` | Relance les tests à chaque modification               |
| Couverture           | `npm run test:cov`   | Exécute les tests avec rapport de couverture          |

---

## Structure du projet

```
frontend/
├── app/
│   ├── page.tsx                        # Écran d'introduction
│   ├── diagnostic/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Écran questionnaire
│   │   └── resultat/[id]/page.tsx      # Écran résultat (rechargeable via l'id)
│   ├── components/
│   │   ├── diagnostic/                 # Composants spécifiques au parcours diagnostic
│   │   └── ui/                         # Composants génériques réutilisables
│   ├── hooks/
│   │   └── useDiagnosticWizard.ts      # État complet du parcours questionnaire
│   └── lib/
│       ├── api/diagnosticApi.ts        # Client HTTP vers l'API backend
│       ├── types/diagnostic.ts         # Types partagés (dupliqués manuellement depuis le backend)
│       ├── enums/                      # Miroir des enums backend
│       ├── storage/diagnosticStorage.ts # Seul point d'accès à localStorage
│       └── utils/                      # Fonctions utilitaires (classnames, métadonnées de dimension)
├── test/                               # Tests, arborescence miroir de app/ (voir section Tests)
├── public/
├── Dockerfile
├── docker-compose.yml
└── vitest.config.ts
```

Aucun test n'est co-localisé avec le code applicatif : le dossier `app/` ne contient que du code livré, tous les tests
vivent dans `test/`.

---

## Tests

La suite de tests couvre :

- **`test/lib/storage`** : le module `diagnosticStorage`, y compris les cas de `localStorage` indisponible (navigation
  privée, quota dépassé) qui ne doivent jamais bloquer le parcours.
- **`test/lib/api`** : le client API, notamment la traduction des codes HTTP (404, 429, 500) en messages français non
  techniques.
- **`test/components/diagnostic`** : les composants d'affichage du questionnaire et du résultat (sélection d'options,
  accessibilité de base via `role="radio"`, absence de vocabulaire technique interdit comme « cascade » ou «
  plafonnement » dans l'UI).
- **`test/hooks`** : `useDiagnosticWizard`, notamment la reprise de progression, la non-suppression d'une réponse via le
  bouton « Précédent », le blocage de la soumission tant que les 10 réponses ne sont pas complètes, et la gestion des
  erreurs de soumission.

```bash
npm test          # une exécution
npm run test:watch  # mode watch pendant le développement
npm run test:cov    # avec rapport de couverture (dossier coverage/, non versionné)
```

---

## Docker

Chaque application du monorepo possède son propre `Dockerfile` et son propre `docker-compose.yml`, indépendants du
backend.

```bash
# Depuis frontend/
docker compose up --build
```

Le build multi-stage (`deps` → `builder` → `runner`) produit une image basée sur la sortie `standalone` de Next.js.
`NEXT_PUBLIC_API_URL` doit être fourni comme argument de build (`--build-arg NEXT_PUBLIC_API_URL=...`), pas seulement
comme variable d'environnement au runtime.

Pour lancer l'ensemble du projet (PostgreSQL + backend + frontend) en une seule commande, utilisez le
`docker-compose.yml` à la racine du monorepo.

---

## Conventions

- Identifiants techniques (fichiers, composants, fonctions, variables) en anglais.
- Textes affichés à l'utilisateur, commentaires de code et documentation en français.
- `PascalCase` pour les composants React, `camelCase` pour les fonctions et variables.
- Le frontend ne définit aucun texte métier en dur (recommandations, libellés de niveau, questions) : tout provient de
  l'API via `GET /questions` et `POST /diagnostics` / `GET /diagnostics/:id`. Seuls les textes d'interface générale (
  boutons, messages d'erreur réseau) sont définis côté frontend.
- Aucune règle de scoring, seuil ou formule n'est recalculée côté frontend, quelle qu'en soit la raison.

---

## Limites connues

- La reprise du questionnaire repose sur `localStorage` : elle ne fonctionne que sur le même appareil et le même
  navigateur, sans expiration automatique.
- Aucune synchronisation multi-appareils de la progression.
- Le frontend ne gère aucune authentification, cohérent avec le caractère public et anonyme du diagnostic.