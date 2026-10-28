"""Pages publiques et API des statistiques du portfolio."""

from flask import Blueprint, jsonify, render_template, request

from data_store import read_projects, save_stats_file
from portfolio_stats import main_stats


portfolio_bp = Blueprint("portfolio", __name__)


@portfolio_bp.get("/")
def index():
    return render_template("index.html", projets=read_projects(), stats=main_stats())


@portfolio_bp.get("/emulateur/<string:project_index>")
def emulateur_projet(project_index):
    projet = next(
        (p for p in read_projects() if str(p.get("index", "")) == project_index),
        None,
    )
    if projet is None:
        return "Projet introuvable.", 404

    def dimension(value, default):
        try:
            return max(1, min(int(value), 10000))
        except (TypeError, ValueError):
            return default

    return render_template(
        "emulateur_projets.html",
        projet=projet,
        width=dimension(projet.get("width"), 1280),
        height=dimension(projet.get("height"), 800),
    )


@portfolio_bp.route("/api/portfolio-stats", methods=["GET", "POST", "OPTIONS"])
def gerer_portfolio_stats():
    if request.method == "OPTIONS":
        return "", 204
    if request.method == "GET":
        return jsonify(main_stats())

    donnees = request.get_json(silent=True) or {}
    try:
        annees = int(donnees.get("experience_years"))
        projets = int(donnees.get("projects_count"))
    except (TypeError, ValueError):
        return jsonify({"message": "Les années d’expérience et le nombre de projets doivent être des nombres entiers."}), 400
    if annees < 0 or projets < 0:
        return jsonify({"message": "Les valeurs ne peuvent pas être négatives."}), 400

    stats = {"experience_years": annees, "projects_count": projets}
    save_stats_file(stats)
    return jsonify({"message": "Les statistiques ont été mises à jour.", "stats": main_stats()})
