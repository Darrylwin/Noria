# Sécurité - NORIA

Ce document couvre la politique de sécurité au niveau du dépôt dans son ensemble : ce qui est commun aux deux
applications, la façon dont elles s'articulent en matière de sécurité, et comment signaler une vulnérabilité.

Pour le détail des mesures spécifiques à chaque application, voir :

- [`backend/docs/SECURITY.md`](../backend/docs/SECURITY.md) - validation des entrées, rate limiting, CORS, format
  d'erreur, secrets serveur
- [`frontend/docs/SECURITY.md`](../frontend/docs/SECURITY.md) - stockage client, prévention XSS, en-têtes HTTP,
  communication avec l'API

Ce document ne les duplique pas : il sert de vue d'ensemble et couvre uniquement ce qui concerne le dépôt entier ou l'
interaction entre les deux applications.

---

## 1. Périmètre et modèle de menace

NORIA est un **diagnostic public et anonyme**, sans authentification, sans compte utilisateur, sans donnée personnelle
identifiante collectée dans le périmètre actuel (pas de nom d'entreprise, pas d'email, pas d'identifiant utilisateur).

Le périmètre de risque est donc volontairement restreint, mais reste réel :

- Les données manipulées sont : 10 codes de réponse à énumération fermée, un score calculé, et des textes de
  recommandation prédéfinis.
- Aucune donnée financière réelle, aucun document, aucune information bancaire ne transite par le système.
- Le principal risque n'est pas la confidentialité d'une donnée sensible, mais **l'intégrité du calcul** (empêcher qu'un
  résultat affiché soit manipulable côté client) et **la disponibilité du service** (protection contre les abus
  triviaux).

Cette évaluation de risque conditionne les décisions de protection retenues ci-dessous et dans les documents détaillés
de chaque application.

---

## 2. Répartition des responsabilités entre les deux applications

| Aspect                                                | Responsable | Détail                                                                                     |
|-------------------------------------------------------|-------------|--------------------------------------------------------------------------------------------|
| Validation stricte du payload de soumission           | Backend     | `class-validator`, énumérations fermées par question, `whitelist` + `forbidNonWhitelisted` |
| Intégrité du calcul de score                          | Backend     | Le score n'est jamais calculé ni recalculé côté client, uniquement lu et affiché           |
| Rate limiting                                         | Backend     | 10 requêtes/minute/IP sur `POST /diagnostics`                                              |
| CORS                                                  | Backend     | Origine unique autorisée via `FRONTEND_ORIGIN`, jamais de wildcard                         |
| Limite de taille de payload                           | Backend     | 10 Ko sur `POST /diagnostics`                                                              |
| Format d'erreur uniforme, sans fuite technique        | Backend     | Aucune stack trace, requête SQL, ou détail Prisma jamais renvoyé au client                 |
| Stockage local de la progression                      | Frontend    | `localStorage`, aucune donnée sensible, tolérance aux échecs d'accès                       |
| Prévention XSS                                        | Frontend    | Aucun `dangerouslySetInnerHTML`, rendu JSX standard uniquement                             |
| Traduction des erreurs API en messages non techniques | Frontend    | `resolveErrorMessage`, jamais de détail brut affiché à l'utilisateur                       |

**Principe de conception central** : le frontend ne recalcule et ne vérifie jamais une règle métier. Même si un
utilisateur malveillant manipulait le state ou le `localStorage` de son propre navigateur, cela n'aurait strictement
aucun effet sur ce qui est réellement persisté ou renvoyé par l'API, puisque le serveur est l'unique source de vérité du
calcul.

---

## 3. Secrets et variables d'environnement

- Aucun secret n'est commité dans ce dépôt, à quelque niveau que ce soit. Seuls des fichiers `.env.example` (racine,
  `backend/`, `frontend/`) sont versionnés, sans valeur réelle.
- `.env` est ignoré par Git à la racine et dans chaque application (voir les `.gitignore` respectifs).
- La variable `DATABASE_URL` (backend) contient des identifiants de connexion à la base : elle ne doit jamais apparaître
  dans un log, une pull request, ou une issue publique.
- **Rappel important côté frontend** : toute variable préfixée `NEXT_PUBLIC_*` (ex. `NEXT_PUBLIC_API_URL`) est inlinée
  dans le bundle JavaScript envoyé au navigateur au moment du build. Aucune valeur sensible ne doit jamais être placée
  derrière ce préfixe - dans ce projet, cette variable ne contient qu'une URL publique par nature, ce qui est correct.
