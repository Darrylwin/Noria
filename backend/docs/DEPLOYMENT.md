# Déploiement

Ce document décrit la procédure de déploiement du backend Noria, les variables d'environnement requises par
environnement, et la procédure de rollback.

---

## Prérequis

- Une instance PostgreSQL managée accessible depuis l'environnement cible.
- Un hébergement supportant un processus Node.js persistant (Railway, Render, Fly.io, VPS).
- Les variables d'environnement de production configurées sur la plateforme cible.

---

## Variables d'environnement

Toutes les variables marquées **obligatoires** doivent être définies avant le démarrage. L'application refuse de
démarrer si elles sont absentes ou malformées.

| Variable          | Obligatoire | Description                                      | Exemple                                       |
|-------------------|-------------|--------------------------------------------------|-----------------------------------------------|
| `DATABASE_URL`    | Oui         | URL de connexion PostgreSQL complète             | `postgresql://user:password@host:5432/dbname` |
| `FRONTEND_ORIGIN` | Oui         | Origine exacte du frontend (sans slash final)    | `https://app.alodo.com`                       |
| `PORT`            | Non         | Port d'écoute du serveur (défaut : 3001)         | `3001`                                        |
| `NODE_ENV`        | Non         | Environnement d'exécution (défaut : development) | `production`                                  |

**Points d'attention :**

- `DATABASE_URL` doit contenir le protocole `postgresql://` ou `postgres://`, validé au démarrage.
- `FRONTEND_ORIGIN` ne doit jamais être `*`. Une valeur wildcard est rejetée par la validation au démarrage.
- `NODE_ENV=production` active le logger JSON structuré à la place du logger NestJS coloré.

---

## Procédure de déploiement

### 1. Vérifier que le CI passe

Aucun déploiement ne doit avoir lieu si le pipeline CI est en échec. Vérifier sur GitHub Actions que le dernier commit
de la branche à déployer est vert (typecheck + lint + tests + couverture).

### 2. Configurer les variables d'environnement

Sur la plateforme d'hébergement, s'assurer que toutes les variables obligatoires sont définies et à jour, notamment
`FRONTEND_ORIGIN` qui doit correspondre au domaine réel du frontend déployé.

### 3. Installer les dépendances

```bash
npm ci --omit=dev
```

`--omit=dev` exclut les dépendances de développement (Vitest, oxlint, Prettier, types) du bundle de production.

### 4. Générer le client Prisma

```bash
npx prisma generate
```

À exécuter après `npm ci`, avant le build. Le client Prisma généré doit correspondre à la version du schéma déployé.

### 5. Appliquer les migrations

```bash
npx prisma migrate deploy
```

**Jamais `prisma migrate dev` en production.** `migrate deploy` applique uniquement les migrations déjà commitées dans
`prisma/migrations/`, sans en créer de nouvelle et sans réinitialiser la base.

Cette étape doit être exécutée **avant** le démarrage de la nouvelle version de l'application, pour que le schéma soit à
jour quand le processus démarre.

### 6. Build

```bash
npm run build
```

Compile le TypeScript vers `dist/`. Vérifier que le build se termine sans erreur.

### 7. Démarrer l'application

```bash
npm run start:prod
```

Lance `node dist/main`. Le processus doit être géré par un superviseur (PM2, systemd, ou le gestionnaire de la
plateforme d'hébergement) pour redémarrer automatiquement en cas de crash.

### 8. Vérifier la disponibilité

```bash
curl https://<domaine>/api/v1/health
```

La réponse attendue est `200 OK` avec `{ "status": "ok", "services": { "database": "up" } }`. Si le statut est `503` ou
si la base est `"down"`, ne pas considérer le déploiement comme réussi.

---

## Déploiement sur Railway / Render / Fly.io

Ces plateformes gèrent le build et le démarrage automatiquement via les commandes configurées dans leur dashboard ou
leur fichier de configuration.

Configuration recommandée :

| Étape         | Commande                                                    |
|---------------|-------------------------------------------------------------|
| Build command | `npm ci --omit=dev && npx prisma generate && npm run build` |
| Start command | `npx prisma migrate deploy && npm run start:prod`           |

`migrate deploy` est placé dans la start command plutôt que dans le build command pour s'exécuter après que la variable
`DATABASE_URL` soit disponible dans l'environnement d'exécution, et pour garantir que les migrations précèdent toujours
le démarrage du processus.

---

## Rollback

### Rollback applicatif

Redéployer le commit précédent via la plateforme d'hébergement (re-trigger du dernier déploiement stable).

Si le rollback implique une version du code incompatible avec le schéma actuel de la base (ex. une migration a été
appliquée), voir la section rollback de migration ci-dessous.

### Rollback de migration

Prisma ne génère pas de migration de rollback automatique. La procédure est la suivante :

1. Écrire manuellement un fichier SQL d'annulation des changements introduits par la migration fautive.
2. L'exécuter directement sur la base de production via un client PostgreSQL.
3. Supprimer l'entrée correspondante dans la table `_prisma_migrations` pour que Prisma ne considère plus la migration
   comme appliquée.
4. Redéployer la version du code compatible avec l'état restauré du schéma.

**Cette procédure est manuelle et risquée.** La meilleure protection est de tester les migrations sur un environnement
de staging avant de les appliquer en production.

---

## Checklist avant mise en production

- [ ] Le CI passe entièrement sur le commit à déployer.
- [ ] `DATABASE_URL` pointe vers la base de production, pas vers une base de développement ou de test.
- [ ] `FRONTEND_ORIGIN` correspond au domaine réel du frontend déployé.
- [ ] `NODE_ENV` est défini à `production`.
- [ ] `prisma migrate deploy` a été exécuté et s'est terminé sans erreur.
- [ ] `GET /api/v1/health` retourne `200` avec `database: "up"` après le démarrage.
- [ ] Les logs du démarrage sont en JSON structuré (vérifiable dans le dashboard de la plateforme).

---

## Limites connues

- Pas d'environnement de staging documenté : les migrations sont testées directement en production. À corriger avant un
  passage à une charge significative.
- Pas de politique de backup automatique de la base de données documentée (voir `docs/BACKUP.md`).
- Pas de mécanisme de migration zero-downtime : l'application est indisponible pendant la durée de
  `prisma migrate deploy` si la migration est longue.