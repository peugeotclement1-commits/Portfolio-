############################################################
######################## IMPORTATIONS ######################
############################################################


from pathlib import Path
from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from flask_mail import Mail, Message
from authlib.integrations.flask_client import OAuth
import importlib.util
import os
import ollama
import json
import re
import base64
import requests

#####################################################
######################## PATHS ######################
#####################################################

BASE_DIR = Path(__file__).resolve().parent
SITE_DIR = BASE_DIR / 'site'
PORTFOLIO_AI_DIR = SITE_DIR / 'portfolio-ai'
STOCK_FILE = BASE_DIR / 'stock.json'
DEL_FILE = BASE_DIR / 'del.json'
TOKEN_FILE = BASE_DIR / 'gmail_token.json'
SECRETS_FILE = Path(
    os.environ.get('MONSITE_SECRETS_FILE', BASE_DIR.parent / 'mdp' / 'mdp.py')
).expanduser().resolve()

###################################################
############# loading secret passwords ############
###################################################
def load_secrets(path: Path):
    """Charge le module de secrets placé hors du dépôt Git, si présent."""
    if not path.is_file():
        return None

    spec = importlib.util.spec_from_file_location('monsite_secrets', path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Impossible de charger le fichier de secrets : {path}")

    secrets = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(secrets)
    return secrets


secrets = load_secrets(SECRETS_FILE)


def get_secret(environment_name, module_name):
    """Privilégie les variables d'environnement aux secrets locaux."""
    return os.environ.get(environment_name) or getattr(secrets, module_name, "")


GOOGLE_CLIENT_ID = get_secret('GOOGLE_CLIENT_ID', 'OauthAppAdminClientId')
GOOGLE_CLIENT_SECRET = get_secret('GOOGLE_CLIENT_SECRET', 'OauthAppAdminCLientSecretCode')
MAIL_APP_PASSWORD = get_secret('MAIL_APP_PASSWORD', 'MAIL_APP_PASSWORD')

app = Flask(
    __name__,
    template_folder=str(SITE_DIR / 'templates'),
    static_folder=str(SITE_DIR / 'static'),
)
app.secret_key = get_secret('FLASK_SECRET_KEY', 'FLASK_SECRET_KEY') or 'monsite-secret-key-2026'

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
        'scope': 'openid email profile https://www.googleapis.com/auth/gmail.readonly'
    }
)

@app.after_request
def add_api_cors_headers(response):
    """Autorise l'application Expo Web locale à appeler les routes API."""
    if request.path.startswith('/api/') or request.path.startswith('/auth/'):
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
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
            examples = []
            for line in f:
                if not line.strip():
                    continue
                try:
                    examples.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
            return examples
    except FileNotFoundError:
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

@app.route("/api/projets", methods=["GET", "POST", "OPTIONS"])
def gerer_projets():
    if request.method == "OPTIONS":
        return "", 204
    if request.method == "GET":
        return jsonify(read_projects())

    projets = read_projects()

    nouveau_projet = request.get_json(silent=True)
    if not nouveau_projet:
        return jsonify({'message': 'Les données du projet sont manquantes.'}), 400

    projets.append(nouveau_projet)

    sauvegarder_projets(projets)

    return jsonify({
        "message": "Projet ajouté !",
        "projets": projets
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


@app.route("/api/projetssupp", methods=["POST", "OPTIONS"])
def supprimer_projet():
    if request.method == "OPTIONS":
        return "", 204
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
        "message": "Projet supprimé",
        "projets": projets
    })


        


#####################################################################
############################# OAUTH & GMAIL #########################
#####################################################################

def extract_body(payload):
    """Extrait le contenu texte d'un payload de message Gmail."""
    body = ""
    if 'parts' in payload:
        for part in payload['parts']:
            if part.get('mimeType') == 'text/plain' and 'data' in part.get('body', {}):
                try:
                    body += base64.urlsafe_b64decode(part['body']['data']).decode('utf-8', errors='ignore')
                except Exception:
                    pass
            elif 'parts' in part:
                body += extract_body(part)
    elif 'body' in payload and 'data' in payload['body']:
        try:
            body = base64.urlsafe_b64decode(payload['body']['data']).decode('utf-8', errors='ignore')
        except Exception:
            pass
    return body.strip()


