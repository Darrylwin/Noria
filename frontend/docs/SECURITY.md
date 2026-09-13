# Politique de sécurité - Frontend NORIA

Ce document couvre les aspects sécurité spécifiques à l'application frontend (Next.js). Pour la sécurité côté API (
validation des DTOs, rate limiting, CORS, etc.), voir `backend/docs/SECURITY.md`.

Le diagnostic est un outil public, sans authentification, ne collectant aucune donnée personnelle identifiante. Le
périmètre de risque du frontend est donc volontairement restreint, mais
les principes ci-dessous restent non négociables.

---

## 1. Périmètre et hypothèses

- Aucune authentification, aucun compte utilisateur.
- Aucune donnée personnelle identifiante n'est saisie ni affichée (pas de nom d'entreprise, pas d'email, pas de nom
  d'utilisateur).
- Les seules données manipulées côté client sont : les réponses au questionnaire (10 codes d'énumération), l'index de
  progression, et le résultat du diagnostic (scores, textes de recommandation) reçu depuis l'API.
- Le frontend ne recalcule jamais de règle métier (scoring, seuils, plafonnement) : il affiche uniquement ce que l'API
  lui fournit déjà interprété. Cela élimine toute possibilité de manipulation du résultat côté client ayant un effet sur
  ce qui est réellement persisté en base.

---

## 2. Secrets et variables d'environnement

- Aucun secret (clé API, jeton, identifiant de connexion) n'est utilisé par le frontend. La seule variable
  d'environnement est `NEXT_PUBLIC_API_URL`, qui est une URL publique par nature.
- **Rappel important** : toute variable préfixée `NEXT_PUBLIC_*` est inlinée dans le bundle JavaScript envoyé au
  navigateur, au moment du build. Elle est donc visible par n'importe qui inspectant le code source livré. **Aucune
  valeur sensible ne doit jamais être placée derrière un préfixe `NEXT_PUBLIC_*`.**
- `.env` est ignoré par Git (`.gitignore`), seul `.env.example` est versionné, sans valeur réelle.
- Aucun secret n'est journalisé, ni côté build (logs CI), ni côté runtime (console navigateur).

---

## 3. Données stockées côté client

- `lib/storage/diagnosticStorage.ts` est le seul point d'accès à `localStorage` dans tout le frontend. Aucun autre
  module n'accède directement au stockage navigateur.
- Le contenu stocké (réponses au questionnaire, index de progression, horodatage) ne contient aucune donnée sensible ou
  identifiante. Un accès à ce stockage par un tiers (extension malveillante, script XSS) n'exposerait rien d'exploitable
  au-delà des réponses au questionnaire lui-même.
- Le cache est supprimé automatiquement après une soumission réussie et lors d'une réinitialisation explicite (« Refaire
  le diagnostic »), limitant sa durée de vie sur la machine de l'utilisateur.
- Aucune donnée n'est stockée dans `sessionStorage`, `IndexedDB`, ou un cookie non-HttpOnly pour ce prototype.

---

## 4. Prévention des injections côté client (XSS)

- Aucun usage de `dangerouslySetInnerHTML` dans le code applicatif. Tout le contenu textuel (questions, options,
  recommandations, textes de niveau) transite par le rendu JSX standard de React, qui échappe automatiquement le contenu
  affiché.
- Les textes affichés proviennent de l'API backend (`GET /questions`, `POST /diagnostics`, `GET /diagnostics/:id`), qui
  est elle-même la source de vérité des contenus. Le frontend ne construit
  dynamiquement aucun fragment HTML à partir d'une entrée utilisateur libre : les seules entrées utilisateur sont des
  sélections parmi des options prédéfinies (boutons radio), jamais du texte libre.
- Si une future évolution introduit un champ de texte libre, ce document devra être mis à jour pour couvrir l'échappement et la validation associés.

---

## 5. En-têtes de sécurité HTTP

Recommandations à appliquer au niveau de la plateforme d'hébergement ou via `next.config.ts` (`headers()`) :

| En-tête                   | Valeur recommandée                  | Objectif                                                                                |
|---------------------------|-------------------------------------|-----------------------------------------------------------------------------------------|
| `X-Content-Type-Options`  | `nosniff`                           | Empêche le navigateur de deviner un type MIME différent du déclaré                      |
| `X-Frame-Options`         | `DENY`                              | Empêche l'intégration de l'application dans une iframe tierce (clickjacking)            |
| `Referrer-Policy`         | `strict-origin-when-cross-origin`   | Limite les informations envoyées dans l'en-tête `Referer` lors de navigations sortantes |
| `Content-Security-Policy` | à définir selon l'hébergement final | Limite les origines autorisées à charger des scripts, styles, images                    |

Ces en-têtes ne sont pas encore configurés dans `next.config.ts` à ce stade du prototype ; à ajouter avant tout passage
en production réelle.

---

## 6. Dépendances et supply chain

- Les dépendances sont figées via `package-lock.json`, installées en CI avec `npm ci` (jamais `npm install`) pour
  garantir une installation reproductible et éviter toute résolution de version imprévue.
- Un audit des dépendances (`npm audit`) doit être exécuté périodiquement, idéalement intégré au pipeline CI (
  `frontend-ci-cd.yml`) en tâche non bloquante dans un premier temps, puis bloquante sur les vulnérabilités critiques
  une fois le bruit initial trié.
- Toute dépendance ajoutée au projet doit avoir une justification claire (voir cahier des charges, section 21 sur les
  conventions) ; éviter d'ajouter une bibliothèque pour une fonctionnalité triviale qu'une fonction native ou quelques
  lignes de code suffiraient à couvrir.

---

## 7. Communication avec l'API

- Toutes les requêtes vers le backend transitent par `lib/api/diagnosticApi.ts`, point d'entrée unique, ce qui garantit
  un traitement homogène des erreurs et évite qu'un appel `fetch` ad hoc contourne la gestion d'erreur centralisée.
- Aucune information technique renvoyée par l'API (stack trace, détail de validation brut) n'est affichée telle quelle à
  l'utilisateur : `resolveErrorMessage` traduit systématiquement les codes HTTP (404, 429, 500, etc.) en messages
  français non techniques.
- Le frontend suppose que le CORS est correctement restreint côté API; il ne compense pas une éventuelle mauvaise configuration CORS côté serveur.
- Aucun jeton d'authentification n'est transmis, l'API étant publique et anonyme.

---

## 8. Limites connues et actions futures

- Aucun en-tête de sécurité HTTP n'est encore configuré explicitement dans `next.config.ts`; à traiter
  avant tout passage en production réelle.
- Aucun audit de dépendances automatisé n'est encore intégré au pipeline CI ;.
- Aucune politique de Content Security Policy stricte n'est définie, faute d'hébergement final connu à ce stade du
  prototype.
- Ces limites sont cohérentes avec le statut de prototype/démonstration du projet et ne bloquent pas l'usage pilote actuel, mais doivent être révisées avant tout usage
  en production avec un trafic réel.

---

## 9. Signalement d'une vulnérabilité

Si vous identifiez une faille de sécurité dans ce frontend :

1. Ne pas ouvrir d'issue publique décrivant la faille en détail.
2. Contacter l'équipe projet directement (canal interne ALODO TECH).
3. Fournir : la version concernée, les étapes de reproduction, et l'impact estimé.

Aucun programme de bug bounty n'est en place pour ce prototype.