"""Mise à jour annuelle de la statistique d'expérience du portfolio."""

import json
from datetime import date
from urllib.error import URLError
from urllib.request import Request, urlopen
from data_store import read_stats_file, save_stats_file



INCREMENT_MARKER = "_last_experience_increment_year"
GITHUB_SYNC_MARKER = "_last_github_sync_date"
GITHUB_USER = "peugeotclement1-commits"


def fetch_github_repository_count():
    """Retourne le nombre de dépôts publics indiqué par l'API GitHub."""
    request = Request(
        f"https://api.github.com/users/{GITHUB_USER}",
        headers={"Accept": "application/vnd.github+json", "User-Agent": "portfolio-stats"},
    )
    with urlopen(request, timeout=3) as response:
        profile = json.load(response)
    return int(profile["public_repos"])


def update_portfolio_stats(today=None):
    """Met à jour les dépôts publics et ajoute l'expérience le 1er septembre."""
    today = today or date.today()

    stats = read_stats_file()

    changed = False

    if today.month == 9 and today.day == 1 and stats.get(INCREMENT_MARKER) != today.year:
        stats["experience_years"] = int(stats.get("experience_years", 0)) + 1
        stats[INCREMENT_MARKER] = today.year
        changed = True

    # Synchronise une fois par jour pour éviter une requête GitHub à chaque page.
    if stats.get(GITHUB_SYNC_MARKER) != today.isoformat():
        try:
            stats["projects_count"] = fetch_github_repository_count()
            stats[GITHUB_SYNC_MARKER] = today.isoformat()
            changed = True
        except (URLError, TimeoutError, KeyError, ValueError):
            # Garde le dernier nombre connu si GitHub est temporairement inaccessible.
            pass

    if changed:
        save_stats_file(stats)
    
    return stats

def main_stats():
    """Retourne les statistiques à jour pour les routes et les pages."""
    return update_portfolio_stats()


if __name__ == "__main__":
    print(json.dumps(main_stats(), indent=4, ensure_ascii=False))
