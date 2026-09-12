# Sauvegarde et restauration

Ce document décrit la politique de sauvegarde de la base de données PostgreSQL du backend Noria, la procédure de
restauration, et son état actuel par rapport à un passage en production réelle.

---

## État actuel

**Aucune politique de sauvegarde automatisée et testée n'est en place à ce jour.** Ce document sert de référence pour la
mise en œuvre, pas de constat qu'elle existe déjà. Tant que les points de la checklist en fin de document ne sont pas
cochés, la base de production n'est pas considérée comme protégée contre une perte de données.

Cette lacune est référencée comme limite connue dans `docs/DEPLOYMENT.md`.

---

## Pourquoi une politique de sauvegarde est nécessaire

Le schéma actuel ne contient aucune donnée personnelle identifiante (voir `docs/SECURITY.md`), mais la base contient
l'historique des soumissions de diagnostic, qui a une valeur métier directe : statistiques d'usage, données de suivi
produit, et continuité du service pour `GET /diagnostics/:id`. Une perte de la base sans sauvegarde signifie une perte
définitive de cet historique, sans possibilité de reconstruction.

---

## Ce qui doit être sauvegardé

| Élément                                            | Nécessaire               | Justification                                                                                                      |
|----------------------------------------------------|--------------------------|--------------------------------------------------------------------------------------------------------------------|
| Table `diagnostic_submission` et données associées | Oui                      | Seule donnée métier persistée par l'application                                                                    |
| Table `_prisma_migrations`                         | Oui                      | Nécessaire pour reconstruire un état cohérent avec l'historique de migration                                       |
| Fichiers de code source                            | Non - couvert par Git    | Le dépôt Git est la source de vérité du code, indépendant de la base                                               |
| Variables d'environnement / secrets                | Non - couvert séparément | Doivent être sauvegardés via le coffre-fort de secrets de la plateforme d'hébergement, jamais dans un dump de base |

---

## Stratégie recommandée

### Sauvegardes automatiques de la plateforme managée

La majorité des hébergeurs PostgreSQL managés (Railway, Render, Neon, Supabase, RDS) proposent des sauvegardes
automatiques quotidiennes avec une rétention configurable. C'est le mécanisme à activer en priorité : il ne demande
aucun code applicatif et couvre le cas de restauration le plus fréquent (erreur humaine, corruption, incident
infrastructure).

**Configuration minimale recommandée :**

| Paramètre | Valeur recommandée                                            |
|-----------|---------------------------------------------------------------|
| Fréquence | Quotidienne                                                   |
| Rétention | 7 jours minimum, 30 jours si le volume de stockage le permet  |
| Type      | Sauvegarde complète (full backup), pas seulement incrémentale |

### Sauvegarde applicative de secours (`pg_dump`)

En complément des sauvegardes de la plateforme, un `pg_dump` planifié offre une portabilité indépendante de
l'hébergeur - utile en cas de migration vers un autre fournisseur ou de défaillance de la plateforme elle-même.

```bash
pg_dump "$DATABASE_URL" --format=custom --file="backup-$(date +%Y%m%d-%H%M%S).dump"
```

- `--format=custom` produit un fichier compressé, restaurable sélectivement (table par table si besoin) via
  `pg_restore`.
- Le fichier généré doit être transféré vers un stockage distinct de la base source (bucket object storage type S3,
  jamais sur le même disque que l'application).

Ce dump peut être exécuté par une tâche planifiée (cron sur un petit worker, GitHub Actions scheduled workflow, ou tâche
planifiée de la plateforme d'hébergement).

---

## Procédure de restauration

### Depuis une sauvegarde de la plateforme managée

1. Depuis le dashboard de l'hébergeur, sélectionner le point de restauration voulu.
2. Restaurer vers une **nouvelle instance** plutôt que d'écraser l'instance de production existante, pour permettre une
   vérification avant bascule.
3. Mettre à jour `DATABASE_URL` pour pointer vers l'instance restaurée une fois la vérification faite.
4. Exécuter `npx prisma migrate deploy` sur l'instance restaurée si des migrations ont été appliquées après le point de
   sauvegarde.

### Depuis un dump `pg_dump`

```bash
pg_restore --clean --if-exists --dbname="$DATABASE_URL" backup-20260101-020000.dump
```

- `--clean --if-exists` supprime les objets existants avant de les recréer, pour éviter les conflits si la base cible
  n'est pas vide.
- Exécuter systématiquement sur une base de vérification avant toute restauration en production.

---

## Test de restauration

Une sauvegarde qui n'a jamais été restaurée avec succès n'est pas une garantie. Une procédure de restauration doit être
testée périodiquement sur un environnement isolé, pas seulement écrite.

| Fréquence recommandée                   | Action                                                                                                                                                         |
|-----------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Trimestrielle                           | Restaurer la dernière sauvegarde vers une base de test et vérifier l'intégrité des données (nombre de lignes, requête de contrôle sur `diagnostic_submission`) |
| Après toute migration de schéma majeure | Vérifier qu'une sauvegarde antérieure à la migration reste restaurable et compatible avec la procédure documentée                                              |

---

## Rétention et conformité

Aucune politique de rétention ou de suppression des sauvegardes anciennes n'est définie au-delà de la fenêtre de
rétention de la plateforme managée. Si une contrainte réglementaire impose une durée de conservation maximale des
données (voir la politique de rétention à définir dans `docs/SECURITY.md`), les sauvegardes doivent suivre la même
contrainte : conserver une soumission indéfiniment dans une sauvegarde alors qu'elle a été supprimée de la base active
contournerait la politique de rétention.

---

## Checklist de mise en œuvre

- [ ] Sauvegardes automatiques quotidiennes activées sur la plateforme d'hébergement de la base de production.
- [ ] Rétention configurée à au moins 7 jours.
- [ ] Sauvegarde `pg_dump` planifiée vers un stockage indépendant de l'hébergeur de la base.
- [ ] Une restauration complète a été testée avec succès sur un environnement isolé.
- [ ] La procédure de restauration est connue d'au moins deux personnes de l'équipe, pas d'une seule.
- [ ] La politique de rétention des sauvegardes est alignée avec la politique de rétention des données définie dans
  `docs/SECURITY.md`.

Tant que cette checklist n'est pas entièrement cochée, considérer la base de production comme non protégée contre une
perte de données.