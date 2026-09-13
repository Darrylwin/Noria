# Contributing - NORIA

Guide de contribution au niveau du monorepo. Ce document couvre ce qui est commun aux deux applications (`backend/`,
`frontend/`) et la façon dont elles s'articulent. Pour les conventions propres à chaque application (nommage détaillé,
structure interne, tâches courantes), voir :

- [`backend/docs/CONTRIBUTING.md`](../backend/docs/CONTRIBUTING.md)
- [`frontend/docs/CONTRIBUTING.md`](../frontend/docs/CONTRIBUTING.md)

Ce document ne les duplique pas : il sert de point d'entrée et couvre uniquement ce qui concerne le dépôt dans son
ensemble.

---

## 1. Organisation du dépôt

NORIA est un **monorepo à deux applications indépendantes**, sans package partagé :

```
.
├── backend/     # API NestJS - a son propre package.json, CI, Dockerfile
├── frontend/    # Application Next.js - a son propre package.json, CI, Dockerfile
├── docker-compose.yml   # Orchestration racine (les deux applications ensemble)
└── .github/workflows/   # Un pipeline CI/CD par application
```

Chaque application se développe, se teste, se lint et se déploie **indépendamment**. Il n'existe volontairement aucun
outil de build multi-projet (pas de Turborepo, pas de workspaces npm partagés) : la coordination entre les deux
applications se limite au contrat d'API HTTP qu'elles échangent, documenté dans `backend/docs/API_GUIDELINES.md`.

**Règle centrale à ne jamais enfreindre** : aucun package ou module n'est partagé entre `backend/` et `frontend/`. Les
types, enums et DTOs sont dupliqués manuellement de part et d'autre. Si une tâche semble justifier l'introduction d'un
package partagé, ouvrez une discussion avant de le faire - c'est une décision structurante qui a été explicitement
écartée à la conception du projet (voir README racine, section Choix techniques).

---

## 2. Avant de commencer

- Lisez le README racine et le README de l'application que vous allez modifier.
- Si le changement touche au contrat entre les deux applications (un champ de DTO, une route, un enum), lisez
  `backend/docs/API_GUIDELINES.md` en premier : c'est la source de vérité du contrat, il ne doit jamais diverger
  silencieusement entre les deux applications.
- Vérifiez que les deux applications démarrent localement et que leurs suites de tests passent avant de commencer à
  modifier quoi que ce soit - cela évite de confondre un problème préexistant avec une régression que vous auriez
  introduite.

---

## 3. Quelle application dois-je modifier ?

