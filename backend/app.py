from flask import Flask, render_template, request, jsonify
from flask_mail import Mail, Message
import ollama
import json

app = Flask(__name__)

# --- CONFIGURATION DE FLASK-MAIL ---
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'peugeotclement1@gmail.com'
app.config['MAIL_PASSWORD'] = 'cxqxoaccskrdhrza'  # À remplacer par un mot de passe d'application
app.config['MAIL_DEFAULT_SENDER'] = 'peugeotclement1@gmail.com'

mail = Mail(app)


# --- CHARGEMENT DES FICHIERS DE CONTEXTE ---
def load_system_prompt():
    """Charge le system prompt depuis system_prompt.txt"""
    try:
        with open('portfolio-ai/system_prompt.txt', 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return "Tu es ClémentBot, l'assistant IA de Clément Peugeot."


def load_knowledge():
    """Charge les connaissances depuis knowledge.md"""
    try:
        with open('portfolio-ai/knowledge.md', 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return ""


def load_examples():
    """Charge les exemples depuis examples.jsonl"""
    try:
        with open('portfolio-ai/examples.jsonl', 'r', encoding='utf-8') as f:
            return [json.loads(line) for line in f]
    except (FileNotFoundError, json.JSONDecodeError):
        return []


# --- FONCTION POUR GÉNÉRER UNE RÉPONSE AVEC OLLAMA ---
def generate_ai_response(user_prompt):
    """
    Génère une réponse en combinant le system prompt, les connaissances, et les exemples.
    """
    system_prompt = load_system_prompt()
    knowledge = load_knowledge()
    examples = load_examples()
    
    # Construction du prompt complet
    full_prompt = f"""{system_prompt}

### Connaissances supplémentaires :
{knowledge}

### Exemples de conversations :
{chr(10).join([f'Q: {ex["prompt"]}\nA: {ex["response"]}' for ex in examples])}

### Question de l'utilisateur :
{user_prompt}

Réponds comme Clément le ferait, en utilisant les informations ci-dessus."""
    
    # Appel à Ollama
    try:
        response = ollama.generate(
            model='mistral',  # ou 'llama2' si vous préférez
            prompt=full_prompt,
            options={
                'temperature': 0.7,  # 0.0 = déterministe, 1.0 = créatif
                'top_p': 0.9,
            }
        )
        return response['response'].strip()
    except Exception as e:
        return f"Erreur avec Ollama : {str(e)}"


# --- ROUTES ---
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/envoi', methods=['POST'])
def envoi_email():
    nom = request.form.get('name')
    email_visiteur = request.form.get('email')
    message_contenu = request.form.get('message')
    
    msg = Message(
        subject=f"Nouveau message de {nom} via le Portfolio",
        recipients=['peugeotclement1@gmail.com'],
        body=f"Nom: {nom}\nEmail du contact: {email_visiteur}\n\nMessage:\n{message_contenu}"
    )
    
    try:
        mail.send(msg)
        return jsonify({'status': 'success', 'message': 'Email envoyé'}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/ai', methods=['POST'])
def ai_bot():
    data = request.get_json()
    user_prompt = data.get('prompt', '')
    
    if not user_prompt:
        return jsonify({'response': 'Le prompt est vide.'}), 400
    
    ai_response = generate_ai_response(user_prompt)
    return jsonify({'response': ai_response}), 200


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)