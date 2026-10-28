"""API d'ajout et de suppression des projets."""

import re

from flask import Blueprint, jsonify, request

from data_store import read_projects, save_projects


projects_bp = Blueprint("projects", __name__)


def _index_to_int(index):
    if isinstance(index, int):
        return index
    match = re.search(r"\d+", str(index))
    return int(match.group()) if match else None


def _format_index(index, original_index):
    if isinstance(original_index, str) and re.fullmatch(r"\s*\[\s*\d+\s*\]\s*", original_index):
        return f"[ {index:02d} ]"
    return index


def _reorder_indexes(projects, deleted_index):
    for project in projects:
        project_index = _index_to_int(project.get("index"))
        if project_index is not None and project_index > deleted_index:
            project["index"] = _format_index(project_index - 1, project["index"])


@projects_bp.route("/api/projets", methods=["GET", "POST", "OPTIONS"])
def gerer_projets():
    if request.method == "OPTIONS":
        return "", 204
    projects = read_projects()
    if request.method == "GET":
        return jsonify(projects)

    new_project = request.get_json(silent=True)
    if not new_project:
        return jsonify({"message": "Les données du projet sont manquantes."}), 400
    projects.append(new_project)
    save_projects(projects)
    return jsonify({"message": "Projet ajouté !", "projets": projects})


@projects_bp.route("/api/projetssupp", methods=["POST", "OPTIONS"])
def supprimer_projet():
    if request.method == "OPTIONS":
        return "", 204
    donnees = request.get_json(silent=True) or {}
    nom = donnees.get("nom")
    index = _index_to_int(donnees.get("index"))
    if not nom or index is None:
        return jsonify({"message": "Le nom et l'index du projet sont requis."}), 400

    projects = read_projects()
    position = next(
        (pos for pos, project in enumerate(projects)
         if project.get("nom") == nom and _index_to_int(project.get("index")) == index),
        None,
    )
    if position is None:
        return jsonify({"message": "Projet introuvable."}), 404

    projects.pop(position)
    _reorder_indexes(projects, index)
    save_projects(projects)
    return jsonify({"message": "Projet supprimé", "projets": projects})