| Je veux...                                                            | J'interviens dans...                                                                                                       |
|-----------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------|
| Modifier une règle de scoring, une recommandation, un seuil           | `backend/` uniquement - voir `backend/docs/BUSINESS_RULES.md`                                                              |
| Ajouter ou modifier une question du catalogue                         | `backend/` (`domain/questions.catalog.ts`), puis vérifier la synchronisation des enums côté `frontend/` (`app/lib/enums/`) |
| Ajouter un endpoint ou modifier une réponse d'API                     | `backend/`, avec mise à jour immédiate de `backend/docs/API_GUIDELINES.md` **avant** d'écrire le code                      |
| Modifier un écran, un composant, une animation                        | `frontend/` uniquement                                                                                                     |
| Modifier le texte d'un bouton ou un message d'erreur réseau générique | `frontend/` (ces textes n'ont pas de lien avec les règles métier, ce sont les seuls textes autorisés en dur côté frontend) |
| Modifier un texte de recommandation ou de niveau de maturité          | `backend/` (`domain/content.fr.ts`) - jamais côté frontend                                                                 |
| Modifier la conteneurisation ou l'orchestration complète              | racine (`docker-compose.yml`) et/ou `backend/Dockerfile` / `frontend/Dockerfile` selon le cas                              |
| Modifier un pipeline CI/CD                                            | `.github/workflows/<app>-ci-cd.yml` correspondant                                                                          |

Une pull request qui touche aux deux applications à la fois doit rester **exceptionnelle** et bien justifiée (
typiquement : une évolution du contrat d'API). Dans ce cas, la pull request doit modifier `backend/` et `frontend/` de
façon cohérente dans le même changement, jamais en deux étapes qui laisseraient le contrat temporairement rompu sur
`main`.

---

## 4. Workflow Git

### Branches

- `main` : branche stable, toujours déployable pour les deux applications simultanément.
- Une branche courte par sujet, nommée explicitement, préfixée selon le type de changement :

```bash
git checkout -b feat/add-funding-question
git checkout -b fix/scoring-tie-break
git checkout -b chore/update-docker-compose
```

- Une branche reste dédiée à un seul sujet. Un refactor et une nouvelle fonctionnalité ne se mélangent jamais dans la
  même branche, même si les deux touchent le même fichier.

### Commits

Les messages de commit sont rédigés en français, de façon cohérente sur tout le dépôt, et décrivent une **intention**,
pas un contenu ligne à ligne.

```bash
# Bien
git commit -m "Ajoute la question Q11 sur la gestion de trésorerie (dimension Finance)"
git commit -m "Corrige le tie-break de l'axe d'amélioration en cas d'égalité stricte"

# À éviter
git commit -m "wip"
git commit -m "fix"
git commit -m "update files"
```

Aucun commit ne doit jamais contenir : un secret, un fichier `.env`, un rapport de couverture (`coverage/`), ou un
artefact de build (`dist/`, `.next/`).

### Pull requests

Une pull request doit :

- Avoir un titre clair, en français, décrivant le changement en une phrase.
- Rester focalisée sur un seul sujet.
- Cibler `main`, jamais une autre branche de fonctionnalité.
- Passer les pipelines CI/CD des applications concernées avant d'être considérée pour revue (voir section 6).
- Indiquer explicitement, dans sa description, si elle touche `backend/`, `frontend/`, ou les deux.

Checklist minimale avant ouverture :

- [ ] Les tests de l'application modifiée passent (`npm test`).
- [ ] Le lint de l'application modifiée passe (`npm run lint`).
- [ ] Le typecheck passe (`npm run typecheck`).
- [ ] Si le contrat d'API a changé, `backend/docs/API_GUIDELINES.md` est à jour dans la même pull request.
- [ ] Si un texte utilisateur a changé côté backend, aucun fichier frontend n'a été modifié pour le même besoin (voir
  section 3).
- [ ] Aucun secret ni fichier d'environnement réel n'a été ajouté.

---

## 5. Revue de code

Pour la personne qui relit :

- Vérifier que le changement respecte la séparation des couches définie dans `backend/docs/ARCHITECTURE.md` et
  `frontend/docs/ARCHITECTURE.md` (le domaine métier backend ne doit jamais dépendre de NestJS ou Prisma ; un composant
  frontend ne doit jamais recalculer une règle métier).
- Vérifier qu'un test a été ajouté ou mis à jour pour tout changement de comportement observable, et qu'il aurait échoué
  sans le correctif.
- Vérifier qu'aucun terme technique interne au moteur de scoring (« cascade », « plafonnement », « score brut ») n'a été
  introduit dans un texte visible par l'utilisateur final.
- Préférer des retours concrets et actionnables aux préférences de style déjà couvertes par le lint.

Pour la personne qui contribue :

- Une pull request n'est pas une attaque personnelle. Un commentaire de revue porte sur le code, pas sur la personne qui
  l'a écrit.
- En cas de désaccord sur une convention déjà en place, se référer aux documents d'architecture avant de trancher au cas
  par cas dans chaque pull request.

Ce projet ne requiert pas de double approbation obligatoire : une pull request peut être fusionnée dès qu'une revue l'
approuve et que la CI correspondante est verte.

---

## 6. Intégration continue

Chaque application dispose de son propre pipeline, déclenché uniquement lorsque des fichiers de son propre dossier
changent (`paths: backend/**` ou `paths: frontend/**`), pour éviter de relancer inutilement les tests d'une application
non modifiée :

- `.github/workflows/backend-ci-cd.yml` : installation, migrations Prisma, typecheck, lint, tests avec couverture.
- `.github/workflows/frontend-ci-cd.yml` : installation, typecheck, lint, tests avec couverture, build Next.js.

Aucune fusion sur `main` n'est acceptée si le pipeline correspondant échoue. Un changement touchant les deux
applications doit voir les deux pipelines passer avant fusion.

---

## 7. Conventions communes aux deux applications

Bien que chaque application ait ses propres conventions de nommage détaillées, certaines règles s'appliquent partout
dans le dépôt :

- **Identifiants techniques en anglais** (fichiers, classes, fonctions, variables, enums, routes), **contenus
  utilisateur et commentaires de code en français**, de façon cohérente sur tout le dépôt.
- Aucune valeur métier magique en dur dans le code (seuils, poids, formules) : toujours des constantes nommées,
  centralisées dans le domaine métier backend.
- Aucun `any` sans commentaire justifiant explicitement pourquoi le typage strict n'est pas possible à cet endroit.
- Un commentaire de code n'est légitime que s'il explique une règle métier, une contrainte technique ou une décision
  volontairement contre-intuitive - jamais une reformulation du nom de la fonction ou une description ligne à ligne.

---

## 8. Ajouter une dépendance

Avant d'ajouter une dépendance npm, dans l'une ou l'autre application :

- Vérifier qu'aucune fonction native ou utilitaire déjà présent ne couvre déjà le besoin.
- Préférer une dépendance activement maintenue, avec une empreinte raisonnable sur la taille du bundle (frontend) ou de
  l'image (backend).
- Documenter brièvement, dans la description de la pull request, pourquoi cette dépendance est nécessaire.
- Ne jamais ajouter de dépendance pour une fonctionnalité triviale que quelques lignes de code suffiraient à couvrir.

---

## 9. Signaler un problème sans le corriger soi-même

- Pour un bug ou une incohérence non sensible : ouvrir une issue décrivant le problème, les étapes de reproduction, et
  l'impact observé, en précisant l'application concernée (`backend` ou `frontend`) dans le titre.
- Pour une faille de sécurité : ne jamais ouvrir d'issue publique, suivre la procédure décrite dans [
  `docs/SECURITY.md`](./SECURITY.md).

---

## 10. Questions

Pour toute question sur une convention non couverte par ce document ou par les guides d'architecture de chaque
application, ouvrez une discussion plutôt que de trancher seul un point structurant - cela évite les divergences de
convention entre contributions successives sur les deux applications.