- Les secrets de production (chaîne de connexion PostgreSQL réelle, origine frontend réelle) sont gérés exclusivement
  via les mécanismes de configuration de la plateforme d'hébergement, jamais via un fichier commité.

---

## 4. Sécurité de la chaîne d'approvisionnement (supply chain)

- Les dépendances de chaque application sont figées via leur `package-lock.json` respectif, installées en CI avec
  `npm ci` (jamais `npm install`), garantissant une installation reproductible sans résolution de version imprévue.
- Les deux applications utilisent des lockfiles indépendants : une mise à jour de dépendance dans `backend/` n'affecte
  jamais `frontend/`, et inversement.
- Toute dépendance ajoutée doit être justifiée dans la description de la pull request correspondante (voir
  `docs/CONTRIBUTING.md`, section 8).
- Un audit périodique des dépendances (`npm audit`) est recommandé sur chaque application ; son intégration bloquante au
  pipeline CI est identifiée comme une amélioration future (voir `backend/docs/SECURITY.md` et
  `frontend/docs/SECURITY.md`, sections « Limites connues »).

---

## 5. Conteneurisation

- Chaque application dispose de son propre `Dockerfile` multi-stage, qui n'installe en production que les dépendances
  strictement nécessaires à l'exécution (`--omit=dev` côté backend, sortie `standalone` côté frontend).
- Le `docker-compose.yml` racine n'expose que les ports nécessaires (`3000` pour le frontend, `3001` pour l'API, `5455`
  pour PostgreSQL en développement) et ne doit jamais être utilisé tel quel en production sans revoir l'exposition
  réseau et les identifiants PostgreSQL par défaut, qui sont des valeurs de développement local non sensibles.
- Aucune image ne tourne en tant que `root` de façon injustifiée côté frontend (utilisateur applicatif dédié dans le
  `Dockerfile`).

---

## 6. Ce qui a été explicitement jugé hors périmètre

Les protections suivantes ont été jugées disproportionnées pour ce prototype de démonstration, et sont documentées comme
telles plutôt que silencieusement omises :

| Protection                                              | Raison de l'exclusion                                                                           |
|---------------------------------------------------------|-------------------------------------------------------------------------------------------------|
| Authentification et gestion de comptes                  | Diagnostic public par choix produit, aucune donnée personnelle collectée                        |
| Chiffrement applicatif des données stockées             | Aucune donnée sensible ou identifiante dans le périmètre actuel                                 |
| Protection anti-rejeu sur la soumission                 | L'endpoint n'est ni un paiement ni une action à conséquence financière rejouable                |
| Politique de rétention/suppression des soumissions      | Volume attendu limité à un usage de démonstration ou pilote (voir `backend/docs/BACKUP.md`)     |
| Content Security Policy stricte configurée côté Next.js | Aucun hébergement final connu à ce stade du prototype                                           |
| Audit de dépendances bloquant en CI                     | À initier une fois le projet stabilisé, pour trier le bruit initial avant de le rendre bloquant |

Ces exclusions devront être revues avant tout passage en production avec un trafic réel ou une collecte de données
personnelles.

---

## 7. Signalement d'une vulnérabilité

Si vous identifiez une faille de sécurité sur ce dépôt, quelle que soit l'application concernée :

1. **Ne pas ouvrir d'issue publique** décrivant la faille en détail.
2. Contacter directement l'auteur du dépôt via un canal privé (message direct, email associé au profil GitHub).
3. Fournir : l'application concernée (`backend` ou `frontend`), la version ou le commit affecté, les étapes de
   reproduction, et l'impact estimé.
4. Laisser un délai raisonnable de correction avant toute divulgation publique.

Aucun programme de bug bounty n'est en place pour ce prototype, dans le cadre d'un exercice de sélection technique.

---

## 8. Évolutions attendues avant un usage en production réelle

- Définir une politique de rétention ou d'anonymisation des soumissions.
- Ajouter une authentification si des données personnelles venaient à être collectées (email, identifiant d'entreprise).
- Rendre l'audit de dépendances bloquant en CI sur les vulnérabilités critiques.
- Configurer explicitement les en-têtes de sécurité HTTP recommandés côté Next.js (`X-Frame-Options`,
  `Content-Security-Policy`, `Referrer-Policy`).
- Revoir la limite de rate limiting en fonction du trafic réel observé une fois le produit exposé publiquement.
- Mettre en place des sauvegardes automatisées et testées de la base de données (voir checklist dans
  `backend/docs/BACKUP.md`).