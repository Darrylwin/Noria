# API Guidelines

Conventions et décisions de conception de l'API Noria. Ce document sert de référence pour toute évolution future des
endpoints existants ou l'ajout de nouveaux endpoints.

---

## Conventions générales

### Format

- Toutes les réponses sont en JSON (`Content-Type: application/json`).
- Les routes sont en `kebab-case` et au pluriel pour les ressources : `/diagnostics`, `/questions`.
- Les identifiants de ressources sont des UUID v4.
- Les codes techniques (enums, codes de question, codes de réponse) sont en `SCREAMING_SNAKE_CASE`.
- Les textes destinés à l'utilisateur sont en français, jamais dans les codes techniques.

### Langue

- Identifiants techniques (routes, champs JSON, codes) : anglais.
- Messages d'erreur renvoyés au client : français.
- Logs serveur : français ou anglais, de façon cohérente sur tout le projet.

### Versionnement

Toutes les routes métier sont préfixées `/api/v1` (préfixe global `api` + versionnement par URI, version par défaut
`1`), configuré une seule fois dans `main.ts`. Un nouveau contrôleur n'a rien à faire de spécial pour en bénéficier :
le préfixe et la version s'appliquent automatiquement à toute route déclarée via un contrôleur NestJS.

Deux exceptions volontaires, qui ne passent jamais par `/api/v1` :

- `/docs` et `/docs-json` (documentation Swagger UI) : une documentation n'est pas une ressource métier versionnée,
  elle est enregistrée directement sur l'adaptateur HTTP via `SwaggerModule.setup`, en dehors du préfixe global.
- Aucune autre route n'existe en dehors de `/api/v1` actuellement.

