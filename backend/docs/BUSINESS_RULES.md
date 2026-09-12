# Règles métier

Ce document est la référence des règles métier implémentées dans le moteur de scoring et le moteur de recommandations.
Il est destiné à toute personne souhaitant comprendre, vérifier ou faire évoluer la logique de calcul sans lire le code
source.

---

## Périmètre

La Combinaison couvre trois dimensions :

| Dimension                  | Questions | Poids dans le score global |
|----------------------------|-----------|----------------------------|
| Formalisation              | Q1 à Q4   | 40 %                       |
| Comptabilité               | Q5 à Q7   | 30 %                       |
| Préparation au financement | Q8 à Q10  | 30 %                       |

---

## Valeurs de score par réponse

Chaque option de réponse est associée à une valeur numérique parmi : **0, 33, 50, 66, 100**.

| Question                            | Option                    | Valeur |
|-------------------------------------|---------------------------|--------|
| Q1 - Enregistrement légal           | NOT_REGISTERED            | 0      |
|                                     | REGISTRATION_IN_PROGRESS  | 50     |
|                                     | REGISTERED                | 100    |
| Q2 - Séparation des finances        | NO                        | 0      |
|                                     | YES                       | 100    |
| Q3 - Obligations administratives    | NOT_UP_TO_DATE            | 0      |
|                                     | PARTIALLY_UP_TO_DATE      | 33     |
|                                     | MOSTLY_UP_TO_DATE         | 66     |
|                                     | FULLY_UP_TO_DATE          | 100    |
| Q4 - Documents organisés            | SCATTERED                 | 0      |
|                                     | PARTIALLY_ORGANIZED       | 50     |
|                                     | WELL_ORGANIZED            | 100    |
| Q5 - Méthode comptable              | NONE                      | 0      |
|                                     | INFORMAL_TRACKING         | 33     |
|                                     | SIMPLE_SOFTWARE           | 66     |
|                                     | DEDICATED_ACCOUNTANT      | 100    |
| Q6 - Conservation des justificatifs | RARELY_OR_NEVER           | 0      |
|                                     | IRREGULARLY               | 50     |
|                                     | SYSTEMATICALLY            | 100    |
| Q7 - États financiers récents       | NEVER_PRODUCED            | 0      |
|                                     | OVER_ONE_YEAR_OLD         | 50     |
|                                     | UNDER_ONE_YEAR_OLD        | 100    |
| Q8 - Financement externe            | NEVER                     | 0      |
|                                     | INFORMAL                  | 50     |
|                                     | FORMAL                    | 100    |
| Q9 - Niveau d'endettement           | UNCLEAR                   | 0      |
|                                     | APPROXIMATE               | 50     |
|                                     | PRECISE                   | 100    |
| Q10 - Besoin de financement         | NOT_IDENTIFIED            | 0      |
|                                     | IDENTIFIED_NOT_DOCUMENTED | 50     |
|                                     | IDENTIFIED_AND_DOCUMENTED | 100    |

---

## Pipeline de calcul

Toutes les étapes intermédiaires sont calculées en virgule flottante sans arrondi. L'arrondi est appliqué une seule
fois, en toute fin de pipeline. La valeur arrondie est celle persistée en base et celle renvoyée au frontend - il
n'existe jamais deux versions différentes d'un même score.

### Étape 1 - Scores par dimension (bruts)

```
formalizationScore = moyenne(Q1, Q2, Q3, Q4)
accountingRawScore = moyenne(Q5, Q6, Q7)
fundingRawScore    = moyenne(Q8, Q9, Q10)
```

### Étape 2 - Plafond

La Formalisation conditionne le niveau maximal atteignable par les deux autres dimensions :

```
cap = 50 + (0.5 × formalizationScore)
```

Le plafond est toujours compris entre 50 (Formalisation à 0) et 100 (Formalisation à 100).

### Étape 3 - Scores finaux après plafonnement

