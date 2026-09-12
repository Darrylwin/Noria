# Architecture

Ce document décrit les choix structurels du backend Noria, les règles de dépendance entre couches, et les justifications
des décisions prises.

---

## Vue d'ensemble

```
Requête HTTP
     │
     ▼
┌─────────────────────┐
│     Controller      │  Valide la forme, délègue, formate la réponse
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│       Service       │  Orchestre les appels, aucune règle métier
└──────┬──────────────┘
       │         │
       ▼         ▼
┌──────────┐  ┌─────────────────────────────────────┐
│Repository│  │             Domain                  │
│          │  │  ┌─────────────────────────────┐    │
│  Prisma  │  │  │      scoring.engine.ts      │    │
│  Client  │  │  │  recommendation.engine.ts   │    │
└──────┬───┘  │  │      questions.catalog.ts   │    │
       │      │  │         content.fr.ts       │    │
       ▼      │  └─────────────────────────────┘    │
 PostgreSQL   └─────────────────────────────────────┘
```

---

## Règles de dépendance

Chaque couche ne peut dépendre que de ce qui est listé dans la colonne de droite.

| Couche     | Peut dépendre de                             | Ne doit jamais dépendre de                   |
|------------|----------------------------------------------|----------------------------------------------|
| `domain/`  | Rien (types natifs TypeScript uniquement)    | NestJS, Prisma, Express, HTTP                |
| Service    | `domain/`, Repository                        | Prisma Client directement, logique de calcul |
| Controller | Service, DTOs                                | Prisma Client, logique de scoring            |
| Repository | Prisma Client, `domain/` (lecture catalogue) | Recalcul de score                            |
| DTOs       | Enums                                        | Domain, Prisma, NestJS modules               |

La règle centrale : **le domain ne dépend de rien**. Il peut être testé en appelant directement des fonctions pures,
sans démarrer NestJS ni Prisma.

---

## Structure des dossiers

```
src/
├── app.module.ts                  # Racine NestJS, imports globaux
├── main.ts                        # Bootstrap, CORS, ValidationPipe
│
├── diagnostic/                    # Module principal
│   ├── diagnostic.controller.ts   # POST /diagnostics, GET /diagnostics/:id
│   ├── diagnostic.service.ts      # Orchestration scoring → recommandation → persistance
│   ├── diagnostic.repository.ts   # Lecture/écriture Prisma
│   ├── diagnostic.module.ts       # Déclaration du module NestJS
│   │
│   ├── domain/                    # Logique métier pure, sans dépendance externe
│   │   ├── scoring.engine.ts      # Pipeline de calcul en 10 étapes
│   │   ├── recommendation.engine.ts # Sélection des textes
│   │   ├── questions.catalog.ts   # Structure des 10 questions
│   │   └── content.fr.ts          # Tous les textes français
│   │
│   ├── dto/
│   │   ├── submit-diagnostic.dto.ts    # Validation du payload entrant
│   │   └── diagnostic-response.dto.ts  # Forme de la réponse sortante
│   │
│   └── enums/
│       ├── answers.enum.ts        # Codes de réponse par question
│       └── dimension.enum.ts      # FORMALIZATION, ACCOUNTING, FUNDING
│
├── questions/                     # Module lecture catalogue
│   ├── questions.controller.ts    # GET /questions
│   └── questions.module.ts
│
├── health/                        # Module disponibilité
│   ├── health.controller.ts       # GET /health
│   └── health.module.ts
│
├── prisma/                        # Service Prisma partagé
│   ├── prisma.service.ts
│   └── prisma.module.ts
│
├── common/
│   ├── filters/
│   │   └── http-exception.filter.ts   # Format d'erreur uniforme, global
│   └── interceptors/
│       └── logging.interceptor.ts     # Journalisation des requêtes, global
│
└── config/
    └── env.validation.ts          # Validation des variables d'environnement au démarrage
```

---

## Responsabilités par couche

### Controller

- Reçoit la requête HTTP.
- Délègue la validation de forme à `ValidationPipe` via le DTO.
- Appelle le service applicatif.
- Renvoie la réponse ou lève une exception NestJS (`NotFoundException`).
- **Ne contient aucune règle métier, aucun calcul, aucun accès direct à Prisma.**

### Service

- Reçoit un DTO validé.
- Construit l'objet `Answers` à partir du DTO.
- Appelle `computeScore()` puis `computeRecommendation()`.
- Appelle le repository pour persister et obtenir le DTO de réponse.
- **Ne contient aucune formule de calcul. Son rôle est d'orchestrer, pas de décider.**

### Repository

- Seul point de contact avec Prisma Client pour le module diagnostic.
- Persiste une soumission complète avec ses réponses individuelles.
- Reconstruit le résultat depuis la base pour `GET /diagnostics/:id` en rappelant `computeRecommendation()` - le moteur
  étant déterministe, le résultat est garanti identique à la soumission initiale.
- **Ne recalcule jamais un score. Les scores sont lus depuis les colonnes persistées.**

### Domain

Quatre fichiers, responsabilités strictement séparées :

**`scoring.engine.ts`** - pipeline de calcul pur. Entrée : 10 codes de réponse. Sortie : tous les scores intermédiaires
et finaux, le niveau de maturité, la cascade, le point fort, l'axe d'amélioration. Aucun texte, aucune dépendance
externe.

**`recommendation.engine.ts`** - sélection des textes. Reçoit la sortie du scoring, retourne les textes à afficher.
Aucun calcul numérique.