Si une évolution future de la formule de scoring nécessitait de faire coexister deux comportements incompatibles
(plutôt qu'un simple changement de valeur, déjà couvert par `scoringEngineVersion`, voir `BUSINESS_RULES.md`), le
préfixe `/api/v2` serait introduit à ce moment-là, avec les deux versions actives en parallèle le temps de la
migration des clients.

---

## Documentation interactive

La documentation OpenAPI de l'API est générée automatiquement à partir des décorateurs `@Api*` posés sur les
contrôleurs et les DTOs (`@nestjs/swagger`) - elle ne peut donc jamais diverger silencieusement du code réellement
déployé.

| Route            | Contenu                                                                                                                |
|------------------|------------------------------------------------------------------------------------------------------------------------|
| `GET /docs`      | Interface Swagger UI, navigable et testable directement depuis le navigateur                                           |
| `GET /docs-json` | Contrat OpenAPI brut au format JSON, consommé par `/docs` ou tout autre outil (génération de client, tests de contrat) |

Ces deux routes sont accessibles sans authentification, cohérent avec le fait que l'API elle-même n'en a pas (voir
`SECURITY.md`). Elles sont servies avec une politique de sécurité (CSP) plus permissive que le reste de l'API, car
Swagger UI a besoin d'exécuter un script inline pour s'initialiser - cette politique élargie ne s'applique jamais aux
routes `/api/v1/*`.

Tout nouveau champ de DTO ou nouvel endpoint doit être documenté avec `@ApiProperty` / `@ApiOperation` /
`@ApiResponse` au moment où il est écrit, pas après coup : la description doit expliquer l'intention métier du champ
(pourquoi il existe, ce qu'il implique), pas seulement son type. Voir `DiagnosticResponseDto` pour un exemple du
niveau de détail attendu.

Pour documenter une réponse d'erreur avec un exemple précis tout en réutilisant le schéma structurel commun
(`HttpErrorDto`), ne jamais combiner `type` et `schema` sur le même `@ApiResponse` (le second écrase le premier).
Utiliser à la place :

```typescript
@ApiExtraModels(HttpErrorDto) // sur la classe du contrôleur
// ...
@ApiResponse({
  status: 404,
  schema: {
    allOf: [{ $ref: getSchemaPath(HttpErrorDto) }],
    example: { statusCode: 404, message: 'Diagnostic introuvable.', error: 'Not Found' },
  },
})
```

---

## Codes de statut HTTP utilisés

| Code                        | Usage                                                                   |
|-----------------------------|-------------------------------------------------------------------------|
| `200 OK`                    | Lecture réussie (`GET`)                                                 |
| `201 Created`               | Création réussie (`POST /diagnostics`)                                  |
| `400 Bad Request`           | Payload invalide (champ manquant, valeur hors enum, propriété inconnue) |
| `404 Not Found`             | Ressource inexistante (`GET /diagnostics/:id` avec un id inconnu)       |
| `413 Payload Too Large`     | Payload dépassant la limite configurée (10 Ko sur `POST /diagnostics`)  |
| `429 Too Many Requests`     | Rate limit atteint                                                      |
| `500 Internal Server Error` | Erreur inattendue côté serveur                                          |
| `503 Service Unavailable`   | `GET /health` uniquement, base de données inaccessible                  |

Aucun autre code n'est utilisé dans le périmètre actuel.

---

## Format d'erreur uniforme

Toutes les erreurs, quelle que soit leur origine, suivent le même format (voir `HttpErrorDto`, réutilisé dans la
documentation Swagger pour chaque réponse d'erreur) :

```json
{
  "statusCode": 400,
  "message": [
    "q3 must be a valid enum value"
  ],
  "error": "Bad Request"
}
```

- `statusCode` : code HTTP numérique, identique au statut de la réponse.
- `message` : tableau de chaînes pour les erreurs de validation (un message par champ invalide), chaîne simple pour les
  autres erreurs.
- `error` : libellé court du type d'erreur.

Les erreurs 500 renvoient toujours le message générique suivant, sans aucun détail technique :

```json
{
  "statusCode": 500,
  "message": "Une erreur est survenue, veuillez réessayer.",
  "error": "Internal Server Error"
}
```

Ce format est produit par `HttpExceptionFilter`, appliqué globalement. Aucun contrôleur ne construit ses propres
réponses d'erreur.

---

## Validation des entrées

- `ValidationPipe` est appliqué globalement avec `whitelist: true` et `forbidNonWhitelisted: true`.
- Une propriété inconnue dans le payload est rejetée en `400`, jamais ignorée silencieusement.
- Chaque champ du DTO de soumission est typé sur son propre enum fermé. Une valeur hors enum déclenche un `400` avec un
  message ciblant le champ concerné.
- Le payload de `POST /diagnostics` est limité à 10 Ko.

---

## Endpoints

Toutes les routes ci-dessous, sauf `/docs` et `/docs-json`, sont préfixées `/api/v1` (voir section Versionnement).

### `GET /health`

Vérification de disponibilité du processus applicatif et de la base de données.

- Effectue un ping SQL réel (`SELECT 1`) sur PostgreSQL à chaque appel.
- Toujours rapide, utilisé par la plateforme d'hébergement comme sonde de disponibilité.
- Non soumis au rate limiting.
- Usage d'infrastructure uniquement, jamais consommé par le frontend applicatif.

```
GET /api/v1/health

200 OK
{
  "status": "ok",
  "timestamp": "2026-09-12T10:00:00.000Z",
  "uptime": 3600,
  "services": { "database": "up" },
  "system": { "memoryHeapUsed": "45 MB", "memoryHeapTotal": "128 MB" }
}

503 Service Unavailable  - base de données inaccessible, même structure avec "status": "error"
```

---

### `GET /questions`

Catalogue complet des 10 questions avec leurs options et valeurs de score.

- Endpoint de lecture seule, ne modifie jamais l'état.
- Le frontend consomme cet endpoint pour afficher le questionnaire sans dupliquer les textes.
- La réponse est identique à chaque appel (données statiques issues du catalogue).
- Non soumis au rate limiting.
- Le tableau retourné n'est pas garanti trié : le frontend doit trier sur le champ `order` de chaque question, pas sur
  l'ordre de retour du tableau.

```
GET /api/v1/questions

200 OK
[
  {
    "code": "Q1",
    "dimension": "FORMALIZATION",
    "order": 1,
    "label": "Votre entreprise est-elle officiellement enregistrée ?",
    "options": [
      { "code": "NOT_REGISTERED", "label": "Pas encore enregistrée", "scoreValue": 0 },
      { "code": "REGISTRATION_IN_PROGRESS", "label": "En cours d'enregistrement", "scoreValue": 50 },
      { "code": "REGISTERED", "label": "Officiellement enregistrée", "scoreValue": 100 }
    ]
  },
  ...
]
```

---

### `POST /diagnostics`

Soumet un diagnostic complet. Calcule le score, persiste la soumission et retourne le résultat interprété.

- Non idempotent : chaque appel crée une nouvelle soumission avec un nouvel identifiant, même avec un payload
  identique à un appel précédent.
- Calcul entièrement synchrone et déterministe : les mêmes 10 réponses produisent toujours exactement le même
  résultat.
- Soumis au rate limiting : 10 requêtes par minute par adresse IP.
- Payload limité à 10 Ko.

```
POST /api/v1/diagnostics
Content-Type: application/json
```

**Requête - les 10 champs sont obligatoires**

```json
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
```

Chaque valeur doit correspondre exactement à un `options[].code` retourné par `GET /questions` pour la question
correspondante - jamais le `label` affiché.

**Réponse `201 Created`**

```json
{
  "id": "b3e1e6d2-4b2a-4c39-9a2f-1234567890ab",
  "globalScore": 68.4,
  "maturityLevel": "IN_PROGRESS",
  "maturityLabel": "Structuration en cours",
  "maturityDescription": "Des bases solides existent déjà. Certains points méritent encore d'être renforcés pour fiabiliser votre gestion et faciliter vos démarches futures.",
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
  "mainRecommendation": "Formalisez votre besoin de financement (montant, objet, échéance) pour être prêt le moment venu.",
  "secondaryRecommendations": []
}
```

**Comportements spécifiés**

| Situation             | Réponse                                                      |
|-----------------------|--------------------------------------------------------------|
| Champ manquant        | `400` avec le nom du champ dans `message`                    |
| Valeur hors enum      | `400` avec le nom du champ dans `message`                    |
| Propriété inconnue    | `400`                                                        |
| Payload > 10 Ko       | `413`                                                        |
| Rate limit dépassé    | `429`                                                        |
| Erreur de persistance | `500` avec message générique, détail journalisé côté serveur |

---

### `GET /diagnostics/:id`

Recharge le résultat d'une soumission existante par son identifiant.

- Endpoint de lecture seule, ne modifie jamais l'état.
- Retourne exactement le même format de réponse que `POST /diagnostics` - le frontend peut réutiliser le même
  composant d'affichage pour les deux cas.
- Utilisé par la page de résultat pour survivre à un rafraîchissement de page.
- Non soumis au rate limiting.

```
GET /api/v1/diagnostics/b3e1e6d2-4b2a-4c39-9a2f-1234567890ab

200 OK  - même format que la réponse de POST /diagnostics
404 Not Found - identifiant inconnu
```

---

## Champs de la réponse diagnostic

| Champ                      | Type            | Description                                                                                            |
|----------------------------|-----------------|--------------------------------------------------------------------------------------------------------|
| `id`                       | `string` (UUID) | Identifiant unique de la soumission                                                                    |
| `globalScore`              | `number`        | Score global arrondi à une décimale (0–100)                                                            |
| `maturityLevel`            | `enum`          | `NEEDS_STRENGTHENING`, `IN_PROGRESS` ou `ADVANCED` - sert à la logique, pas à l'affichage direct       |
| `maturityLabel`            | `string`        | Libellé français du niveau, prêt à afficher                                                            |
| `maturityDescription`      | `string`        | Description française du niveau, prête à afficher                                                      |
| `scores.formalization`     | `number`        | Score final de Formalisation, arrondi à l'entier - jamais plafonné                                     |
| `scores.accounting.raw`    | `number`        | Score brut de Comptabilité, avant plafonnement - jamais affiché comme résultat principal               |
| `scores.accounting.final`  | `number`        | Score final de Comptabilité, après plafonnement - toujours celui à afficher                            |
| `scores.funding.raw`       | `number`        | Score brut de Financement, avant plafonnement - jamais affiché comme résultat principal                |
| `scores.funding.final`     | `number`        | Score final de Financement, après plafonnement - toujours celui à afficher                             |
| `strongestDimension`       | `enum`          | Dimension avec le score final le plus élevé                                                            |
| `improvementFocus`         | `enum`          | Dimension prioritaire pour les efforts d'amélioration - forcée à `FORMALIZATION` si `cascadeTriggered` |
| `cascadeTriggered`         | `boolean`       | Indique si le plafonnement a effectivement réduit un score - ne jamais nommer explicitement dans l'UI  |
| `mainRecommendation`       | `string`        | Recommandation principale en français, prête à afficher                                                |
| `secondaryRecommendations` | `string[]`      | Recommandations secondaires (0 à 2 éléments ; non vide uniquement si `cascadeTriggered`)               |

---

## Décisions de conception

### Pourquoi 10 champs explicites plutôt qu'un tableau générique

Le payload utilise `q1` à `q10` avec chacun son propre enum plutôt qu'un tableau `{ questionCode, value }[]`. Cela
permet à la validation NestJS de rejeter automatiquement toute valeur hors enum pour chaque question précise, avec un
message d'erreur ciblé par champ, sans code de validation croisée manuel.

### Pourquoi les scores bruts sont exposés

`scores.accounting.raw` et `scores.funding.raw` sont exposés dans la réponse même quand ils sont identiques au score
final. Cela permet une future évolution UI pédagogique (expliquer l'effet du plafonnement) sans nouvel appel serveur ni
changement de contrat d'API.

### Pourquoi GET /diagnostics/:id existe

La page de résultat est adressée par identifiant dans l'URL (`/diagnostic/resultat/:id`). Sans cet endpoint, un
rafraîchissement de page perdrait le résultat. Le coût d'implémentation est négligeable puisque la persistance existe
déjà.

### Pourquoi les textes sont dans la réponse et non côté frontend

Le frontend n'embarque aucun texte métier (recommandations, libellés de niveau). Tout est renvoyé par l'API. Cela
garantit qu'une modification de texte ne nécessite pas de redéploiement frontend, et qu'il n'existe jamais de divergence
entre ce qui est calculé et ce qui est affiché.

### Pourquoi /docs et /docs-json existent en dehors de /api/v1

Une documentation n'est pas une ressource métier : elle ne représente aucune entité du domaine et n'a donc pas de
raison d'être versionnée comme telle. La conséquence directe est que `/docs` reste stable même si un futur `/api/v2`
est introduit - la doc décrirait alors les deux versions dans le même document, sans elle-même se dupliquer.