```
accountingFinalScore = min(accountingRawScore, cap)
fundingFinalScore    = min(fundingRawScore, cap)
```

La Formalisation n'est jamais plafonnée. Elle n'a pas de score brut distinct de son score final.

### Étape 4 - Score global

```
globalScore = (0.40 × formalizationScore)
            + (0.30 × accountingFinalScore)
            + (0.30 × fundingFinalScore)
```

### Étape 5 - Arrondi final

```
scores de dimension  → arrondi à l'entier le plus proche
score global         → arrondi à une décimale
```

---

## Niveaux de maturité

Les mêmes seuils s'appliquent au score global et aux scores de dimension individuels.

| Seuil           | Niveau              | Libellé affiché           |
|-----------------|---------------------|---------------------------|
| score < 45      | NEEDS_STRENGTHENING | Structuration à renforcer |
| 45 ≤ score < 75 | IN_PROGRESS         | Structuration en cours    |
| score ≥ 75      | ADVANCED            | Structuration avancée     |

---

## Détection de la cascade

La cascade est un mécanisme qui détecte qu'une Formalisation faible bloque artificiellement la progression des autres
dimensions via le plafonnement.

**Condition de déclenchement :**

```
cascadeTriggered = (formalizationScore < 50)
                ET (accountingRawScore > cap OU fundingRawScore > cap)
```

La cascade ne peut jamais être déclenchée si `formalizationScore >= 50`, quelle que soit la valeur des autres
dimensions.

**Effet :** lorsque la cascade est active, l'axe d'amélioration est forcé sur FORMALIZATION, indépendamment de la
comparaison des scores finaux.

---

## Point fort

La dimension avec le score final le plus élevé.

En cas d'égalité stricte entre deux ou trois dimensions, l'ordre de priorité est :

```
FORMALIZATION > ACCOUNTING > FUNDING
```

---

## Axe d'amélioration

La dimension prioritaire sur laquelle concentrer les efforts.

**Si la cascade est déclenchée :** l'axe est forcé sur FORMALIZATION.

**Sinon :** la dimension avec le score final le plus faible. En cas d'égalité stricte, l'ordre de priorité est :

```
ACCOUNTING > FUNDING > FORMALIZATION
```

---

## Recommandations

### Textes par niveau de maturité

| Niveau              | Description affichée                                                                                                                                |
|---------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| NEEDS_STRENGTHENING | Votre entreprise fonctionne, mais plusieurs fondations administratives et financières restent à consolider pour sécuriser sa croissance.            |
| IN_PROGRESS         | Des bases solides existent déjà. Certains points méritent encore d'être renforcés pour fiabiliser votre gestion et faciliter vos démarches futures. |
| ADVANCED            | Votre entreprise dispose d'une bonne maîtrise administrative et financière, un atout réel pour accéder à des opportunités de développement.         |

### Recommandation principale - cas standard

Déterminée par la dimension de l'axe d'amélioration et le niveau de son score final.

**Formalisation**

| Niveau du score final | Texte                                                                                                                                                        |
|-----------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Faible (< 45)         | Finalisez l'enregistrement légal de votre entreprise et séparez vos finances personnelles et professionnelles, c'est la base de toute structuration durable. |
| Intermédiaire (45–74) | Poursuivez la mise à jour de vos obligations administratives et centralisez vos documents officiels pour gagner en fiabilité.                                |
| Élevé (≥ 75)          | Votre structuration légale est solide, maintenez cette rigueur, c'est un vrai atout pour vos démarches futures.                                              |

**Comptabilité**

| Niveau du score final | Texte                                                                                                             |
|-----------------------|-------------------------------------------------------------------------------------------------------------------|
| Faible                | Mettez en place un suivi régulier de vos dépenses et recettes, même simple, pour mieux piloter votre activité.    |
| Intermédiaire         | Conservez systématiquement vos pièces justificatives et envisagez un outil de comptabilité adapté à votre taille. |
| Élevé                 | Votre comptabilité est bien tenue, elle constitue une base fiable pour tout dossier futur.                        |

