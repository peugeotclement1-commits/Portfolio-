"""Chargement du contexte et génération des réponses de ClémentBot."""

import json
from pathlib import Path


AI_DIR = Path(__file__).resolve().parent / "site" / "portfolio-ai"


def _read_text(filename, fallback=""):
    try:
        return (AI_DIR / filename).read_text(encoding="utf-8")
    except FileNotFoundError:
        return fallback


def load_examples():
    try:
        content = (AI_DIR / "examples.jsonl").read_text(encoding="utf-8")
    except FileNotFoundError:
        return []

    try:
        examples = json.loads(content)
        return examples if isinstance(examples, list) else []
    except json.JSONDecodeError:
        examples = []
        for line in content.splitlines():
            if not line.strip():
                continue
            try:
                examples.append(json.loads(line))
            except json.JSONDecodeError:
                continue
        return examples


def generate_ai_response(user_prompt):
    system_prompt = _read_text(
        "system_prompt.txt",
        "Tu es ClémentBot, l'assistant IA de Clément Peugeot.",
    )
    knowledge = _read_text("knowledege.md")
    examples = load_examples()
    examples_text = "\n".join(
        f"Q: {example.get('prompt', '')}\nA: {example.get('response', '')}"
        for example in examples
    )
    full_prompt = f"""{system_prompt}

### Connaissances supplémentaires :
{knowledge}

### Exemples de conversations :
{examples_text}

### Question de l'utilisateur :
{user_prompt}

Réponds comme Clément le ferait, en utilisant les informations ci-dessus."""

    try:
        import ollama

        response = ollama.generate(
            model="mistral",
            prompt=full_prompt,
            options={"temperature": 0.9, "top_p": 0.9},
        )
        return response["response"].strip()
    except Exception as error:
        return f"Erreur avec Ollama : {error}"
