# Guide de contribution - Frontend NORIA

Merci de vouloir contribuer au frontend de NORIA. Ce document décrit le workflow attendu, les conventions de commit, les
règles de revue de code et les critères qu'une pull request doit remplir avant fusion.

Pour la mise en route technique (installation, scripts, structure des dossiers), voir `README.md` et
`docs/DEVELOPMENT.md`. Pour comprendre les choix d'architecture avant de proposer un changement structurel, voir
`docs/ARCHITECTURE.md`.

---

## 1. Avant de commencer

- Vérifiez qu'une issue ou une discussion existe déjà pour le changement envisagé. Pour un changement mineur (typo,
  petit correctif), une pull request directe suffit.
- Pour un changement structurel (nouvelle dépendance, changement d'architecture, nouvelle convention), ouvrez d'abord
  une discussion avant d'investir du temps dans l'implémentation.
- Assurez-vous que l'application tourne localement (`npm run dev`) et que la suite de tests passe (`npm test`) avant de
  commencer à modifier quoi que ce soit - cela évite de confondre un problème préexistant avec une régression introduite
  par votre changement.

---

## 2. Branches

- Une branche principale (`main`), pas de branche de développement intermédiaire.
- Une branche courte par fonctionnalité ou correctif, créée depuis `main` :
  ```

feature/nom-court-descriptif
fix/nom-court-descriptif
chore/nom-court-descriptif

  ```
- Une branche reste dédiée à un seul sujet. Si vous découvrez un problème sans rapport en cours de route, ouvrez une branche et une pull request séparées plutôt que de tout mélanger.

---

## 3. Commits

- Les messages de commit sont rédigés en français, de façon cohérente avec le reste du projet.
- Un commit décrit une **intention**, pas un journal ligne à ligne des fichiers modifiés.

  Bon exemple :
  ```

Ajoute la persistance de la progression du questionnaire dans localStorage

  ```

  À éviter :
  ```

wip
fix
modif QuestionCard.tsx et useDiagnosticWizard.ts

  ```

- Préférez plusieurs commits courts et cohérents à un unique commit massif, sans pour autant fragmenter à l'excès (un commit par fichier n'a pas de sens si le changement forme un tout logique).
- Ne committez jamais de secret, de fichier `.env`, ni de rapport de couverture (`coverage/`).

---

## 4. Style de code

Résumé des règles principales (détail complet dans `docs/DEVELOPMENT.md`, section conventions) :

- Identifiants techniques (fichiers, composants, fonctions, variables) en anglais.
- Textes visibles par l'utilisateur et commentaires de code en français.
- `PascalCase` pour les composants React, `camelCase` pour les fonctions et variables.
- Aucun texte métier (question, recommandation, libellé de niveau) en dur dans un composant : ces contenus proviennent toujours de l'API.
- Aucun accès direct à `fetch` ou `localStorage` en dehors de `lib/api/diagnosticApi.ts` et `lib/storage/diagnosticStorage.ts`.
- Pas de `any` sans commentaire justifiant explicitement pourquoi.
- Pas de bibliothèque de state global ajoutée sans discussion préalable - le parcours actuel est volontairement porté par un seul hook.

Le lint (`npm run lint`) et le typecheck (`npm run typecheck`) font foi en cas de doute sur le formatage ou le typage.

---

## 5. Tests

Toute contribution qui modifie un comportement observable doit être accompagnée d'un test qui aurait échoué avant le changement.

- Les tests vivent dans `test/`, en miroir exact de l'arborescence de `app/` (voir `docs/DEVELOPMENT.md`, section 4). N'ajoutez jamais de fichier de test dans `app/`.
- Un nouveau composant, hook, ou module dans `app/lib/` doit avoir un test correspondant créé dans la même pull request, pas dans une pull request de suivi.
- Un correctif de bug doit inclure un test reproduisant le bug avant correction.
- N'ajoutez pas de test qui ne protège rien de réel (par exemple, vérifier le rendu exact d'une valeur CSS n'apporte pas de valeur ici) - privilégiez les tests de comportement observable par l'utilisateur ou par les couches consommatrices.