**Préparation au financement**

| Niveau du score final | Texte                                                                                                                  |
|-----------------------|------------------------------------------------------------------------------------------------------------------------|
| Faible                | Clarifiez votre niveau d'endettement actuel et identifiez précisément vos besoins avant toute démarche de financement. |
| Intermédiaire         | Formalisez votre besoin de financement (montant, objet, échéance) pour être prêt le moment venu.                       |
| Élevé                 | Vous êtes bien positionné pour engager une démarche de financement structurée.                                         |

### Recommandation principale - cas cascade

Lorsque la cascade est déclenchée, la recommandation standard est remplacée par :

> Votre structuration légale et administrative est aujourd'hui le principal levier de progression pour votre entreprise.
> Elle conditionne la fiabilité de vos documents et facilite l'accès aux opportunités de financement.

Accompagnée d'une recommandation secondaire :

> Complétez votre enregistrement légal et régularisez vos obligations administratives en priorité.

Le mot "cascade" n'apparaît jamais dans l'interface utilisateur.

---

## Exemples chiffrés

### Exemple 1 - Cascade déclenchée

| Dimension     | Score brut | Plafond | Score final |
|---------------|------------|---------|-------------|
| Formalisation | 29         | -       | 29          |
| Comptabilité  | 100        | 64.5    | 64          |
| Financement   | 100        | 64.5    | 64          |

- Plafond : `50 + 0.5 × 29 = 64.5`
- Cascade : `29 < 50` ET `100 > 64.5` → **déclenchée**
- Axe d'amélioration : **FORMALIZATION** (forcé)
- Score global : `0.4×29 + 0.3×64 + 0.3×64 = 50.0`
- Niveau : **IN_PROGRESS**

### Exemple 2 - Faiblesse générale sans cascade

| Dimension     | Score brut | Plafond | Score final |
|---------------|------------|---------|-------------|
| Formalisation | 21         | -       | 21          |
| Comptabilité  | 28         | 60.5    | 28          |
| Financement   | 17         | 60.5    | 17          |

- Plafond : `50 + 0.5 × 21 = 60.5`
- Cascade : `21 < 50` MAIS `28 < 60.5` ET `17 < 60.5` → **non déclenchée**
- Axe d'amélioration : **FORMALIZATION** (score final le plus faible, tie-break standard)
- Score global : `0.4×21 + 0.3×28 + 0.3×17 = 21.9`
- Niveau : **NEEDS_STRENGTHENING**

### Exemple 3 - Formalisation parfaite

| Dimension     | Score brut | Plafond | Score final |
|---------------|------------|---------|-------------|
| Formalisation | 100        | -       | 100         |
| Comptabilité  | 100        | 100     | 100         |
| Financement   | 100        | 100     | 100         |

- Plafond : `50 + 0.5 × 100 = 100`
- Cascade : impossible (`formalizationScore >= 50`)
- Score global : **100**
- Niveau : **ADVANCED**

---

## Invariants

Ces propriétés sont vraies pour toute combinaison de réponses valide.

- Le plafond est toujours compris entre 50 et 100 inclus.
- `accountingFinalScore ≤ accountingRawScore`, toujours.
- `fundingFinalScore ≤ fundingRawScore`, toujours.
- `globalScore` est toujours compris entre 0 et 100 inclus.
- Le moteur est déterministe : les mêmes réponses produisent toujours exactement le même résultat.
- `cascadeTriggered` ne peut jamais être vrai si `formalizationScore ≥ 50`.

---

## Versionnement du moteur

Chaque soumission en base stocke un champ `scoring_engine_version` (valeur actuelle : `v1`). Toute modification du
barème, des seuils ou de la formule de plafonnement doit incrémenter cette version. Les soumissions passées conservent
leur interprétation d'origine et ne sont jamais recalculées.