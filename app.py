############################################################
######################## IMPORTATIONS ######################
############################################################


from pathlib import Path
from flask import Flask, render_template, request, jsonify
from flask_mail import Mail, Message
from authlib.integrations.flask_client import OAuth
import importlib.util
import os
import ollama
import json
import re

#####################################################
######################## PATHS ######################
#####################################################

BASE_DIR = Path(__file__).resolve().parent
SITE_DIR = BASE_DIR / 'site'
PORTFOLIO_AI_DIR = SITE_DIR / 'portfolio-ai'
STOCK_FILE = BASE_DIR / 'stock.json'
DEL_FILE = BASE_DIR / 'del.json'
SECRETS_FILE = Path(
    os.environ.get('MONSITE_SECRETS_FILE', BASE_DIR.parent / 'mdp' / 'mdp.py')
).expanduser().resolve()

###################################################
############# loading secret passwords ############
###################################################
def load_secrets(path: Path):
    """Charge le module de secrets placé hors du dépôt Git."""
    if not path.is_file():
        raise RuntimeError(
            f"Fichier de secrets introuvable : {path}. "
            "Définissez MONSITE_SECRETS_FILE ou créez ce fichier."
        )

    spec = importlib.util.spec_from_file_location('monsite_secrets', path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Impossible de charger le fichier de secrets : {path}")

    secrets = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(secrets)
    return secrets


secrets = load_secrets(SECRETS_FILE)
GOOGLE_CLIENT_ID = secrets.OauthAppAdminClientId
GOOGLE_CLIENT_SECRET = secrets.OauthAppAdminCLientSecretCode
MAIL_APP_PASSWORD = secrets.MAIL_APP_PASSWORD

app = Flask(
    __name__,
    template_folder=str(SITE_DIR / 'templates'),
    static_folder=str(SITE_DIR / 'static'),
)

# --- CONFIGURATION DE FLASK-MAIL ---
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'peugeotclement1@gmail.com'
app.config['MAIL_PASSWORD'] = MAIL_APP_PASSWORD
app.config['MAIL_DEFAULT_SENDER'] = 'peugeotclement1@gmail.com'

mail = Mail(app)

################################################
################# OAuth config #################
################################################


oauth = OAuth(app)
google = oauth.register(
    name='google',
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile'
    }
)

@app.after_request
def add_api_cors_headers(response):
    """Autorise l'application Expo Web locale à appeler les routes API."""
    if request.path.startswith('/api/'):
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:8081'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return response


# --- CHARGEMENT DES FICHIERS DE CONTEXTE ---
def load_system_prompt():
    """Charge le system prompt depuis system_prompt.txt"""
    try:
        with (PORTFOLIO_AI_DIR / 'system_prompt.txt').open(encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return "Tu es ClémentBot, l'assistant IA de Clément Peugeot."


def load_knowledge():
    """Charge les connaissances depuis knowledge.md"""
    try:
        with (PORTFOLIO_AI_DIR / 'knowledege.md').open(encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return ""


def load_examples():
    """Charge les exemples depuis examples.jsonl"""
    try:
        with (PORTFOLIO_AI_DIR / 'examples.jsonl').open(encoding='utf-8') as f:
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

#####################################################################
############################# ROUTES PROJETS ########################
#####################################################################

def read_projects():
    with STOCK_FILE.open(encoding='utf-8') as file:
        return json.load(file)

def sauvegarder_projets(projets):
    with STOCK_FILE.open('w', encoding='utf-8') as fichier:
        json.dump(projets, fichier, indent=4, ensure_ascii=False)

# --- ROUTES ---
@app.route('/')
def index():
    projets=read_projects()
    return render_template('index.html', projets=projets)

@app.route("/api/projets", methods=["POST"])
def ajouter_projet():
    projets = read_projects()

    nouveau_projet = request.get_json(silent=True)
    if not nouveau_projet:
        return jsonify({'message': 'Les données du projet sont manquantes.'}), 400

    projets.append(nouveau_projet)

    sauvegarder_projets(projets)

    return jsonify({
        "message": "Projet ajouté !"
    })

def _index_to_int(index):
    """Convertit les index tels que "[ 01 ]" ou "1" en entier."""
    if isinstance(index, int):
        return index

    match = re.search(r"\d+", str(index))
    return int(match.group()) if match else None


def _format_index(index, original_index):
    """Conserve le format historique "[ 01 ]" lorsque celui-ci est utilisé."""
    if isinstance(original_index, str) and re.fullmatch(r"\s*\[\s*\d+\s*\]\s*", original_index):
        return f"[ {index:02d} ]"
    return index


def reorder_index(projets, index_supprime):
    """Décale d'une position les projets placés après celui supprimé."""
    for projet in projets:
        index_projet = _index_to_int(projet.get("index"))
        if index_projet is not None and index_projet > index_supprime:
            projet["index"] = _format_index(index_projet - 1, projet["index"])


@app.route("/api/projetssupp", methods=["POST"])
def supprimer_projet():
    donnees = request.get_json(silent=True) or {}
    nom = donnees.get("nom")
    index = _index_to_int(donnees.get("index"))

    if not nom or index is None:
        return jsonify({"message": "Le nom et l'index du projet sont requis."}), 400

    projets = read_projects()
    position = next(
        (
            position
            for position, projet in enumerate(projets)
            if projet.get("nom") == nom and _index_to_int(projet.get("index")) == index
        ),
        None,
    )

    if position is None:
        return jsonify({"message": "Projet introuvable."}), 404

    projets.pop(position)
    reorder_index(projets, index)

    sauvegarder_projets(projets)

    return jsonify({
        "message": "Projet supprimé"
    })


        


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