Avant d'ouvrir la pull request :

```bash
npm run typecheck
npm run lint
npm test
```

Ce sont exactement les vérifications exécutées par le pipeline CI ; les faire passer localement d'abord évite des
allers-retours inutiles.

---

## 6. Ouvrir une pull request

Une pull request doit :

- Avoir un titre clair décrivant le changement en une phrase, en français.
- Décrire dans le corps : le problème résolu ou la fonctionnalité ajoutée, et comment le changement a été testé.
- Rester focalisée sur un seul sujet. Une pull request qui mélange un refactor et une nouvelle fonctionnalité est plus
  difficile à relire et à revenir en arrière si besoin - scindez-la si possible.
- Passer tous les checks du pipeline CI (`typecheck`, `lint`, tests, build) avant d'être considérée pour la revue.
- Cibler `main`, jamais une autre branche de fonctionnalité.

Checklist avant ouverture (reprise de `docs/DEVELOPMENT.md`) :

- [ ] `npm run typecheck` passe sans erreur.
- [ ] `npm run lint` passe sans erreur.
- [ ] `npm test` passe, y compris les nouveaux tests ajoutés.
- [ ] Aucun accès direct à `fetch` ou `localStorage` ajouté en dehors des modules dédiés.
- [ ] Aucun texte métier ajouté en dur dans un composant.
- [ ] Les textes utilisateur et commentaires sont en français, les identifiants techniques en anglais.
- [ ] Le test correspondant a été ajouté ou mis à jour si un comportement a changé.

---

## 7. Revue de code

Pour la personne qui relit :

- Vérifier que le changement respecte les couches définies dans `docs/ARCHITECTURE.md` (un composant d'affichage ne doit
  pas appeler l'API directement, par exemple).
- Vérifier que le test ajouté échouerait réellement sans le changement de code (un test qui passe même sans le correctif
  ne prouve rien).
- Préférer des retours concrets et actionnables plutôt que des préférences de style déjà couvertes par le lint.
- Une pull request peut être fusionnée dès qu'une revue l'approuve et que la CI est verte ; pas de règle de double
  approbation obligatoire pour ce projet à ce stade.

Pour la personne qui contribue :

- Une pull request n'est pas une attaque personnelle. Un commentaire de revue porte sur le code, pas sur la personne qui
  l'a écrit.
- Si un retour de revue semble contredire une convention déjà en place, référez-vous à `docs/ARCHITECTURE.md` ou
  `docs/DEVELOPMENT.md` avant de trancher, plutôt que de débattre au cas par cas dans chaque pull request.

---

## 8. Ajouter une dépendance

Avant d'ajouter une nouvelle dépendance npm :

- Vérifiez qu'aucune fonction native ou utilitaire déjà présent (`cn()`, fonctions de `lib/utils/`) ne couvre déjà le
  besoin.
- Préférez une dépendance activement maintenue, avec une empreinte raisonnable sur la taille du bundle client.
- Documentez brièvement, dans la description de la pull request, pourquoi cette dépendance est nécessaire.
- N'ajoutez jamais de dépendance uniquement pour une fonctionnalité triviale que quelques lignes de code suffiraient à
  couvrir.

---

## 9. Signaler un problème sans le corriger soi-même

Si vous repérez un problème (bug, incohérence, dette technique) sans avoir le temps ou le contexte pour le corriger
immédiatement :

- Ouvrez une issue décrivant le problème, les étapes de reproduction si applicable, et l'impact observé.
- N'incluez jamais de donnée sensible dans une issue publique. Pour une faille de sécurité, suivez la procédure décrite
  dans `docs/SECURITY.md` plutôt que d'ouvrir une issue publique.

---

## 10. Questions

Pour toute question sur une convention non couverte par ce document, `docs/ARCHITECTURE.md` ou `docs/DEVELOPMENT.md`,
ouvrez une discussion plutôt que de trancher seul un point structurant - cela évite les divergences de convention entre
contributions successives.

```