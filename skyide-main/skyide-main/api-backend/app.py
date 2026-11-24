import os

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS

from routes.auth import bp as auth_bp
from routes.game import bp as game_bp

load_dotenv()


def _parse_cors_origins():
    configured_origins = os.getenv("CORS_ORIGINS", "")
    origins = [
        origin.strip() for origin in configured_origins.split(",") if origin.strip()
    ]
    return origins or "*"


def create_app(test_config=None):
    app = Flask(__name__)
    app.config.update(
        SECRET_KEY=os.getenv("SECRET_KEY")
        or os.getenv("JWT_SECRET_KEY")
        or "dev-secret-key",
        JWT_SECRET_KEY=os.getenv("JWT_SECRET_KEY")
        or os.getenv("SECRET_KEY")
        or "dev-secret-key",
        CORS_ORIGINS=_parse_cors_origins(),
    )

    if test_config:
        app.config.update(test_config)

    CORS(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        supports_credentials=True,
    )

    app.register_blueprint(game_bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")

    @app.get("/health")
    def health():
        return {"ok": True, "message": "SkyIDE backend running"}

    return app


app = create_app()


if __name__ == "__main__":
    host = os.getenv("FLASK_RUN_HOST", "0.0.0.0")
    port = int(os.getenv("FLASK_RUN_PORT", "5055"))
    debug = os.getenv("FLASK_DEBUG", "false").lower() in {"1", "true", "yes", "on"}
    app.run(host=host, port=port, debug=debug)
