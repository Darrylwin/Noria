# Releasing - NORIA

Ce document décrit comment produire une release pour l'une des deux applications du monorepo. Les deux applications sont
versionnées **indépendamment**, avec des tags Git distincts et des pipelines de release séparés (
`.github/workflows/backend-release.yml`, `.github/workflows/frontend-release.yml`).

Il n'existe pas de version unique « NORIA vX.Y.Z » : le backend et le frontend évoluent et se releasent séparément,
cohérent avec le principe d'indépendance des deux applications déjà posé dans `docs/CONTRIBUTING.md`.

---

## 1. Principe

Chaque application est associée à un préfixe de tag Git distinct :

| Application | Préfixe de tag | Workflow déclenché                       |
|-------------|----------------|------------------------------------------|
| `backend/`  | `backend-v*`   | `.github/workflows/backend-release.yml`  |
| `frontend/` | `frontend-v*`  | `.github/workflows/frontend-release.yml` |

Pousser un tag correspondant sur `main` déclenche automatiquement :

1. La suite de tests complète de l'application concernée (les mêmes vérifications que la CI classique - voir
   `docs/CONTRIBUTING.md`, section 6).
2. Si les tests passent, la création d'une **GitHub Release** portant le nom du tag, avec un corps de release généré
   automatiquement.

**Aucune release n'est créée si les tests échouent** : le job `release` dépend explicitement du job `test` dans les deux
workflows (`needs: test`).

---

## 2. Format de version

Le versionnement suit [Semantic Versioning](https://semver.org/lang/fr/) (`MAJOR.MINOR.PATCH`) :

- **MAJOR** : changement incompatible du contrat d'API (backend) ou changement de comportement majeur visible
  utilisateur (frontend).
- **MINOR** : ajout de fonctionnalité rétrocompatible.
- **PATCH** : correctif de bug, sans changement de comportement attendu.

Format exact du tag :

```
backend-v1.2.0
frontend-v1.2.0
```

Le préfixe (`backend-` ou `frontend-`) est **obligatoire** et discriminant : c'est lui qui détermine quel workflow se
déclenche (`on.push.tags` dans chaque fichier YAML). Un tag mal préfixé ne déclenchera aucun pipeline.

---

## 3. Procédure de release

### Étape 1 - Vérifier l'état de `main`

Avant de tagger, s'assurer que :

- `main` est à jour localement (`git pull`).
- Les deux pipelines CI classiques (`backend-ci-cd.yml`, `frontend-ci-cd.yml`) sont verts sur le dernier commit de
  `main` concerné par la release.
- Toutes les pull requests destinées à cette release sont déjà fusionnées.

### Étape 2 - Mettre à jour la version dans `package.json`

Le numéro de version du tag doit correspondre au champ `version` du `package.json` de l'application concernée. Ce point
n'est **pas vérifié automatiquement par le pipeline** : c'est une responsabilité manuelle à ne jamais oublier.

```bash
# Exemple pour une release backend en 1.2.0
cd backend
npm version 1.2.0 --no-git-tag-version
git add package.json package-lock.json
git commit -m "Prépare la release backend v1.2.0"
git push origin main
```

`npm version --no-git-tag-version` met à jour `package.json` et `package-lock.json` sans créer de tag Git
automatiquement - le tag est créé explicitement à l'étape suivante, avec le bon préfixe.

### Étape 3 - Créer et pousser le tag

```bash
# Depuis la racine du dépôt, sur main à jour
git tag backend-v1.2.0
git push origin backend-v1.2.0
```

Le push du tag déclenche immédiatement `.github/workflows/backend-release.yml` sur GitHub Actions.

### Étape 4 - Vérifier la release produite

1. Suivre l'exécution du workflow dans l'onglet **Actions** du dépôt GitHub.
2. Une fois le job `release` terminé avec succès, vérifier l'onglet **Releases** : une nouvelle release `backend-v1.2.0`
   doit apparaître, marquée `Latest` si c'est la plus récente pour cette application.
3. Vérifier que le corps de la release mentionne bien la bonne version (extraite automatiquement du nom du tag par le
   workflow).

La procédure est strictement identique pour le frontend, en remplaçant `backend` par `frontend` à chaque étape.

---

## 4. Exemple complet - release frontend

```bash
git checkout main
git pull

cd frontend
npm version 2.0.0 --no-git-tag-version
git add package.json package-lock.json
git commit -m "Prépare la release frontend v2.0.0"
git push origin main

cd ..
git tag frontend-v2.0.0
git push origin frontend-v2.0.0
```

---

## 5. Ce que le pipeline de release ne fait pas

Pour être explicite sur les limites du mécanisme actuel :

- **Il ne build ni ne publie d'image Docker** vers un registre (Docker Hub, GHCR, etc.). Seuls les tests sont rejoués ;
  la construction et la publication d'image restent manuelles ou à intégrer séparément si un déploiement automatisé est
  mis en place.
- **Il ne déploie rien** en environnement de production ou de staging. La release GitHub est un marqueur de version et
  un point de restauration possible, pas un déclencheur de déploiement.
- **Il ne vérifie pas** que le `package.json.version` correspond effectivement au tag poussé - voir l'avertissement de
  l'étape 2.
- **Il ne génère pas de changelog détaillé** : le corps de la release est un texte générique mentionnant le tag et
  l'application concernée, pas un résumé automatique des commits inclus. Pour un historique de version plus riche, voir
  la section « Évolution possible » ci-dessous.

---

## 6. Rollback d'une release

Une release GitHub n'a pas d'effet applicatif direct (pas de déploiement associé dans ce projet) : « annuler » une
release consiste simplement à :

1. Supprimer la release depuis l'onglet **Releases** de GitHub, si elle a été créée par erreur.
2. Supprimer le tag correspondant, localement et sur le remote :

```bash
git tag -d backend-v1.2.0
git push origin :refs/tags/backend-v1.2.0
```

Si une version défectueuse a déjà été déployée manuellement à partir de cette release, se référer à la procédure de
rollback applicatif décrite dans `backend/docs/DEPLOYMENT.md`.

---

## 7. Évolution possible

Ce mécanisme de release est volontairement simple, proportionné à un prototype issu d'un exercice de sélection
technique. Une évolution naturelle, non implémentée à ce stade, consisterait à :

- Générer automatiquement le corps de la release à partir des commits conventionnels (`Conventional Commits` +
  `release-please` ou équivalent).
- Construire et publier automatiquement l'image Docker de l'application taguée vers un registre, à la suite du job
  `release`.
- Vérifier en CI que le tag poussé correspond exactement à `package.json.version`, pour éliminer le risque d'erreur
  manuelle de l'étape 2.