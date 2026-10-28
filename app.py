"""Point d'entrée Flask : configuration et enregistrement des routes."""

import importlib.util
import os
from pathlib import Path

from authlib.integrations.flask_client import OAuth
from flask import Flask, request
from flask_mail import Mail


BASE_DIR = Path(__file__).resolve().parent
SITE_DIR = BASE_DIR / "site"
SECRETS_FILE = Path(
    os.environ.get("MONSITE_SECRETS_FILE", BASE_DIR.parent / "mdp" / "mdp.py")
).expanduser().resolve()


def load_secrets(path):
    if not path.is_file():
        return None
    spec = importlib.util.spec_from_file_location("monsite_secrets", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Impossible de charger le fichier de secrets : {path}")
    secrets = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(secrets)
    return secrets


secrets = load_secrets(SECRETS_FILE)


def get_secret(environment_name, module_name):
    return os.environ.get(environment_name) or getattr(secrets, module_name, "")


app = Flask(
    __name__,
    template_folder=str(SITE_DIR / "templates"),
    static_folder=str(SITE_DIR / "static"),
)
app.config.update(
    MAIL_SERVER="smtp.gmail.com",
    MAIL_PORT=587,
    MAIL_USE_TLS=True,
    MAIL_USERNAME="peugeotclement1@gmail.com",
    MAIL_PASSWORD=get_secret("MAIL_APP_PASSWORD", "MAIL_APP_PASSWORD"),
    MAIL_DEFAULT_SENDER="peugeotclement1@gmail.com",
)

mail = Mail(app)
oauth = OAuth(app)
google = oauth.register(
    name="google",
    client_id=get_secret("GOOGLE_CLIENT_ID", "OauthAppAdminClientId"),
    client_secret=get_secret("GOOGLE_CLIENT_SECRET", "OauthAppAdminCLientSecretCode"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


@app.after_request
def add_api_cors_headers(response):
    """Autorise l'application Expo Web locale à appeler les routes API."""
    if request.path.startswith("/api/"):
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response


from ai_routes import ai_bp
from contact_routes import contact_bp
from portfolio_routes import portfolio_bp
from project_routes import projects_bp

app.register_blueprint(portfolio_bp)
app.register_blueprint(projects_bp)
app.register_blueprint(contact_bp)
app.register_blueprint(ai_bp)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
