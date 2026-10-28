"""Route HTTP de ClémentBot."""

from flask import Blueprint, jsonify, request

from ai_service import generate_ai_response


ai_bp = Blueprint("ai", __name__)


@ai_bp.post("/api/ai")
def ai_bot():
    data = request.get_json(silent=True) or {}
    user_prompt = data.get("prompt", "")
    if not isinstance(user_prompt, str) or not user_prompt.strip():
        return jsonify({"response": "Le prompt est vide."}), 400
    return jsonify({"response": generate_ai_response(user_prompt)}), 200
