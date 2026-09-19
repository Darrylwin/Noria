#!/usr/bin/env python3
"""
main.py - Automatisation des rapports journaliers de stage.

Deux commandes :
  prepare  -> zippe le projet, calcule le diff depuis le dernier jour travaillé,
              dump la base (optionnel), génère un brouillon de rapport via l'IA,
              et attend ta relecture. Ne envoie RIEN.
  send     -> envoie le rapport du jour si : (a) un brouillon existe,
              (b) il n'a pas déjà été envoyé, (c) l'heure d'envoi est atteinte
              (--now l'ignore). Fait tourner ça en cron toutes les 15-30 min.

Configuration via un fichier .env à la racine (voir .env.example).
"""

import argparse
import datetime as dt
import json
import mimetypes
import os
import smtplib
import subprocess
import sys
import zipfile
from email.message import EmailMessage
from pathlib import Path

# --------------------------------------------------------------------------
# Configuration
# --------------------------------------------------------------------------

def load_dotenv(path: Path) -> None:
    """Charge un .env minimal sans dépendance externe."""
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def find_project_root(start: Path) -> Path:
    """Remonte jusqu'à trouver un dossier contenant .git (ou frontend/ + backend/)."""
    current = start.resolve()
    for candidate in [current, *current.parents]:
        if (candidate / ".git").exists():
            return candidate
        if (candidate / "frontend").is_dir() and (candidate / "backend").is_dir():
            return candidate
    raise SystemExit("Racine du projet introuvable (pas de .git ni frontend/+backend/).")


ROOT = find_project_root(Path.cwd())
load_dotenv(ROOT / ".env")

REPORTS_DIR = ROOT / ".awen-reports"
STATE_SUFFIX = "state.json"
EMAIL_TO = os.environ.get("REPORT_TO", "journalier.stage@gmail.com")
EMAIL_FROM = os.environ.get("SMTP_FROM")
SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER")
SMTP_PASS = os.environ.get("SMTP_PASS")
SEND_HOUR = int(os.environ.get("SEND_HOUR", "19"))
SEND_MINUTE = int(os.environ.get("SEND_MINUTE", "0"))
GRACE_MINUTES = int(os.environ.get("GRACE_MINUTES", "10"))
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
DATABASE_URL = os.environ.get("DATABASE_URL")  # ex: postgresql://user:pass@localhost:5432/awen


def today_str() -> str:
    return dt.date.today().isoformat()


def day_dir(day: str | None = None) -> Path:
    d = REPORTS_DIR / (day or today_str())
    d.mkdir(parents=True, exist_ok=True)
    return d


def state_path(day: str | None = None) -> Path:
    return day_dir(day) / STATE_SUFFIX


def load_state(day: str | None = None) -> dict:
    p = state_path(day)
    if p.exists():
        return json.loads(p.read_text())
    return {}


def save_state(state: dict, day: str | None = None) -> None:
    state_path(day).write_text(json.dumps(state, indent=2, ensure_ascii=False))


# --------------------------------------------------------------------------
# Git helpers
# --------------------------------------------------------------------------

def run(cmd: list[str], cwd: Path = ROOT) -> str:
    result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if result.returncode != 0 and result.stderr.strip():
        print(f"[warn] {' '.join(cmd)} -> {result.stderr.strip()}", file=sys.stderr)
    return result.stdout


def last_working_day_commit() -> str | None:
    """Dernier commit strictement avant aujourd'hui 00:00 (gère les jours sautés)."""
    out = run(["git", "log", "--before=" + today_str() + "T00:00:00", "-1", "--format=%H"])
    out = out.strip()
    return out or None


def build_diff() -> str:
    base = last_working_day_commit()
    parts = []
    if base:
        committed = run(["git", "diff", base, "HEAD"])
        if committed.strip():
            parts.append(f"### Modifications commitées depuis le {base[:7]}\n\n{committed}")
    else:
        parts.append("### Premier jour suivi par ce script (pas de commit antérieur trouvé).")

    uncommitted = run(["git", "diff", "HEAD"])
    if uncommitted.strip():
        parts.append(f"### Modifications non commitées (working tree)\n\n{uncommitted}")

    staged = run(["git", "diff", "--cached"])
    if staged.strip():
        parts.append(f"### Modifications indexées (staged, non commitées)\n\n{staged}")

    return "\n\n".join(parts) if parts else "(Aucune modification détectée aujourd'hui.)"


