# Noria - Backend

API REST du diagnostic ALODO MPME, Combinaison : Formalisation, Comptabilité, Préparation au financement.

Construit avec NestJS, Prisma et PostgreSQL. Moteur de scoring entièrement déterministe, sans dépendance à un service
externe.

---

## Stack

- **Runtime** : Node.js
- **Framework** : NestJS 12
- **Base de données** : PostgreSQL 16
- **ORM** : Prisma 6
- **Tests** : Vitest
- **Lint** : oxlint
- **Format** : Prettier

---

## Prérequis

- Node.js >= 22
- Docker (pour PostgreSQL en développement local)

---

## Installation

```bash
# Cloner le dépôt et se placer dans le dossier backend
cd backend

# Installer les dépendances
npm install

# Copier les variables d'environnement
cp .env.example .env
```

---

## Variables d'environnement

| Variable          | Obligatoire | Description                          |
|-------------------|-------------|--------------------------------------|
| `DATABASE_URL`    | Oui         | URL de connexion PostgreSQL          |
| `FRONTEND_ORIGIN` | Oui         | Origine autorisée pour le CORS       |
| `PORT`            | Non         | Port d'écoute (défaut : 3001)        |
| `NODE_ENV`        | Non         | Environnement (défaut : development) |

---

## Démarrage en développement

```bash
# Démarrer PostgreSQL
docker compose up -d

# Appliquer les migrations et générer le client Prisma
npx prisma migrate dev
npx prisma generate

# Démarrer le serveur en mode watch
npm run start:dev
```

Le serveur écoute sur `http://localhost:3001`.

---

## Tests

```bash
npm test
```

Lance l'ensemble des tests unitaires et e2e en une seule commande. Les tests e2e démarrent une instance NestJS en
mémoire et requièrent que PostgreSQL soit accessible via `DATABASE_URL`.

Structure :

```
test/
├── unit/
│   ├── scoring.engine.spec.ts       # moteur de scoring (fonctions pures)
│   ├── recommendation.engine.spec.ts # moteur de recommandations (fonctions pures)
│   └── questions.catalog.spec.ts    # cohérence catalogue / enums
└── e2e/
    └── app.e2e-spec.ts              # API complète via HTTP
```

---

## API

### `GET /health`

Effectue une requête réelle sur PostgreSQL (SELECT 1 via Prisma) et vérifie l'état du processus Node.js. À utiliser
comme readiness probe plutôt que comme liveness probe pure, puisqu'un incident DB transitoire renverra une erreur même
si le processus Node est parfaitement sain.

```
200 OK
{
  "status": "ok",
  "timestamp": "2026-09-12T14:32:10.481Z",
  "uptime": 3421,
  "services": {
    "database": "up"
  },
  "system": {
    "memoryHeapUsed": "48 MB",
    "memoryHeapTotal": "72 MB"
  }
}
```

```
503 Service Unavailable
{
  "status": "error",
  "timestamp": "2026-09-12T14:32:10.481Z",
  "uptime": 3421,
  "services": {
    "database": "down"
  },
  "system": {
    "memoryHeapUsed": "48 MB",
    "memoryHeapTotal": "72 MB"
  },
  "error": "Database ping failed"
}
```

### `GET /questions`

Catalogue complet des 10 questions avec leurs options et valeurs de score. Consommé par le frontend pour afficher le
questionnaire sans dupliquer les textes.

### `POST /diagnostics`

Soumet un diagnostic complet. Attend les 10 réponses, calcule le score, persiste la soumission et retourne le résultat
interprété.

```json
// Requête
{
  "q1": "REGISTERED",
  "q2": "YES",
  "q3": "MOSTLY_UP_TO_DATE",
  "q4": "PARTIALLY_ORGANIZED",
  "q5": "SIMPLE_SOFTWARE",
  "q6": "SYSTEMATICALLY",
  "q7": "UNDER_ONE_YEAR_OLD",
  "q8": "INFORMAL",
  "q9": "APPROXIMATE",
  "q10": "IDENTIFIED_NOT_DOCUMENTED"
}

// Réponse 201
{
  "id": "b3e1e6d2-4b2a-4c39-9a2f-1234567890ab",
  "globalScore": 68.4,
  "maturityLevel": "IN_PROGRESS",
  "maturityLabel": "Structuration en cours",
  "maturityDescription": "...",
  "scores": {
    "formalization": 62,
    "accounting": {
      "raw": 89,
      "final": 81
    },
    "funding": {
      "raw": 50,
      "final": 50
    }
  },
  "strongestDimension": "ACCOUNTING",
  "improvementFocus": "FUNDING",
  "cascadeTriggered": false,
  "mainRecommendation": "...",
  "secondaryRecommendations": []
}
```

### `GET /diagnostics/:id`

Recharge le résultat d'une soumission existante. Utilisé par la page de résultat pour survivre à un rafraîchissement de
page.

```
404 Not Found  - identifiant inconnu
```

---

## Architecture

```
src/
├── diagnostic/
│   ├── domain/          # fonctions pures, aucune dépendance framework
│   │   ├── scoring.engine.ts
│   │   ├── recommendation.engine.ts
│   │   ├── questions.catalog.ts
│   │   └── content.fr.ts
│   ├── dto/             # validation des entrées et forme des réponses
│   ├── enums/           # codes techniques des questions et réponses
│   ├── diagnostic.controller.ts
│   ├── diagnostic.service.ts
│   └── diagnostic.repository.ts
├── questions/           # endpoint lecture seule du catalogue
├── health/              # endpoint de disponibilité
├── common/
│   ├── filters/         # format d'erreur uniforme
│   └── interceptors/    # logging des requêtes
├── config/              # validation des variables d'environnement au démarrage
├── prisma/              # service Prisma partagé
└── main.ts
```

Règle centrale : la couche `domain/` ne dépend d'aucun framework. Elle peut être testée en appelant directement des
fonctions pures sans démarrer NestJS ni Prisma.

---

## Moteur de scoring

Le calcul suit un pipeline déterministe en 10 étapes :

1. Conversion des codes de réponse en valeurs numériques (0, 33, 50, 66 ou 100)
2. Moyenne par dimension (Formalisation sur Q1–Q4, Comptabilité sur Q5–Q7, Financement sur Q8–Q10)
3. Calcul du plafond : `50 + 0.5 × score_formalisation`
4. Application du plafond sur Comptabilité et Financement
5. Score global pondéré : `0.4 × F + 0.3 × C + 0.3 × Fi`
6. Niveau de maturité : < 45 → NEEDS_STRENGTHENING, < 75 → IN_PROGRESS, ≥ 75 → ADVANCED
7. Détection de la cascade : Formalisation < 50 ET au moins une dimension plafonnée
8. Dimension la plus forte (sur scores finaux, tie-break : F > C > Fi)
9. Axe d'amélioration (cascade force FORMALIZATION, sinon tie-break : C > Fi > F)
10. Arrondi unique en fin de pipeline (dimensions à l'entier, score global à une décimale)

---

## Déploiement

```bash
# Appliquer les migrations en production (jamais migrate dev)
npx prisma migrate deploy

# Build
npm run build

# Démarrer
npm run start:prod
```

Variables `DATABASE_URL` et `FRONTEND_ORIGIN` obligatoires, l'application refuse de démarrer si elles sont absentes.

---

## Limites connues

- Pas de persistance intermédiaire pendant le questionnaire, seule la soumission finale est enregistrée.
- Pas de suppression automatique des soumissions.
- Pas d'authentification, tout diagnostic est anonyme.
