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

L'API n'est pas versionnée dans l'URL pour ce prototype (`/v1/diagnostics` n'existe pas). Si un versionnement devient
nécessaire lors d'un passage en production réelle avec plusieurs clients, il sera introduit comme préfixe de route.

---

## Codes de statut HTTP utilisés

| Code                        | Usage                                                                   |
|-----------------------------|-------------------------------------------------------------------------|
| `200 OK`                    | Lecture réussie (`GET`)                                                 |
| `201 Created`               | Création réussie (`POST /diagnostics`)                                  |
| `400 Bad Request`           | Payload invalide (champ manquant, valeur hors enum, propriété inconnue) |
| `404 Not Found`             | Ressource inexistante (`GET /diagnostics/:id` avec un id inconnu)       |
| `429 Too Many Requests`     | Rate limit atteint                                                      |
| `500 Internal Server Error` | Erreur inattendue côté serveur                                          |

Aucun autre code n'est utilisé dans le périmètre actuel.

---

## Format d'erreur uniforme

Toutes les erreurs, quelle que soit leur origine, suivent le même format :

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

### `GET /health`

Vérification de disponibilité du processus applicatif.

- Ne dépend pas de la base de données.
- Toujours rapide, utilisé par la plateforme d'hébergement comme sonde de disponibilité.
- Non soumis au rate limiting.

```
GET /health

200 OK
{ "status": "ok" }
```

---

### `GET /questions`

Catalogue complet des 10 questions avec leurs options et valeurs de score.

- Endpoint de lecture seule, ne modifie jamais l'état.
- Le frontend consomme cet endpoint pour afficher le questionnaire sans dupliquer les textes.
- La réponse est identique à chaque appel (données statiques issues du catalogue).
- Non soumis au rate limiting.

```
GET /questions

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

- Non idempotent : chaque appel crée une nouvelle soumission avec un nouvel identifiant.
- Soumis au rate limiting : 10 requêtes par minute par adresse IP.
- Payload limité à 10 Ko.

```
POST /diagnostics
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
- Retourne le même format que `POST /diagnostics`.
- Utilisé par la page de résultat pour survivre à un rafraîchissement de page.
- Non soumis au rate limiting.

```
GET /diagnostics/b3e1e6d2-4b2a-4c39-9a2f-1234567890ab

200 OK  - même format que la réponse de POST /diagnostics
404 Not Found - identifiant inconnu
```

---

## Champs de la réponse diagnostic

| Champ                      | Type            | Description                                           |
|----------------------------|-----------------|-------------------------------------------------------|
| `id`                       | `string` (UUID) | Identifiant unique de la soumission                   |
| `globalScore`              | `number`        | Score global arrondi à une décimale (0–100)           |
| `maturityLevel`            | `enum`          | `NEEDS_STRENGTHENING`, `IN_PROGRESS` ou `ADVANCED`    |
| `maturityLabel`            | `string`        | Libellé français du niveau                            |
| `maturityDescription`      | `string`        | Description française du niveau                       |
| `scores.formalization`     | `number`        | Score final de Formalisation, arrondi à l'entier      |
| `scores.accounting.raw`    | `number`        | Score brut de Comptabilité, avant plafonnement        |
| `scores.accounting.final`  | `number`        | Score final de Comptabilité, après plafonnement       |
| `scores.funding.raw`       | `number`        | Score brut de Financement, avant plafonnement         |
| `scores.funding.final`     | `number`        | Score final de Financement, après plafonnement        |
| `strongestDimension`       | `enum`          | Dimension avec le score final le plus élevé           |
| `improvementFocus`         | `enum`          | Dimension prioritaire pour les efforts d'amélioration |
| `cascadeTriggered`         | `boolean`       | Indique si la cascade a été détectée                  |
| `mainRecommendation`       | `string`        | Recommandation principale en français                 |
| `secondaryRecommendations` | `string[]`      | Recommandations secondaires (0 à 2 éléments)          |

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