def tracked_and_untracked_files() -> list[str]:
    """Tous les fichiers du projet sauf ceux ignorés par .gitignore."""
    out = run(["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"])
    return [f for f in out.split("\0") if f]


# --------------------------------------------------------------------------
# Archive & DB dump
# --------------------------------------------------------------------------

def build_zip(dest: Path) -> Path:
    files = tracked_and_untracked_files()
    zip_path = dest / "projet_awen.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for rel in files:
            full = ROOT / rel
            if full.is_file():
                zf.write(full, arcname=rel)
    print(f"[ok] Archive créée : {zip_path} ({len(files)} fichiers)")
    return zip_path


def dump_database(dest: Path) -> Path | None:
    if not DATABASE_URL:
        print("[info] DATABASE_URL non définie, dump de la base ignoré.")
        return None
    sql_path = dest / "database.sql"
    result = subprocess.run(
        ["pg_dump", "--no-owner", "--no-privileges", DATABASE_URL],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        print(f"[warn] pg_dump a échoué : {result.stderr.strip()}", file=sys.stderr)
        return None
    sql_path.write_text(result.stdout)
    print(f"[ok] Dump base créé : {sql_path}")
    return sql_path


# --------------------------------------------------------------------------
# Génération du rapport via l'IA
# --------------------------------------------------------------------------

REPORT_SYSTEM_PROMPT = """Tu rédiges un rapport journalier de stage pour l'entreprise \
BENJEDDOU Technologie Services, projet Awen (plateforme ERP Cloud). Le rapport doit \
présenter clairement et précisément les travaux réalisés durant la journée ainsi que \
l'état réel d'avancement du projet, à partir du diff Git fourni. Style factuel et concis, \
en français, structuré en deux parties : "Travaux réalisés aujourd'hui" (liste à puces \
concrète, basée uniquement sur ce que montre le diff, sans invention) et "État d'avancement" \
(un paragraphe court). Ne pas halluciner de fonctionnalité absente du diff. Ne pas ajouter \
de formule de politesse ni d'objet, seulement le corps du rapport."""


def generate_report_text(diff: str) -> str:
    if not GROQ_API_KEY:
        return (
            "[Brouillon non généré : GROQ_API_KEY absente de .env]\n\n"
            "Travaux réalisés aujourd'hui :\n- \n\nÉtat d'avancement :\n"
        )
    try:
        from groq import Groq
    except ImportError:
        raise SystemExit("Installe le SDK : pip install groq")

    client = Groq(api_key=GROQ_API_KEY)
    # Garde-fou : le tier gratuit Groq plafonne à ~6-12K tokens/minute (TPM) sur
    # llama-3.3-70b-versatile, une contrainte bien plus stricte que sa fenêtre de
    # contexte de 128K. On tronque large pour rester sous ce plafond en un seul appel.
    diff_excerpt = diff[:20000]
    completion = client.chat.completions.create(
        model=GROQ_MODEL,
        max_tokens=1200,
        messages=[
            {"role": "system", "content": REPORT_SYSTEM_PROMPT},
            {"role": "user", "content": f"Diff du jour :\n\n{diff_excerpt}"},
        ],
    )
    return completion.choices[0].message.content


# --------------------------------------------------------------------------
# Email
# --------------------------------------------------------------------------

def build_email(subject: str, body: str, attachments: list[Path]) -> EmailMessage:
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = EMAIL_FROM or SMTP_USER
    msg["To"] = EMAIL_TO
    msg.set_content(body)
    for path in attachments:
        if not path or not path.exists():
            continue
        ctype, _ = mimetypes.guess_type(str(path))
        maintype, subtype = (ctype.split("/", 1) if ctype else ("application", "octet-stream"))
        msg.add_attachment(
            path.read_bytes(), maintype=maintype, subtype=subtype, filename=path.name
        )
    return msg


def send_email(msg: EmailMessage) -> None:
    if not (SMTP_USER and SMTP_PASS):
        raise SystemExit("SMTP_USER / SMTP_PASS manquants dans .env")
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)


