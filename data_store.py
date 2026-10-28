"""Accès centralisé aux fichiers JSON de l'application."""

import json
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
STOCK_FILE = BASE_DIR / "stock.json"
PORTFOLIO_STATS_FILE = BASE_DIR / "portfolio_stats.json"
DEL_FILE = BASE_DIR / "del.json"


def read_json(path):
    with path.open(encoding="utf-8") as file:
        return json.load(file)


def write_json(path, data):
    with path.open("w", encoding="utf-8") as file:
        json.dump(data, file, indent=4, ensure_ascii=False)


def read_projects():
    return read_json(STOCK_FILE)


def save_projects(projects):
    write_json(STOCK_FILE, projects)


def read_stats_file():
    return read_json(PORTFOLIO_STATS_FILE)


def save_stats_file(stats):
    existing = read_stats_file()
    for marker in ("_last_experience_increment_year", "_last_github_sync_date"):
        if marker in existing:
            stats[marker] = existing[marker]
    write_json(PORTFOLIO_STATS_FILE, stats)
