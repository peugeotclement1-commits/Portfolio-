"""Route d'envoi du formulaire de contact."""

from flask import Blueprint, current_app, jsonify, request
from flask_mail import Message


contact_bp = Blueprint("contact", __name__)


@contact_bp.post("/envoi")
def envoi_email():
    nom = request.form.get("name")
    email_visiteur = request.form.get("email")
    message_contenu = request.form.get("message")
    message = Message(
        subject=f"Nouveau message de {nom} via le Portfolio",
        recipients=["peugeotclement1@gmail.com"],
        body=f"Nom: {nom}\nEmail du contact: {email_visiteur}\n\nMessage:\n{message_contenu}",
    )
    try:
        current_app.extensions["mail"].send(message)
        return jsonify({"status": "success", "message": "Email envoyé"}), 200
    except Exception as error:
        return jsonify({"status": "error", "message": str(error)}), 500
