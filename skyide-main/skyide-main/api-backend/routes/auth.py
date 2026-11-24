import pathlib
import os
from db import get_connection, release_connection
import json

from flask_cors import CORS
import resend
from datetime import datetime, timedelta

import bcrypt
from flask import Blueprint, Flask, current_app, jsonify, request

BASE = pathlib.Path(__file__).parent
CONFIG = BASE / "config.json"

app = Flask(__name__)
CORS(
    app,
    resources={r"/api/*": {"origins": "http://100.50.46.36:3000"}},
    supports_credentials=True,
)

try:
    import jwt
except ImportError:
    jwt = None

bp = Blueprint("auth", __name__)

# In production, use environment variables
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
RESEND_KEY = os.getenv("RESEND_API_KEY")


def get_secret_key():
    return (
        current_app.config.get("JWT_SECRET_KEY")
        or current_app.config.get("SECRET_KEY")
        or "dev-secret-key"
    )


def error_response(message, status_code):
    return jsonify({"error": message, "message": message}), status_code


def generate_token(user_id, username):
    payload = {
        "user_id": user_id,
        "username": username,
        "exp": datetime.utcnow() + timedelta(days=1),
    }
    return jwt.encode(payload, get_secret_key(), algorithm="HS256")


def verify_token(token):
    try:
        return jwt.decode(token, get_secret_key(), algorithms=["HS256"])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def get_request_json():
    return request.get_json(silent=True) or {}


def close_db_resources(connection=None, cursor=None):
    if cursor is not None:
        try:
            cursor.close()
        except Exception:
            pass

    if connection is not None:
        try:
            release_connection(connection)
        except Exception:
            pass


def rollback_connection(connection):
    if connection is not None:
        try:
            connection.rollback()
        except Exception:
            pass


def get_user_from_token():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None, error_response("No token provided", 401)

    token = auth_header.split(" ", 1)[1]
    payload = verify_token(token)
    if not payload:
        return None, error_response("Invalid or expired token", 401)

    return payload, None


def serialize_project_code(project_file):
    if isinstance(project_file, str):
        return project_file
    return json.dumps(project_file)


def deserialize_project_code(project_file):
    if not isinstance(project_file, str):
        return project_file

    try:
        return json.loads(project_file)
    except json.JSONDecodeError:
        return project_file


@bp.route("/register", methods=["POST"])
def register():
    connection = None
    cursor = None

    try:
        data = get_request_json()
        username = (data.get("username") or "").strip()
        email = (data.get("email") or "").strip() or None
        password = data.get("password") or ""

        if not username or not password:
            return error_response(
                "Username and password are required for registration", 400
            )

        if len(password) < 6:
            return error_response("Password must be at least 6 characters long", 400)

        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute("SELECT id FROM accounts WHERE username=%s", (username,))
        if cursor.fetchone():
            return error_response("Email or Username Already Exist", 409)

        if email:
            cursor.execute("SELECT id FROM accounts WHERE email=%s", (email,))
            if cursor.fetchone():
                return error_response("Email or Username Already Exist", 409)

        encrypted_password = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

        cursor.execute(
            "INSERT INTO accounts (username, passhash, email) VALUES (%s, %s, %s) RETURNING id",
            (username, encrypted_password, email),
        )
        user_id = cursor.fetchone()[0]
        connection.commit()

        token = generate_token(user_id, username)
        return (
            jsonify(
                {
                    "message": "User registered successfully",
                    "token": token,
                    "user": {"id": user_id, "username": username, "email": email},
                }
            ),
            201,
        )
    except Exception as exc:
        rollback_connection(connection)
        return jsonify({"error": str(exc)}), 500
    finally:
        close_db_resources(connection=connection, cursor=cursor)


