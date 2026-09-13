# Guide de développement - Frontend NORIA

Ce document explique comment travailler efficacement sur le frontend au quotidien : mise en route, workflow de
développement, conventions de code, tâches courantes et pièges connus.

---

## 1. Mise en route rapide

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

L'application est servie sur [http://localhost:3000](http://localhost:3000). Le backend doit tourner en parallèle (voir
`../backend`) pour que le questionnaire puisse charger son catalogue de questions et soumettre des réponses.

Si vous ne travaillez que sur l'UI et n'avez pas besoin d'un backend réel, voir la
section [Travailler sans backend](#8-travailler-sans-backend).

---

## 2. Boucle de développement recommandée

1. Lancer `npm run dev` dans un terminal, `npm run test:watch` dans un autre. Les deux tournent en continu pendant le
   développement.
2. Écrire ou modifier le code dans `app/`.
3. Écrire le test correspondant dans `test/`, à l'emplacement miroir (voir section 4).
4. Avant de committer :
   ```bash
   npm run typecheck
   npm run lint
   npm test
   ```
   Ces trois commandes sont celles exécutées en CI ; les faire échouer localement d'abord évite un aller-retour inutile.

---

## 3. Structure des dossiers et où ajouter du code

| Je veux...                                             | Je modifie / j'ajoute dans...                                                |
|--------------------------------------------------------|------------------------------------------------------------------------------|
| Ajouter un écran                                       | `app/<segment>/page.tsx` (convention App Router de Next.js)                  |
| Ajouter un composant réutilisable générique            | `app/components/ui/`                                                         |
| Ajouter un composant spécifique au parcours diagnostic | `app/components/diagnostic/`                                                 |
| Ajouter un appel à l'API                               | `app/lib/api/diagnosticApi.ts` (jamais un `fetch` ailleurs)                  |
| Ajouter un type ou une interface partagée              | `app/lib/types/`                                                             |
| Ajouter un enum miroir du backend                      | `app/lib/enums/`                                                             |
| Ajouter une fonction utilitaire pure                   | `app/lib/utils/`                                                             |
| Modifier la logique de persistance locale              | `app/lib/storage/diagnosticStorage.ts` (seul point d'accès à `localStorage`) |
| Modifier l'orchestration du questionnaire              | `app/hooks/useDiagnosticWizard.ts`                                           |

Voir `docs/ARCHITECTURE.md` pour le détail des responsabilités de chaque couche et les flux de données.

---

## 4. Convention de test

Tous les tests vivent dans `test/`, avec une arborescence qui reflète celle de `app/` :

```
app/components/diagnostic/QuestionCard.tsx
  -> test/components/diagnostic/QuestionCard.test.tsx

app/lib/storage/diagnosticStorage.ts
  -> test/lib/storage/diagnosticStorage.test.ts

app/hooks/useDiagnosticWizard.ts
  -> test/hooks/useDiagnosticWizard.test.ts
```

Aucun fichier de test n'est co-localisé avec le code applicatif dans `app/`. Quand vous créez un nouveau fichier dans
`app/`, créez immédiatement le fichier de test miroir dans `test/`, même vide au départ.

Import à privilégier dans les tests : l'alias `@/` plutôt que des chemins relatifs profonds.

```typescript
import {QuestionCard} from "@/app/components/diagnostic/QuestionCard";
```

Commandes utiles :

```bash
npm test                 # une exécution complète
npm run test:watch       # relance à chaque sauvegarde
npm run test:cov         # avec rapport de couverture (dossier coverage/, non versionné)
```

---

## 5. Conventions de code

- **Nommage** : `PascalCase` pour les composants React (`QuestionCard.tsx`), `camelCase` pour les fonctions, variables
  et hooks (`useDiagnosticWizard.ts`), `kebab-case` uniquement pour les fichiers utilitaires non-composants si besoin (
  `dimension-meta.ts`).
- **Langue** : identifiants techniques en anglais, textes visibles par l'utilisateur et commentaires de code en
  français.
- **`"use client"`** : à ajouter uniquement sur les composants qui en ont réellement besoin (state, effets,
  interactivité, animation). Un composant purement présentationnel sans hook ni interaction reste un Server Component
  par défaut.
- **Pas de texte métier en dur** : les libellés de questions, options, recommandations et niveaux de maturité
  proviennent toujours de l'API. Un composant ne doit jamais contenir une chaîne comme `"Structuration en cours"` en
  dur - si vous voyez ce cas, c'est un signal que la donnée devrait venir des props ou de l'API.
- **Pas d'accès direct à `fetch` ou `localStorage`** en dehors de `lib/api/diagnosticApi.ts` et
  `lib/storage/diagnosticStorage.ts`. Voir `docs/ARCHITECTURE.md`, section 11.
- **`cn()` pour les classes conditionnelles** : utiliser l'utilitaire `app/lib/utils/cn.ts` (clsx + tailwind-merge)
  plutôt que de concaténer des chaînes de classes à la main.
- **Pas de `any`** sans commentaire justifiant explicitement pourquoi le typage strict n'est pas possible à cet endroit.

---

## 6. Tâches courantes

### Ajouter un nouveau composant d'affichage

1. Créer le fichier dans `app/components/diagnostic/` ou `app/components/ui/` selon qu'il est spécifique au domaine ou
   générique.
2. Typer strictement les props (pas de `any`, pas de props optionnelles non justifiées).
3. Créer le test miroir dans `test/components/...`.
4. Si le composant affiche une couleur ou un libellé lié à une dimension, réutiliser `DIMENSION_META` (
   `app/lib/utils/dimension-meta.ts`) plutôt que redéfinir localement une palette.

### Modifier le comportement du hook `useDiagnosticWizard`

1. Modifier `app/hooks/useDiagnosticWizard.ts`.
2. Mettre à jour `test/hooks/useDiagnosticWizard.test.ts` en conséquence - ce hook concentre la logique la plus sensible
   du frontend (navigation, persistance, soumission), toute modification doit être couverte par un test qui aurait
   échoué avant le changement.
3. Vérifier que le contrat exposé (`UseDiagnosticWizardResult`) reste cohérent avec ce que consomme
   `app/diagnostic/page.tsx`.

### Ajouter un nouvel endpoint consommé par le frontend

1. Ajouter la fonction dans `app/lib/api/diagnosticApi.ts`, en passant par `request<T>()`.
2. Ajouter le type de réponse correspondant dans `app/lib/types/diagnostic.ts` s'il n'existe pas déjà.
3. Ajouter un test dans `test/lib/api/diagnosticApi.test.ts` couvrant au minimum : le cas succès, un cas d'erreur HTTP
   pertinent, et le cas d'échec réseau.

### Modifier un texte d'interface générale (bouton, message d'erreur réseau)

Ces textes sont les seuls autorisés en dur côté frontend (ex. « Réessayer », messages de `resolveErrorMessage`).
Modifiez-les directement dans le composant ou dans `diagnosticApi.ts`, aucune centralisation supplémentaire n'est
requise pour ce type de texte.

---

## 7. Débogage courant

| Symptôme                                                         | Piste probable                                                                                                                                                                                                                   |
|------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Le questionnaire reste bloqué sur l'écran de chargement          | Le backend n'est pas démarré, ou `NEXT_PUBLIC_API_URL` pointe vers la mauvaise URL. Vérifier l'onglet réseau du navigateur.                                                                                                      |
| Une réponse ne se persiste pas après rechargement                | Vérifier que `localStorage` n'est pas désactivé (navigation privée) et que la clé `noria-diagnostic-progress` est bien présente dans les outils de développement du navigateur (onglet Application/Storage).                     |
| Un changement de `NEXT_PUBLIC_API_URL` n'a aucun effet           | Cette variable est inlinée au build, pas au runtime. Redémarrer `npm run dev`, ou reconstruire l'image Docker si en environnement conteneurisé.                                                                                  |
| Le composant animé (Framer Motion) ne s'anime pas dans les tests | Normal : jsdom ne calcule pas de mise en page réelle, les tests vérifient le rendu et le comportement, pas l'animation elle-même.                                                                                                |
| Un test échoue avec « ApiError » non reconnu                     | Vérifier l'origine exacte de l'import de `ApiError` utilisé dans le fichier testé - un import erroné depuis un module interne de Next.js au lieu de `lib/api/diagnosticApi` casse le comportement de détection d'erreur attendu. |

---

## 8. Travailler sans backend

Pour itérer rapidement sur l'UI sans dépendre d'un backend démarré, deux approches possibles selon le besoin :

- **Tests unitaires** : chaque composant se teste déjà en isolation avec des props statiques (voir `test/components/`),
  aucun backend n'est nécessaire pour ce niveau de développement.
- **Exploration manuelle dans le navigateur** : mocker temporairement `app/lib/api/diagnosticApi.ts` pour renvoyer des
  données statiques le temps de la session de travail, en veillant à ne jamais committer ce mock. Une alternative plus
  propre, si le besoin devient récurrent, serait d'introduire un mode `NEXT_PUBLIC_API_URL` pointant vers un serveur de
  mock local (non mis en place à ce jour).

---

## 9. Avant d'ouvrir une pull request

Checklist minimale :

- [ ] `npm run typecheck` passe sans erreur.
- [ ] `npm run lint` passe sans erreur.
- [ ] `npm test` passe, y compris les nouveaux tests ajoutés pour le changement.
- [ ] Aucun accès direct à `fetch` ou `localStorage` ajouté en dehors des modules dédiés.
- [ ] Aucun texte métier (question, recommandation, libellé de niveau) ajouté en dur dans un composant.
- [ ] Les textes visibles par l'utilisateur et les commentaires de code sont en français, les identifiants techniques en
  anglais.
- [ ] Si un composant ou un hook a changé de comportement, le test correspondant a été mis à jour ou ajouté.

---

## 10. Ressources complémentaires

- `docs/ARCHITECTURE.md` : détail des couches, flux de données et décisions de conception.
- `docs/SECURITY.md` : politique de sécurité spécifique au frontend.
- `README.md` : installation, scripts, structure générale du projet.