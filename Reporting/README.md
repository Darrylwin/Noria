# Automatisation des rapports journaliers - Awen

## Installation

```bash
cd /chemin/vers/awen          # racine du projet, là où sont /frontend et /backend
cp awen-report-automation/*.py awen-report-automation/*.txt .
cp awen-report-automation/.env.example .env
echo ".env" >> .gitignore
echo ".awen-reports/" >> .gitignore
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

Remplis `.env` (identifiants SMTP, clé API Groq, éventuellement `DATABASE_URL`).

## Usage quotidien

Quand tu as fini de travailler pour la journée (peu importe l'heure) :

```bash
python main.py prepare
```

Ça va :

1. Zipper le projet (en respectant `.gitignore`, y compris ton travail non commité)
2. Calculer le diff depuis le dernier jour où tu as commité (gère les jours sautés)
3. Dumper la base PostgreSQL si `DATABASE_URL` est configurée
4. Générer un brouillon de rapport via Groq (llama-3.3-70b-versatile), dans `.awen-reports/<date>/report_draft.md`

Ouvre ensuite `report_draft.md`, relis, corrige à la main si besoin.

Puis, trois options :

- **Envoyer tout de suite** : `python main.py send --now`
- **Ne rien faire** : le cron (voir plus bas) enverra automatiquement à l'heure cible (19h par défaut, ou peu après si
  tu as préparé plus tard)
- **Annuler l'envoi auto du jour** : `touch .awen-reports/$(date +%F)/SKIP_TODAY`

## Automatisation de l'envoi (cron)

Voir `crontab.example`. En résumé : une tâche toutes les 15 minutes qui appelle
`main.py send` - elle n'envoie que si un brouillon existe, n'a pas déjà
été envoyé, et que l'heure cible est atteinte.

## Vérifier l'état du jour

```bash
python main.py status
```

## Notes

- Le script détecte automatiquement la racine du projet en remontant les
  dossiers jusqu'à trouver `.git` (ou `frontend/` + `backend/`), donc tu peux
  le lancer depuis n'importe quel sous-dossier.
- Le diff inclut séparément : commits du jour, modifications indexées non
  commitées, et modifications non indexées - pour que le rapport reflète
  l'état réel du projet, pas seulement ce qui est commité.
- `sent_log.jsonl` garde un historique de tous les envois (date, sujet, heure).