@bp.route("/contact-us", methods=["POST"])
def contactus():
    try:
        data = request.get_json()
        email = data.get("email")
        description = data.get("description")
        if not email or not description:
            return (
                jsonify({"message": "Username and password is needed for login"}),
                400,
            )
        resend.api_key = RESEND_KEY

        params = {
            "from": "SkyIDE <contact-us@skyscrapergames.org>",
            "to": ["skyscrapergamescontact@gmail.com"],
            "subject": "Client Contact",
            "html": f"""
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <p><strong>From:</strong> {email} </p>
                    <p><strong>Description:</strong> {description} </p>
                </div>
            """,
        }
        send = resend.Emails.send(params)  # noqa: F841
        return jsonify(
            {
                "message": "Successful",
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/login", methods=["POST"])
def login():
    connection = None
    cursor = None

    try:
        data = get_request_json()
        username = (data.get("username") or "").strip()
        password = data.get("password") or ""

        if not username or not password:
            return error_response("Username and password are required for login", 400)

        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute("SELECT * FROM accounts WHERE username=%s", (username,))
        result = cursor.fetchone()

        if not result:
            return error_response("Username or password is invalid", 400)

        user_id = result[0]
        passhash = result[2]
        email = result[3]

        if not bcrypt.checkpw(password.encode(), passhash.encode()):
            return error_response("Username or password is invalid", 400)

        token = generate_token(user_id, username)
        return jsonify(
            {
                "message": "Login successful",
                "token": token,
                "user": {"id": user_id, "username": username, "email": email},
            }
        )
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        close_db_resources(connection=connection, cursor=cursor)


@bp.route("/logout", methods=["POST"])
def logout():
    return jsonify({"message": "Logged out successfully"})


@bp.route("/verify", methods=["GET"])
def verify():
    payload, auth_error = get_user_from_token()
    if auth_error:
        return auth_error

    return jsonify(
        {"user": {"id": payload["user_id"], "username": payload["username"]}}
    )


@bp.route("/get-existing-projects", methods=["GET"])
def get_existing_projects():
    payload, auth_error = get_user_from_token()
    if auth_error:
        return auth_error

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute(
            "SELECT name FROM projects WHERE account_id=%s ORDER BY name ASC",
            (payload["user_id"],),
        )
        projects = [row[0] for row in cursor.fetchall()]
        return (
            jsonify(
                {
                    "message": "Successfully pulled existing project names",
                    "projects": projects,
                }
            ),
            200,
        )
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        close_db_resources(connection=connection, cursor=cursor)


@bp.route("/load-project/<project_name>", methods=["GET"])
def load_project(project_name):
    payload, auth_error = get_user_from_token()
    if auth_error:
        return auth_error

    if not project_name:
        return error_response("Project name is missing", 400)

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute(
            "SELECT code FROM projects WHERE account_id=%s AND name=%s",
            (payload["user_id"], project_name),
        )
        result = cursor.fetchone()

        if not result:
            return error_response("Project not found", 400)

        return (
            jsonify(
                {
                    "message": "Project successfully loaded",
                    "projectFile": deserialize_project_code(result[0]),
                }
            ),
            200,
        )
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        close_db_resources(connection=connection, cursor=cursor)


@bp.route("/save-project/<project_name>", methods=["POST"])
def save_project(project_name):
    payload, auth_error = get_user_from_token()
    if auth_error:
        return auth_error

    data = get_request_json()
    project_file = data.get("projectFile")

    if not project_name or project_file is None:
        return error_response("Project name or project file is missing", 400)

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute(
            "SELECT id FROM projects WHERE account_id=%s AND name=%s",
            (payload["user_id"], project_name),
        )
        existing = cursor.fetchone()

        serialized_project = serialize_project_code(project_file)
        if existing:
            cursor.execute(
                "UPDATE projects SET code=%s WHERE id=%s",
                (serialized_project, existing[0]),
            )
        else:
            cursor.execute(
                "INSERT INTO projects (account_id, name, code) VALUES (%s, %s, %s)",
                (payload["user_id"], project_name, serialized_project),
            )

        connection.commit()
        return jsonify({"message": "Project successfully saved"}), 200
    except Exception as exc:
        rollback_connection(connection)
        return jsonify({"error": str(exc)}), 500
    finally:
        close_db_resources(connection=connection, cursor=cursor)


@bp.route("/delete-project/<project_name>", methods=["DELETE"])
def delete_project(project_name):
    payload, auth_error = get_user_from_token()
    if auth_error:
        return auth_error

    if not project_name:
        return error_response("Project name is missing", 400)

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute(
            "DELETE FROM projects WHERE account_id=%s AND name=%s RETURNING id",
            (payload["user_id"], project_name),
        )
        deleted = cursor.fetchone()
        connection.commit()

        if not deleted:
            return error_response("Project not found", 400)

        return jsonify({"message": "Project successfully deleted"}), 200
    except Exception as exc:
        rollback_connection(connection)
        return jsonify({"error": str(exc)}), 500
    finally:
        close_db_resources(connection=connection, cursor=cursor)


@bp.route("/duplicate-project/<project_name>", methods=["POST"])
def duplicate_project(project_name):
    payload, auth_error = get_user_from_token()
    if auth_error:
        return auth_error

    if not project_name:
        return error_response("Project name is missing", 400)

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute(
            "SELECT code FROM projects WHERE account_id=%s AND name=%s",
            (payload["user_id"], project_name),
        )
        project = cursor.fetchone()
        if not project:
            return error_response("Project not found", 400)

        project_code = serialize_project_code(project[0])
        new_name = f"{project_name}_copy"
        attempt = 0

        while True:
            cursor.execute(
                "SELECT id FROM projects WHERE account_id=%s AND name=%s",
                (payload["user_id"], new_name),
            )
            if not cursor.fetchone():
                break
            attempt += 1
            new_name = f"{project_name}_copy_{attempt}"

        cursor.execute(
            "INSERT INTO projects (account_id, name, code) VALUES (%s, %s, %s)",
            (payload["user_id"], new_name, project_code),
        )
        connection.commit()

        return (
            jsonify(
                {
                    "message": "Project successfully duplicated",
                    "newProjectName": new_name,
                }
            ),
            200,
        )
    except Exception as exc:
        rollback_connection(connection)
        return jsonify({"error": str(exc)}), 500
    finally:
        close_db_resources(connection=connection, cursor=cursor)


@bp.route("/rename-project/<project_name>", methods=["PUT"])
def rename_project(project_name):
    payload, auth_error = get_user_from_token()
    if auth_error:
        return auth_error

    data = get_request_json()
    new_name = (data.get("newProjectName") or "").strip()

    if not project_name or not new_name:
        return error_response("Project name or new project name is missing", 400)

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute(
            "SELECT id FROM projects WHERE account_id=%s AND name=%s",
            (payload["user_id"], project_name),
        )
        original = cursor.fetchone()
        if not original:
            return error_response("Project not found", 400)

        cursor.execute(
            "SELECT id FROM projects WHERE account_id=%s AND name=%s",
            (payload["user_id"], new_name),
        )
        existing = cursor.fetchone()
        if existing and existing[0] != original[0]:
            return error_response("Project name already exists", 409)

        cursor.execute(
            "UPDATE projects SET name=%s WHERE id=%s", (new_name, original[0])
        )
        connection.commit()
        return jsonify({"message": "Project successfully renamed"}), 200
    except Exception as exc:
        rollback_connection(connection)
        return jsonify({"error": str(exc)}), 500
    finally:
        close_db_resources(connection=connection, cursor=cursor)
