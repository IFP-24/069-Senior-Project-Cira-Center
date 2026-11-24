from flask import Blueprint, request, jsonify, current_app
from pathlib import Path
import json
from services.runner import launch_game

# Mount under /v1 to match the frontend
bp = Blueprint("game", __name__, url_prefix="/v1")

# Always resolve relative to this file: .../api-backend/state
BASE_DIR = Path(__file__).resolve().parent.parent
STATE_DIR = BASE_DIR / "state"
STATE_DIR.mkdir(parents=True, exist_ok=True)


def state_path(game_id: str) -> Path:
    return STATE_DIR / f"{game_id}.json"


@bp.post("/games/<game_id>/config")
def save_config(game_id):
    try:
        body = request.get_json(force=True, silent=True) or {}
        path = state_path(game_id)
        path.write_text(json.dumps(body, indent=2))
        current_app.logger.info(f"[SAVE] {game_id} -> {path}")
        return jsonify({"ok": True, "path": str(path)}), 200
    except Exception as e:
        current_app.logger.exception("Failed to save config")
        return jsonify({"ok": False, "error": str(e)}), 500


@bp.get("/games/<game_id>/config")
def read_config(game_id):
    path = state_path(game_id)
    if not path.exists():
        current_app.logger.info(f"[READ] {game_id} -> not found ({path})")
        return jsonify({}), 200
    try:
        data = json.loads(path.read_text() or "{}")
        current_app.logger.info(f"[READ] {game_id} <- {path}")
        return jsonify(data), 200
    except Exception as e:
        current_app.logger.exception("Failed to read config")
        return jsonify({"ok": False, "error": str(e)}), 500


@bp.post("/games/<game_id>/run")
def run_game(game_id):
    path = state_path(game_id)
    result = launch_game(game_id, path)
    current_app.logger.info(f"[RUN] {game_id} using {path} -> {result}")
    return jsonify(result), 200