def log_sent(day: str, subject: str) -> None:
    log_path = REPORTS_DIR / "sent_log.jsonl"
    entry = {"date": day, "subject": subject, "sent_at": dt.datetime.now().isoformat()}
    with log_path.open("a") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


# --------------------------------------------------------------------------
# Commandes
# --------------------------------------------------------------------------

def cmd_prepare(args: argparse.Namespace) -> None:
    day = today_str()
    dest = day_dir(day)

    if (dest / "SKIP_TODAY").exists():
        print("[info] SKIP_TODAY présent : préparation annulée pour aujourd'hui.")
        return

    print(f"[1/4] Racine du projet : {ROOT}")
    zip_path = build_zip(dest)

    print("[2/4] Calcul du diff depuis le dernier jour travaillé...")
    diff = build_diff()
    diff_path = dest / "diff.patch"
    diff_path.write_text(diff)

    print("[3/4] Dump de la base de données...")
    db_path = dump_database(dest)

    print("[4/4] Génération du brouillon de rapport via l'IA...")
    report_text = generate_report_text(diff)
    report_path = dest / "report_draft.md"
    report_path.write_text(report_text)

    state = {
        "date": day,
        "subject": f"Rapport journalier - Projet Awen - {day}",
        "report_path": str(report_path),
        "zip_path": str(zip_path),
        "db_path": str(db_path) if db_path else None,
        "sent": False,
        "prepared_at": dt.datetime.now().isoformat(),
    }
    save_state(state, day)

    print("\nBrouillon prêt :", report_path)
    print("Relis / modifie ce fichier, puis :")
    print("  - python main.py send --now      (envoi immédiat)")
    print("  - ne rien faire : envoi automatique dès", f"{SEND_HOUR:02d}:{SEND_MINUTE:02d}",
          "(cron), avec ce brouillon tel quel au moment de l'envoi.")


def cmd_send(args: argparse.Namespace) -> None:
    day = today_str()
    state = load_state(day)

    if not state:
        print("[info] Aucun rapport préparé aujourd'hui, rien à envoyer.")
        return
    if state.get("sent"):
        print("[info] Rapport déjà envoyé aujourd'hui.")
        return
    if (day_dir(day) / "SKIP_TODAY").exists():
        print("[info] SKIP_TODAY présent : envoi annulé pour aujourd'hui.")
        return

    if not args.now:
        now = dt.datetime.now()
        prepared_at = dt.datetime.fromisoformat(state["prepared_at"])
        target = now.replace(hour=SEND_HOUR, minute=SEND_MINUTE, second=0, microsecond=0)
        # Si tu as préparé après l'heure cible, on envoie GRACE_MINUTES après la préparation.
        if prepared_at > target:
            target = prepared_at + dt.timedelta(minutes=GRACE_MINUTES)
        if now < target:
            print(f"[info] Pas encore l'heure (cible {target:%H:%M}).")
            return

    report_path = Path(state["report_path"])
    body = report_path.read_text() if report_path.exists() else "(Rapport introuvable)"
    attachments = [Path(p) for p in [state.get("zip_path"), state.get("db_path")] if p]

    msg = build_email(state["subject"], body, attachments)
    send_email(msg)

    state["sent"] = True
    state["sent_at"] = dt.datetime.now().isoformat()
    save_state(state, day)
    log_sent(day, state["subject"])
    print(f"[ok] Rapport envoyé à {EMAIL_TO}.")


def cmd_status(args: argparse.Namespace) -> None:
    day = today_str()
    state = load_state(day)
    if not state:
        print("Aucun rapport préparé aujourd'hui.")
        return
    print(json.dumps(state, indent=2, ensure_ascii=False))


def main() -> None:
    parser = argparse.ArgumentParser(description="Automatisation des rapports journaliers Awen")
    sub = parser.add_subparsers(dest="command", required=True)

    p_prepare = sub.add_parser("prepare", help="Zippe, diff, dump DB, génère le brouillon")
    p_prepare.set_defaults(func=cmd_prepare)

    p_send = sub.add_parser("send", help="Envoie le rapport du jour si prêt et à l'heure")
    p_send.add_argument("--now", action="store_true", help="Envoie immédiatement, sans attendre l'heure cible")
    p_send.set_defaults(func=cmd_send)

    p_status = sub.add_parser("status", help="Affiche l'état du rapport du jour")
    p_status.set_defaults(func=cmd_status)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()