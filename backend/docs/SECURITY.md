# Sécurité

Ce document décrit les mesures de sécurité en place sur le backend Noria et les décisions explicitement jugées hors
périmètre pour ce prototype.

---

## Mesures en place

### Validation stricte des entrées

Chaque requête `POST /diagnostics` est validée par `ValidationPipe` avec les options suivantes :

- `whitelist: true` - les propriétés non déclarées dans le DTO sont silencieusement retirées avant validation
- `forbidNonWhitelisted: true` - une propriété inconnue dans le payload déclenche un rejet `400 Bad Request`
- `transform: true` - les valeurs sont transformées vers les types TypeScript attendus

Chaque champ est typé sur son propre enum fermé (`Q1Answer`, `Q2Answer`, etc.). Une valeur hors énumération est rejetée
avec un message ciblé par champ.

### Rate limiting

`@nestjs/throttler` est configuré sur l'ensemble des routes avec une limite de **10 requêtes par minute par adresse IP**
sur `POST /diagnostics`. Cette limite protège contre les abus triviaux sans gêner un usage normal.

### CORS

Une seule origine est autorisée, définie par la variable d'environnement `FRONTEND_ORIGIN`. Aucun wildcard `*` n'est
utilisé. Les méthodes autorisées sont limitées à `GET` et `POST`.

### Format d'erreur uniforme

Un filtre d'exception global (`HttpExceptionFilter`) intercepte toutes les erreurs et renvoie un format unique :

```json
{
  "statusCode": 400,
  "message": [
    "q3 must be a valid enum value"
  ],
  "error": "Bad Request"
}
```

Aucune stack trace, nom de classe, requête SQL ou détail Prisma n'apparaît jamais dans une réponse HTTP. Les erreurs
inattendues (500) renvoient un message générique en français. Le détail technique est journalisé côté serveur
uniquement.

### Secrets

Les secrets ne sont jamais commités. Seul `.env.example` est versionné. `.env` est ignoré par Git. Les variables
`DATABASE_URL` et `FRONTEND_ORIGIN` sont obligatoires au démarrage - l'application refuse de démarrer si elles sont
absentes.

### Logs

Aucun contenu détaillé des réponses utilisateur n'est journalisé en production. Seuls les événements de démarrage, les
erreurs inattendues et les échecs de persistance sont enregistrés. Aucun secret, jeton ou identifiant de connexion
n'apparaît dans les logs.

### Limite de taille du payload

Le payload de `POST /diagnostics` est limité à **10 Ko**. Largement suffisant pour 10 champs enum, cette limite protège
contre un payload anormalement volumineux.

---

## Décisions hors périmètre

Les protections suivantes ont été explicitement jugées disproportionnées pour ce prototype et documentées comme telles.

| Protection                           | Raison de l'exclusion                                                                         |
|--------------------------------------|-----------------------------------------------------------------------------------------------|
| Authentification et gestion de rôles | Aucune donnée sensible collectée, diagnostic public par choix produit                         |
| Chiffrement applicatif des données   | Aucune donnée personnelle identifiante stockée dans le périmètre actuel                       |
| Protection anti-rejeu                | L'endpoint n'est pas un paiement ni une action sensible rejouable avec conséquence financière |
| Politique de rétention des données   | Volume attendu limité (démonstration/pilote), à traiter avant passage en production réelle    |

---

## Évolutions attendues avant production réelle

- Définir une politique de rétention ou d'anonymisation des soumissions si le volume ou une contrainte réglementaire l'
  exige.
- Ajouter une authentification si des données personnelles (email, identifiant entreprise) sont collectées.
- Revoir la limite de rate limiting en fonction du trafic réel observé.
- Brancher un outil de collecte de logs structurés (ex. Datadog, Sentry) pour les environnements déployés.