# NORIA - Diagnostic ALODO MPME

**Combinaison : Formalisation · Comptabilité · Préparation au financement**

> Prototype réalisé dans le cadre de l'exercice de sélection développeur ALODO TECH.
> Évaluez en quelques minutes le niveau de structuration d'une MPME et obtenez des recommandations concrètes et
> priorisées.

[![Frontend](https://img.shields.io/badge/app-live-brightgreen)](https://noria-teal.vercel.app)
[![API Docs](https://img.shields.io/badge/api-swagger-blue)](https://noria-qps1.onrender.com/docs)

<div align="center">
  <img src="assets/noria.png" alt="Aperçu de NORIA" width="800" />
</div>

---

## Sommaire

- [1. Présentation](#1-présentation)
- [2. Aperçu du parcours](#2-aperçu-du-parcours)
- [3. Choix produit](#3-choix-produit)
- [4. Choix techniques](#4-choix-techniques)
- [5. Architecture](#5-architecture)
- [6. Installation et démarrage](#6-installation-et-démarrage)
- [7. Structure du dépôt](#7-structure-du-dépôt)
- [8. Fonctionnalités](#8-fonctionnalités)
- [9. Moteur de scoring - règles métier](#9-moteur-de-scoring--règles-métier)
- [10. Qualité, tests et CI/CD](#10-qualité-tests-et-cicd)
- [11. Sécurité](#11-sécurité)
- [12. Limites assumées du prototype](#12-limites-assumées-du-prototype)
- [13. Ce que j'aurais ajouté avec plus de temps](#13-ce-que-jaurais-ajouté-avec-plus-de-temps)
- [14. Réflexion produit (bonus)](#14-réflexion-produit-bonus)
- [15. Utilisation de l'IA](#15-utilisation-de-lia)
- [16. Documentation complémentaire](#16-documentation-complémentaire)

---

## 1. Présentation

**NORIA** est un prototype fonctionnel du diagnostic ALODO MPME, limité volontairement à une seule combinaison de
dimensions parmi les 8 prévues par le programme complet : **Formalisation**, **Comptabilité**, et **Préparation au
financement**.

Le produit couvre le parcours minimal attendu :

1. **Introduction** - présentation du diagnostic, durée estimée, appel à l'action.
2. **Questionnaire** - 10 questions réparties sur les 3 dimensions, une à la fois, avec barre de progression.
3. **Résultat** - score global, scores par dimension, point fort, axe d'amélioration prioritaire, et recommandation
   textuelle actionnable.

Le calcul est **entièrement déterministe** : aucune intelligence artificielle n'intervient dans le scoring ou la
génération des recommandations - un choix assumé, détaillé en [section 3](#3-choix-produit).

Ce dépôt est un **monorepo** contenant deux applications indépendantes et déployables séparément :

| Application               | Rôle                                   | Stack                           |
|---------------------------|----------------------------------------|---------------------------------|
| [`backend/`](./backend)   | API REST, calcul du score, persistance | NestJS · Prisma · PostgreSQL    |
| [`frontend/`](./frontend) | Interface du parcours diagnostic       | Next.js (App Router) · React 19 |

---

## 2. Aperçu du parcours

```
┌────────────────┐      ┌──────────────────────┐      ┌───────────────────────┐
│  Introduction   │ ───▶ │  Questionnaire (10Q)  │ ───▶ │  Résultat (score, reco) │
│  "Commencer"    │      │  1 question / écran   │      │  /diagnostic/resultat/  │
└────────────────┘      └──────────────────────┘      └───────────────────────┘
▲                          │                              │
│                          ▼                              ▼
│                 localStorage (reprise)          GET /diagnostics/:id
│                                                  (rechargement de page)
└──────────────────── "Refaire le diagnostic" ─────────────┘
```

Chaque réponse est sauvegardée localement au fur et à mesure (`localStorage`), ce qui permet de reprendre un diagnostic
interrompu sur le même appareil. La soumission finale (`POST /diagnostics`) déclenche le calcul serveur et la
persistance en base ; le résultat est ensuite adressable par son identifiant, ce qui rend la page de résultat *
*rafraîchissable sans perte de données**.

---

## 3. Choix produit

### Pourquoi cette combinaison de dimensions plutôt qu'une autre ?

Le brief impose de choisir un périmètre réduit parmi les 8 dimensions d'ALODO MPME, sans obligation de justification
unique - mais ce choix devait rester **cohérent et défendable**.

J'ai retenu **Formalisation → Comptabilité → Préparation au financement** pour trois raisons :

1. **Elles forment une chaîne de dépendance logique et réaliste.** Une entreprise mal formalisée (pas d'enregistrement
   légal, finances mélangées) ne peut pas produire une comptabilité fiable ; et sans comptabilité fiable, aucun dossier
   de financement solide ne peut être constitué. Ce n'est pas un choix arbitraire de trois dimensions indépendantes :
   c'est un **entonnoir de maturité**, qui reflète une réalité de terrain observée chez les MPME informelles ou
   semi-formelles - le public visé par ALODO.
2. **Elles sont directement actionnables.** Contrairement à des dimensions comme le Commercial ou les Ressources
   humaines, qui dépendent fortement du secteur d'activité, la Formalisation, la Comptabilité et le Financement suivent
   des standards administratifs et financiers relativement universels, quel que soit le métier de l'entreprise. Cela
   permet un scoring simple à interpréter et des recommandations génériques mais pertinentes.
3. **Elles racontent une histoire produit forte pour la démonstration.** Le mécanisme de **cascade** (
   voir [section 9](#9-moteur-de-scoring--règles-métier)) - où une Formalisation insuffisante plafonne artificiellement
   les scores de Comptabilité et de Financement - est un exemple concret et convaincant de la valeur ajoutée d'un
   diagnostic structuré face à un simple questionnaire à points : le système ne se contente pas d'additionner des
   réponses, il modélise une dépendance métier réelle entre dimensions.

### Pourquoi 10 questions et pas 6 ou 12 ?

Le brief autorise 6 à 12 questions. J'ai retenu **10**, réparties en **4 / 3 / 3** sur les trois dimensions : suffisant
pour produire un score nuancé par dimension (une seule question par dimension aurait rendu le score binaire et peu
crédible), sans excéder les 3 à 5 minutes annoncées à l'utilisateur sur l'écran d'introduction.

### Pourquoi un scoring pondéré avec plafonnement plutôt qu'une simple moyenne ?

Une moyenne simple des 10 réponses aurait été trompeuse : elle aurait permis à une entreprise totalement informelle,
mais disposant d'une bonne discipline comptable de fait, d'obtenir un score élevé - alors que sans existence légale,
cette comptabilité n'a aucune valeur opposable (impossible à présenter à une banque, à l'administration fiscale, etc.).
Le mécanisme de plafonnement (`cap = 50 + 0.5 × formalisation`) traduit fidèlement cette réalité sans jamais l'exposer
littéralement à l'utilisateur (aucun terme technique comme "plafonnement" ou "cascade" n'apparaît dans l'interface -
voir `docs/BUSINESS_RULES.md`).

### Pourquoi un moteur déterministe plutôt qu'un scoring assisté par IA ?

Un diagnostic destiné à orienter des décisions de structuration ou de financement doit être **reproductible, expliquable
et auditable**. Un même jeu de réponses doit toujours produire exactement le même résultat, aujourd'hui comme dans six
mois. Un moteur à base de règles pures, versionné (`scoringEngineVersion`), remplit cette exigence de traçabilité qu'un
modèle génératif ne peut pas garantir. La piste d'une couche IA complémentaire (reformulation, non substitution du
calcul) est explorée en [section 14](#14-réflexion-produit-bonus).

---

## 4. Choix techniques

| Décision                                          | Justification                                                                                                                                                                                                                                                                                                                                           |
|---------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **NestJS** côté backend                           | Framework opinionated qui impose une séparation Controller / Service / Repository dès la structure du projet - cohérent avec l'exigence d'un moteur de scoring totalement découplé du framework et testable en isolation.                                                                                                                               |
| **Prisma + PostgreSQL**                           | Typage fort de bout en bout entre le schéma et le code TypeScript, migrations versionnées et commitées, adapté à une persistance relationnelle simple (deux tables, une relation).                                                                                                                                                                      |
| **Next.js (App Router) + React 19**               | Adapté à un parcours multi-écrans avec routes dynamiques (`/diagnostic/resultat/[id]`), et à un déploiement `standalone` léger.                                                                                                                                                                                                                         |
| **Tailwind CSS v4**                               | Permet de construire un design system cohérent (palette, typographie, espacement) via des variables CSS centralisées (`globals.css`), sans répéter les valeurs dans chaque composant.                                                                                                                                                                   |
| **Framer Motion**                                 | Micro-interactions et transitions entre questions, pour un ressenti fluide sans sacrifier la rapidité de complétion (voir critère UX du brief).                                                                                                                                                                                                         |
| **Vitest** (backend et frontend)                  | Plus rapide que Jest sur ce périmètre, API compatible, cohérence d'outillage sur les deux applications.                                                                                                                                                                                                                                                 |
| **oxlint** (backend)                              | Linter Rust, très rapide, suffisant pour un projet de cette taille sans la configuration lourde d'ESLint + plugins TypeScript côté API.                                                                                                                                                                                                                 |
| **Aucun package partagé frontend/backend**        | Décision assumée : dupliquer manuellement les enums et DTOs plutôt que d'introduire un package npm partagé, disproportionné pour deux applications de cette taille. Le risque de divergence est limité car les **textes et barèmes ne sont jamais dupliqués** - ils transitent uniquement par `GET /questions` (voir `backend/docs/API_GUIDELINES.md`). |
| **Docker par application + orchestration racine** | Chaque application (`backend/`, `frontend/`) est packagée et déployable indépendamment ; un `docker-compose.yml` racine permet une exécution complète en une commande.                                                                                                                                                                                  |

---

## 5. Architecture

```
Utilisateur
│
▼
Next.js (Introduction, Questionnaire, Résultat)
│  HTTP JSON - /api/v1/*
▼
NestJS (Controller → Service → Repository)
│
├──▶ scoring.engine.ts        (fonctions pures, aucune dépendance framework)
├──▶ recommendation.engine.ts (fonctions pures)
│
▼
Prisma Client
│
▼
PostgreSQL
```

**Règle d'architecture centrale, respectée sur toute la codebase :** le domaine métier (
`backend/src/diagnostic/domain/`) ne dépend d'aucun framework - ni NestJS, ni Prisma, ni Express. Il est testable en
appelant directement des fonctions pures. Cette séparation est vérifiée par la structure des tests (`test/unit/` ne
démarre jamais NestJS) et documentée en détail dans `backend/docs/ARCHITECTURE.md` et `frontend/docs/ARCHITECTURE.md`.

Le frontend, de son côté, **ne recalcule jamais aucune règle métier** : il affiche uniquement ce que l'API lui renvoie
déjà interprété (niveau de maturité, point fort, axe d'amélioration, recommandation).

---

## 6. Installation et démarrage

### Prérequis

- Node.js ≥ 22
- Docker (pour PostgreSQL en local, ou pour tout exécuter en conteneurs)

### Option A - Exécution complète via Docker (recommandé pour une démonstration)

```bash
git clone https://github.com/Darrylwin/Noria.git Noria
cd Noria

# Copier les variables d'environnement racine (valeurs de dev déjà fournies par défaut)
cp .env.example .env

docker compose up --build
```

- Frontend : [http://localhost:3000](http://localhost:3000)
- API : [http://localhost:3001](http://localhost:3001)
- Documentation Swagger interactive : [http://localhost:3001/docs](http://localhost:3001/docs)

### Option B - Exécution native (développement)

**1. Backend**

```bash
cd backend
npm install
cp .env.example .env
docker compose up -d          # démarre uniquement PostgreSQL
npx prisma migrate dev
npx prisma generate
npm run start:dev             # http://localhost:3001
```

**2. Frontend** (dans un second terminal)

```bash
cd frontend
npm install
cp .env.example .env
npm run dev                   # http://localhost:3000
```

### Vérifier que tout fonctionne

```bash
curl http://localhost:3001/api/v1/health
# {"status":"ok","services":{"database":"up"}, ...}
```

Puis ouvrir [http://localhost:3000](http://localhost:3000) et dérouler le parcours complet.

### Lancer les tests

```bash
# Backend (unit + e2e + couverture)
cd backend && npm test
cd backend && npm run test:cov

# Frontend
cd frontend && npm test
cd frontend && npm run test:cov
```

Chaque application dispose de son propre README détaillé (`backend/README.md`, `frontend/README.md`) pour les scripts,
variables d'environnement et conventions spécifiques.

---

## 7. Structure du dépôt

```
.
├── backend/                 # API NestJS - voir backend/README.md et backend/docs/
│   ├── src/
│   │   ├── diagnostic/      # Module principal : controller, service, repository
│   │   │   └── domain/      # Moteur de scoring et de recommandations (fonctions pures)
│   │   ├── questions/       # Catalogue des 10 questions (GET /questions)
│   │   ├── health/          # Sonde de disponibilité
│   │   └── common/          # Filtre d'erreurs, intercepteur de logs
│   ├── prisma/               # Schéma et migrations
│   ├── test/                 # unit/ (domaine pur) + e2e/ (API HTTP complète)
│   └── docs/                 # Architecture, règles métier, sécurité, déploiement, API
├── frontend/                 # Application Next.js - voir frontend/README.md et frontend/docs/
│   ├── app/
│   │   ├── page.tsx                       # Écran Introduction
│   │   ├── diagnostic/page.tsx            # Écran Questionnaire
│   │   ├── diagnostic/resultat/[id]/      # Écran Résultat
│   │   ├── components/                    # Composants diagnostic/ et ui/
│   │   ├── hooks/useDiagnosticWizard.ts   # Orchestration du parcours
│   │   └── lib/                           # API client, storage, types, enums
│   ├── test/                  # Tests, arborescence miroir de app/
│   └── docs/                  # Architecture, développement, contribution, sécurité
├── docker-compose.yml         # Orchestration complète (PostgreSQL + API + frontend)
└── .github/workflows/         # Pipelines CI/CD indépendants par application
```

Chaque sous-projet documente ses propres conventions et son architecture en détail : voir `backend/docs/` et
`frontend/docs/` pour aller plus loin que ce README de synthèse.

---

## 8. Fonctionnalités

- ✅ Écran d'introduction avec proposition de reprise d'un diagnostic en cours.
- ✅ Questionnaire de 10 questions, une à la fois, avec dimension affichée, barre de progression animée et compteur (
  `Question 4 sur 10`).
- ✅ Navigation avant/arrière sans jamais perdre une réponse déjà donnée.
- ✅ Sauvegarde automatique de la progression dans `localStorage`, tolérante aux environnements où le stockage est
  indisponible (navigation privée, quota dépassé).
- ✅ Soumission avec état de chargement explicite et protection contre le double envoi.
- ✅ Gestion d'erreur réseau avec possibilité de réessayer sans perdre les réponses saisies.
- ✅ Écran de résultat : score global animé, scores par dimension, point fort, axe d'amélioration, recommandation
  principale et secondaires (cas de cascade).
- ✅ Rechargement de la page de résultat sans perte de données (`GET /diagnostics/:id`).
- ✅ Documentation API interactive (Swagger) générée à partir du code, jamais désynchronisée.
- ✅ Validation stricte des entrées (rejet des champs manquants, inconnus ou hors énumération).
- ✅ Rate limiting, CORS restrictif, CSP, limite de taille de payload.
- ✅ Responsive mobile-first, testé du smartphone au desktop.
- ✅ Suite de tests couvrant le moteur de scoring, le moteur de recommandations, le catalogue, l'API (e2e) et les
  composants/hooks frontend.
- ✅ Pipelines CI/CD indépendants (lint, typecheck, tests, couverture, build) pour chaque application.

---

## 9. Moteur de scoring - règles métier

Le calcul est un pipeline pur en 10 étapes, documenté en détail avec sa justification métier dans
`backend/docs/BUSINESS_RULES.md` et directement dans le code (`backend/src/diagnostic/domain/scoring.engine.ts`).
Résumé :

```text
1. formalizationScore = moyenne(Q1..Q4)
2. accountingRawScore = moyenne(Q5..Q7)
3. fundingRawScore    = moyenne(Q8..Q10)

4. cap = 50 + 0.5 × formalizationScore        (plafond imposé par la Formalisation)

5. accountingFinalScore = min(accountingRawScore, cap)
   fundingFinalScore    = min(fundingRawScore, cap)

6. globalScore = 0.40 × formalizationScore + 0.30 × accountingFinalScore + 0.30 × fundingFinalScore

7. maturityLevel : < 45 → à renforcer · < 75 → en cours · ≥ 75 → avancée

8. cascadeTriggered = (formalizationScore < 50) ET (au moins un score brut > cap)
   → si vrai, l'axe d'amélioration est forcé sur Formalisation, quels que soient les autres scores.
```

**Invariants garantis et testés** :

- Le plafond reste toujours entre 50 et 100.
- Un score final n'excède jamais son score brut correspondant.
- `cascadeTriggered` ne peut jamais être vrai si la Formalisation atteint 50 ou plus.
- Le moteur est déterministe : mêmes réponses ⇒ résultat strictement identique.
- Aucun terme technique interne (« cascade », « plafonnement ») n'atteint jamais l'interface utilisateur - vérifié par
  un test frontend dédié.

---

## 10. Qualité, tests et CI/CD

| Couche                      | Ce qui est testé                                                                                |
|-----------------------------|-------------------------------------------------------------------------------------------------|
| Moteur de scoring           | Bornes des seuils, cascade déclenchée/non déclenchée, tie-breaks, invariants, déterminisme      |
| Moteur de recommandations   | Chaque dimension × chaque niveau, cas cascade                                                   |
| Catalogue de questions      | Complétude (10 questions), unicité des codes, correspondance avec les enums                     |
| API (e2e)                   | Soumission valide, 400 sur payload invalide/champ inconnu, lecture par id, 404                  |
| Hooks / composants frontend | Navigation, persistance locale, états de soumission, absence de vocabulaire technique dans l'UI |

Chaque application dispose d'un pipeline CI/CD dédié (`.github/workflows/backend-ci-cd.yml`, `frontend-ci-cd.yml`),
déclenché à chaque push et pull request, exécutant : installation reproductible (`npm ci`), migrations, typecheck, lint,
tests avec couverture, et build. Aucune fusion sur `main` n'est envisagée si un pipeline échoue.

Seuils de couverture backend appliqués (`vitest.config.ts`) : 80 % lignes/fonctions/statements, 75 % branches, avec
exclusion explicite et documentée de l'infrastructure non métier (cycle de vie NestJS, filtres, logger).

---

## 11. Sécurité

Le diagnostic est public et anonyme, sans donnée personnelle identifiante collectée. Les protections mises en place
restent néanmoins celles attendues d'une API de production :

- Validation stricte (`whitelist`, `forbidNonWhitelisted`), énumérations fermées par question.
- Rate limiting (10 req/min/IP sur `POST /diagnostics`).
- CORS restreint à une seule origine configurée par variable d'environnement, jamais de wildcard.
- CSP stricte sur toutes les routes métier (assouplie uniquement sur `/docs` pour Swagger UI).
- Limite de payload à 10 Ko.
- Format d'erreur uniforme, sans jamais exposer de stack trace, de détail Prisma ou SQL au client.

Détail complet et décisions explicitement hors périmètre dans `backend/docs/SECURITY.md` et `frontend/docs/SECURITY.md`.

---

## 12. Limites assumées du prototype

Ces limites sont des choix de priorisation délibérés, pas des oublis - conformément à l'esprit du brief qui valorise la
capacité à réduire le périmètre :

- **3 dimensions sur 8** : les autres dimensions d'ALODO MPME (Finance, Commercial, Digitalisation, Opérations, RH) ne
  sont pas couvertes par ce prototype.
- **Reprise du questionnaire limitée au même appareil/navigateur** : repose sur `localStorage`, sans synchronisation
  multi-appareils ni expiration automatique.
- **Aucune authentification** : chaque diagnostic est anonyme, aucun historique par utilisateur.
- **Aucune suppression automatique des soumissions** en base - acceptable pour un volume de démonstration, à traiter
  avant un usage en production réelle (voir `backend/docs/BACKUP.md`).
- **Aucune reformulation par IA** de la recommandation : le texte est entièrement déterministe, choisi parmi un ensemble
  fini et prévisible.
- **Pas d'environnement de staging documenté** : les migrations sont validées en CI avant `main`, mais pas testées sur
  un environnement intermédiaire dédié.

---

## 13. Ce que j'aurais ajouté avec plus de temps

- Un endpoint et un écran permettant d'expliquer **pédagogiquement** l'effet du plafonnement à l'utilisateur (les scores
  bruts `raw` sont déjà exposés par l'API dans ce but, mais non encore affichés côté frontend).
- Une politique de rétention/anonymisation des soumissions, avec une tâche planifiée de purge.
- Des tests de contrat OpenAPI automatisés (vérification que `docs-json` reste cohérent avec les DTOs à chaque CI).
- Une télémétrie basique (taux d'abandon par question) pour identifier les points de friction réels du questionnaire.
- L'extension du moteur à une deuxième combinaison de dimensions, pour valider en pratique l'extensibilité décrite
  en [section 5](#5-architecture) et dans `backend/docs/ARCHITECTURE.md`.

---

## 14. Réflexion produit (bonus)

**Piste : un diagnostic adaptatif piloté par le profil déclaré de l'entreprise.**

Le parcours actuel est statique : les mêmes 10 questions sont posées à toute MPME, quel que soit son secteur ou sa
taille. Or une question comme *« Disposez-vous d'états financiers récents ? »* n'a pas le même sens pour une entreprise
individuelle sans salarié que pour une PME de 30 personnes avec un service comptable.

Une évolution naturelle consisterait à ajouter, en tout début de parcours, **2 à 3 questions de profilage** (forme
juridique déclarée, nombre d'employés, secteur commercial vs. services) qui déterminent dynamiquement :

- **Le poids relatif des dimensions** dans le score global (ex. la Formalisation pèserait davantage pour une entreprise
  individuelle en cours de structuration que pour une société déjà enregistrée).
- **Le sous-ensemble de questions posées** au sein d'une dimension (ex. une question sur la gestion de stock n'a de sens
  que pour une activité commerciale, pas pour une activité de service pur).
- **Le ton et la priorisation de la recommandation finale** (une TPE individuelle et une PME de 30 salariés n'ont pas
  les mêmes leviers d'action prioritaires même à score global identique).

Sur le plan technique, cela resterait compatible avec l'architecture actuelle : le `questions.catalog.ts` gagnerait un
champ optionnel de segmentation (`appliesToProfile`), et le moteur de scoring recevrait le profil en paramètre
supplémentaire pour ajuster ses pondérations - sans remettre en cause la séparation domaine/infrastructure déjà en
place, ni le principe d'un moteur entièrement déterministe et versionné.

Cette piste n'a pas été implémentée dans ce prototype : l'ajout d'une logique de profilage aurait complexifié le
catalogue de questions et le moteur de scoring au-delà de ce que permettait le délai de 3 jours, au risque de fragiliser
la fiabilité du cœur du produit (le scoring lui-même) au profit d'une fonctionnalité périphérique.

---

## 15. Utilisation de l'IA

Un assistant IA, notament Claude a été utilisé ponctuellement en support de développement - génération de tests
unitaires
additionnels, relecture de cohérence de la documentation, et accélération de la rédaction de certains textes de
contenu (`content.fr.ts`). L'intégralité du code produit a été relue, comprise et, le cas échéant, corrigée
manuellement. Les décisions d'architecture, le choix du périmètre fonctionnel et les règles métier du moteur de scoring
sont des choix personnels assumés, que je peux détailler et défendre en entretien.

---

## 16. Documentation complémentaire

Pour aller au-delà de cette synthèse, chaque application documente en détail ses propres décisions :

**Backend** (`backend/docs/`)

- `ARCHITECTURE.md` - couches, règles de dépendance, flux de données
- `BUSINESS_RULES.md` - moteur de scoring et de recommandations, exemples chiffrés
- `API_GUIDELINES.md` - conventions REST, format d'erreur, contrat détaillé des endpoints
- `SECURITY.md` - mesures en place et décisions explicitement hors périmètre
- `DEPLOYMENT.md`, `BACKUP.md` - procédures de mise en production
- `CONTRIBUTING.md` - workflow, conventions de nommage, ajout de règle métier

**Frontend** (`frontend/docs/`)

- `ARCHITECTURE.md` - couches, flux de données, hook `useDiagnosticWizard`
- `DEVELOPMENT.md` - boucle de développement, tâches courantes, débogage
- `SECURITY.md` - périmètre de risque, stockage client, en-têtes recommandés
- `CONTRIBUTING.md` - workflow de contribution et checklist de pull request

---

<div align="center">

**NORIA** - Développé par [LOGOSSOU Darryl-win](https://www.linkedin.com/in/darryl-win-logossou/).

</div>