def load_gmail_token():
    if not TOKEN_FILE.is_file():
        return None
    try:
        with TOKEN_FILE.open('r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return None


def refresh_gmail_token(token):
    if not token or 'refresh_token' not in token:
        return token
    try:
        data = {
            'client_id': GOOGLE_CLIENT_ID,
            'client_secret': GOOGLE_CLIENT_SECRET,
            'refresh_token': token['refresh_token'],
            'grant_type': 'refresh_token'
        }
        res = requests.post('https://oauth2.googleapis.com/token', data=data, timeout=5)
        if res.ok:
            new_data = res.json()
            token['access_token'] = new_data.get('access_token', token.get('access_token'))
            with TOKEN_FILE.open('w', encoding='utf-8') as f:
                json.dump(token, f, indent=4)
    except Exception as e:
        print("Erreur lors du refresh token :", e)
    return token


@app.route('/auth/login')
def auth_login():
    redirect_uri = url_for('auth_callback', _external=True)
    return google.authorize_redirect(redirect_uri, access_type='offline', prompt='consent')


@app.route('/auth/callback')
def auth_callback():
    try:
        token = google.authorize_access_token()
        with TOKEN_FILE.open('w', encoding='utf-8') as f:
            json.dump(token, f, indent=4)
    except Exception as e:
        print("Erreur auth_callback :", e)
    return redirect('http://localhost:8081')


@app.route('/auth/logout', methods=['GET', 'POST', 'OPTIONS'])
def auth_logout():
    if request.method == 'OPTIONS':
        return '', 204
    if TOKEN_FILE.is_file():
        try:
            TOKEN_FILE.unlink()
        except Exception:
            pass
    return jsonify({'authenticated': False, 'message': 'Déconnecté avec succès.'})


@app.route('/api/gmail/status')
def gmail_status():
    token = load_gmail_token()
    if not token or 'access_token' not in token:
        return jsonify({'authenticated': False})
    
    userinfo = token.get('userinfo') or {}
    email = userinfo.get('email')
    if not email:
        try:
            resp = requests.get(
                'https://www.googleapis.com/oauth2/v2/userinfo',
                headers={'Authorization': f"Bearer {token['access_token']}"},
                timeout=5
            )
            if resp.ok:
                email = resp.json().get('email')
        except Exception:
            pass
            
    return jsonify({
        'authenticated': True,
        'email': email or 'peugeotclement1@gmail.com'
    })


@app.route('/api/gmail/messages')
def gmail_messages():
    token = load_gmail_token()
    if not token or 'access_token' not in token:
        return jsonify({'authenticated': False, 'messages': []})

    headers = {'Authorization': f"Bearer {token['access_token']}"}
    url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages'
    params = {'maxResults': 15, 'q': 'label:"Portfolio Contact"'}
    
    try:
        resp = requests.get(url, headers=headers, params=params, timeout=7)
        if resp.status_code == 401:
            token = refresh_gmail_token(token)
            headers = {'Authorization': f"Bearer {token['access_token']}"}
            resp = requests.get(url, headers=headers, params=params, timeout=7)
            
        if not resp.ok:
            params = {'maxResults': 10}
            resp = requests.get(url, headers=headers, params=params, timeout=7)

        data = resp.json() if resp.ok else {}
        message_items = data.get('messages', [])
        
        if not message_items:
            params = {'maxResults': 10, 'q': 'Portfolio'}
            resp = requests.get(url, headers=headers, params=params, timeout=7)
            if resp.ok:
                message_items = resp.json().get('messages', [])

        messages_detail = []
        for item in message_items:
            msg_id = item['id']
            msg_resp = requests.get(f"{url}/{msg_id}?format=full", headers=headers, timeout=5)
            if msg_resp.ok:
                msg_data = msg_resp.json()
                msg_headers = {h['name'].lower(): h['value'] for h in msg_data.get('payload', {}).get('headers', [])}
                body_text = extract_body(msg_data.get('payload', {}))
                snippet = msg_data.get('snippet', '')
                
                messages_detail.append({
                    'id': msg_id,
                    'from': msg_headers.get('from', 'Inconnu'),
                    'to': msg_headers.get('to', ''),
                    'subject': msg_headers.get('subject', '(Sans objet)'),
                    'date': msg_headers.get('date', ''),
                    'snippet': snippet,
                    'body': body_text or snippet,
                    'unread': 'UNREAD' in msg_data.get('labelIds', []),
                })

        return jsonify({'authenticated': True, 'messages': messages_detail})
    except Exception as e:
        return jsonify({'authenticated': True, 'messages': [], 'error': str(e)})


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
    data = request.get_json(silent=True) or {}
    user_prompt = data.get('prompt', '')
    
    if not isinstance(user_prompt, str) or not user_prompt.strip():
        return jsonify({'response': 'Le prompt est vide.'}), 400
    
    ai_response = generate_ai_response(user_prompt)
    return jsonify({'response': ai_response}), 200


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