**`questions.catalog.ts`** - source de vérité unique des 10 questions, de leur ordre, de leurs options et des valeurs de
score associées. Consommé par le scoring engine et exposé via `GET /questions`.

**`content.fr.ts`** - tous les textes français (libellés de niveau, descriptions, recommandations, textes de cascade).
Modifiable sans toucher à la logique de calcul.

---

## Flux d'une soumission

```
POST /diagnostics
      │
      ▼
DiagnosticController
  └─ valide le payload via SubmitDiagnosticDto
      │
      ▼
DiagnosticService
  ├─ construit Answers depuis le DTO
  ├─ computeScore(answers)        ← scoring.engine.ts
  ├─ computeRecommendation(scoring) ← recommendation.engine.ts
  └─ repository.save(answers, scoring, recommendation)
      │
      ▼
DiagnosticRepository
  ├─ calcule scoreValue par réponse via questions.catalog.ts
  ├─ prisma.diagnosticSubmission.create(...)
  └─ retourne DiagnosticResultDto
      │
      ▼
201 Created - DiagnosticResultDto
```

## Flux d'un rechargement de résultat

```
GET /diagnostics/:id
      │
      ▼
DiagnosticController
      │
      ▼
DiagnosticService
  └─ repository.findById(id)
      │
      ▼
DiagnosticRepository
  ├─ prisma.diagnosticSubmission.findUnique(...)
  ├─ reconstruit ScoringResult depuis les colonnes persistées
  ├─ computeRecommendation(scoring)  ← résultat identique, moteur déterministe
  └─ retourne DiagnosticResultDto
      │
      ▼
200 OK - DiagnosticResultDto
```

---

## Décisions structurelles

### Séparation content.fr.ts / questions.catalog.ts

Le catalogue décrit la structure technique des questions (codes, ordre, dimension, valeurs de score). Le fichier de
contenu regroupe les textes français des recommandations et niveaux. Cette séparation garantit qu'une modification de
texte ne nécessite pas de toucher à la logique de calcul, et inversement.

### Module questions séparé de diagnostic

La lecture du catalogue est un besoin de lecture simple, sans rapport avec le calcul de scoring. Le séparer dans son
propre module évite de charger inutilement le contexte du module diagnostic pour un endpoint qui n'a besoin que du
catalogue statique.

### Pas de package partagé entre frontend et backend

La décision du projet impose la duplication manuelle des DTOs et enums entre frontend et backend. En contrepartie,
`GET /questions` évite de dupliquer les textes des questions et options : seuls les codes techniques sont dupliqués sous
forme de types TypeScript côté frontend.

### Scores persistés, pas recalculés à la lecture

Les scores calculés au moment de la soumission sont stockés tels quels en base. Un futur changement de barème ne
modifiera jamais rétroactivement l'interprétation d'un diagnostic déjà rendu. Chaque soumission est associée à un champ
`scoring_engine_version` pour tracer la version du moteur qui l'a produite.

### Textes non persistés, reconstruits à la lecture

Les textes de recommandation ne sont pas stockés en base. Ils sont reconstruits à chaque lecture via
`computeRecommendation()`, qui est déterministe : les mêmes scores produisent toujours les mêmes textes. Cela évite de
stocker des chaînes de caractères volumineuses et permet de corriger une coquille dans un texte sans migration de
données.

### Monolithe modulaire

Aucune architecture distribuée, aucun bus d'événements, aucun CQRS. Le projet est un monolithe NestJS proportionné à son
périmètre. Les modules sont isolés par responsabilité, ce qui permet d'évoluer sans réécriture complète, mais sans la
complexité opérationnelle d'une architecture distribuée.

---

## Extensibilité

L'architecture est conçue pour absorber les évolutions les plus probables sans réécriture.

| Évolution                                 | Impact                                                                                           |
|-------------------------------------------|--------------------------------------------------------------------------------------------------|
| Nouvelle combinaison de dimensions        | Nouveau catalogue + nouvelle fonction de scoring dans `domain/`, sans toucher à l'infrastructure |
| Modification du barème                    | Localisée dans `scoring.engine.ts` et `questions.catalog.ts`, incrémenter `scoringEngineVersion` |
| Modification des textes                   | Localisée dans `content.fr.ts`, aucun impact sur le calcul                                       |
| Ajout d'une authentification              | Guard NestJS sur les routes concernées, aucune refonte du controller                             |
| Ajout d'un historique utilisateur         | Ajout d'une relation `userId` sur `DiagnosticSubmission`, schema additif                         |
| Plusieurs versions du moteur en parallèle | `scoringEngineVersion` permet de router vers la bonne fonction de calcul                         |

---

## Tests

La séparation domain / infrastructure permet de tester la logique métier sans démarrer NestJS.

| Suite | Fichiers                                  | Ce qui est testé                                    |
|-------|-------------------------------------------|-----------------------------------------------------|
| Unit  | `test/unit/scoring.engine.spec.ts`        | Pipeline de calcul, cascade, tie-breaks, invariants |
| Unit  | `test/unit/recommendation.engine.spec.ts` | Sélection des textes par dimension et niveau        |
| Unit  | `test/unit/questions.catalog.spec.ts`     | Complétude et cohérence catalogue / enums           |
| E2E   | `test/e2e/app.e2e-spec.ts`                | API complète via HTTP, persistance, cas d'erreur    |

`npm test` lance l'ensemble en une seule commande.