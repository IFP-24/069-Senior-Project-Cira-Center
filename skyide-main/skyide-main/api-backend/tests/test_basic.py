import bcrypt
import pytest

import routes.auth as auth_routes
from app import create_app


class FakeDatabase:
    def __init__(self):
        self.accounts = []
        self.projects = []
        self.next_account_id = 1
        self.next_project_id = 1

    def seed_user(self, username, password, email=None):
        passhash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        account = {
            "id": self.next_account_id,
            "username": username,
            "passhash": passhash,
            "email": email,
        }
        self.accounts.append(account)
        self.next_account_id += 1
        return account

    def find_account_by_username(self, username):
        return next(
            (account for account in self.accounts if account["username"] == username),
            None,
        )

    def find_account_by_email(self, email):
        return next(
            (account for account in self.accounts if account["email"] == email), None
        )

    def find_account_by_id(self, account_id):
        return next(
            (account for account in self.accounts if account["id"] == account_id), None
        )

    def find_project(self, account_id, name):
        return next(
            (
                project
                for project in self.projects
                if project["account_id"] == account_id and project["name"] == name
            ),
            None,
        )

    def find_project_by_id(self, project_id):
        return next(
            (project for project in self.projects if project["id"] == project_id), None
        )


class FakeCursor:
    def __init__(self, database):
        self.database = database
        self.result = None
        self.closed = False

    def execute(self, query, params=None):
        normalized_query = " ".join(query.split())
        params = params or ()
        self.result = None

        if normalized_query == "SELECT id FROM accounts WHERE username=%s":
            username = params[0]
            account = self.database.find_account_by_username(username)
            self.result = (account["id"],) if account else None
            return

        if normalized_query == "SELECT id FROM accounts WHERE email=%s":
            email = params[0]
            account = self.database.find_account_by_email(email)
            self.result = (account["id"],) if account else None
            return

        if (
            normalized_query
            == "INSERT INTO accounts (username, passhash, email) VALUES (%s, %s, %s) RETURNING id"
        ):
            username, passhash, email = params
            account = {
                "id": self.database.next_account_id,
                "username": username,
                "passhash": passhash,
                "email": email,
            }
            self.database.accounts.append(account)
            self.database.next_account_id += 1
            self.result = (account["id"],)
            return

        if normalized_query == "SELECT * FROM accounts WHERE username=%s":
            username = params[0]
            account = self.database.find_account_by_username(username)
            if account:
                self.result = (
                    account["id"],
                    account["username"],
                    account["passhash"],
                    account["email"],
                )
            else:
                self.result = None
            return

        if (
            normalized_query
            == "SELECT name FROM projects WHERE account_id=%s ORDER BY name ASC"
        ):
            account_id = params[0]
            projects = [
                (project["name"],)
                for project in sorted(
                    self.database.projects,
                    key=lambda project: project["name"],
                )
                if project["account_id"] == account_id
            ]
            self.result = projects
            return

        if (
            normalized_query
            == "SELECT code FROM projects WHERE account_id=%s AND name=%s"
        ):
            account_id, name = params
            project = self.database.find_project(account_id, name)
            self.result = (project["code"],) if project else None
            return

        if (
            normalized_query
            == "SELECT id FROM projects WHERE account_id=%s AND name=%s"
        ):
            account_id, name = params
            project = self.database.find_project(account_id, name)
            self.result = (project["id"],) if project else None
            return

        if normalized_query == "UPDATE projects SET code=%s WHERE id=%s":
            code, project_id = params
            project = self.database.find_project_by_id(project_id)
            project["code"] = code
            return

        if (
            normalized_query
            == "INSERT INTO projects (account_id, name, code) VALUES (%s, %s, %s)"
        ):
            account_id, name, code = params
            project = {
                "id": self.database.next_project_id,
                "account_id": account_id,
                "name": name,
                "code": code,
            }
            self.database.projects.append(project)
            self.database.next_project_id += 1
            return

        if (
            normalized_query
            == "DELETE FROM projects WHERE account_id=%s AND name=%s RETURNING id"
        ):
            account_id, name = params
            project = self.database.find_project(account_id, name)
            if project:
                self.database.projects.remove(project)
                self.result = (project["id"],)
            else:
                self.result = None
            return

        if normalized_query == "UPDATE projects SET name=%s WHERE id=%s":
            new_name, project_id = params
            project = self.database.find_project_by_id(project_id)
            project["name"] = new_name
            return

        raise AssertionError(f"Unhandled query in test double: {normalized_query}")

    def fetchone(self):
        if isinstance(self.result, list):
            return self.result.pop(0) if self.result else None
        return self.result

    def fetchall(self):
        if isinstance(self.result, list):
            rows = list(self.result)
            self.result = []
            return rows
        if self.result is None:
            return []
        return [self.result]

    def close(self):
        self.closed = True


class FakeConnection:
    def __init__(self, database):
        self.database = database
        self.committed = False
        self.rolled_back = False

    def cursor(self):
        return FakeCursor(self.database)

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True


@pytest.fixture
def fake_db():
    database = FakeDatabase()
    database.seed_user("existinguser", "correct-password", "existing@example.com")
    return database


@pytest.fixture
def client(fake_db, monkeypatch):
    monkeypatch.setattr(auth_routes, "get_connection", lambda: FakeConnection(fake_db))
    monkeypatch.setattr(auth_routes, "release_connection", lambda conn: None)

    app = create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "test-secret",
            "JWT_SECRET_KEY": "test-secret",
            "CORS_ORIGINS": ["http://localhost:5173"],
        }
    )
    return app.test_client()


def test_create_app_defaults_to_permissive_cors_when_env_is_unset(monkeypatch):
    monkeypatch.delenv("CORS_ORIGINS", raising=False)

    app = create_app(
        {
            "TESTING": True,
            "SECRET_KEY": "test-secret",
            "JWT_SECRET_KEY": "test-secret",
        }
    )

    assert app.config["CORS_ORIGINS"] == "*"


def login_and_get_token(client):
    response = client.post(
        "/api/auth/login",
        json={"username": "existinguser", "password": "correct-password"},
    )
    assert response.status_code == 200
    return response.get_json()["token"]


def test_register_creates_user_with_optional_email(client, fake_db):
    response = client.post(
        "/api/auth/register",
        json={"username": "newuser", "email": "", "password": "secret123"},
    )

    payload = response.get_json()

    assert response.status_code == 201
    assert payload["message"] == "User registered successfully"
    assert payload["user"]["username"] == "newuser"
    assert payload["user"]["email"] is None
    assert payload["token"]
    assert fake_db.find_account_by_username("newuser") is not None


def test_register_rejects_duplicate_username_or_email(client):
    duplicate_username = client.post(
        "/api/auth/register",
        json={
            "username": "existinguser",
            "email": "new@example.com",
            "password": "secret123",
        },
    )
    duplicate_email = client.post(
        "/api/auth/register",
        json={
            "username": "otheruser",
            "email": "existing@example.com",
            "password": "secret123",
        },
    )

    assert duplicate_username.status_code == 409
    assert duplicate_username.get_json()["error"] == "Email or Username Already Exist"
    assert duplicate_email.status_code == 409
    assert duplicate_email.get_json()["error"] == "Email or Username Already Exist"


def test_login_and_verify_flow(client):
    login_response = client.post(
        "/api/auth/login",
        json={"username": "existinguser", "password": "correct-password"},
    )

    login_payload = login_response.get_json()

    assert login_response.status_code == 200
    assert login_payload["message"] == "Login successful"
    assert login_payload["user"]["username"] == "existinguser"

    verify_response = client.get(
        "/api/auth/verify",
        headers={"Authorization": f"Bearer {login_payload['token']}"},
    )

    assert verify_response.status_code == 200
    assert verify_response.get_json()["user"] == {
        "id": login_payload["user"]["id"],
        "username": "existinguser",
    }


def test_project_crud_flow(client, fake_db):
    token = login_and_get_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    project_payload = {"blocks": [{"type": "print", "text": "hello"}]}
    updated_payload = {"blocks": [{"type": "print", "text": "updated"}]}

    save_response = client.post(
        "/api/auth/save-project/demo-project",
        json={"projectFile": project_payload},
        headers=headers,
    )
    update_response = client.post(
        "/api/auth/save-project/demo-project",
        json={"projectFile": updated_payload},
        headers=headers,
    )
    list_response = client.get("/api/auth/get-existing-projects", headers=headers)
    load_response = client.get("/api/auth/load-project/demo-project", headers=headers)
    duplicate_response = client.post(
        "/api/auth/duplicate-project/demo-project", headers=headers
    )
    rename_response = client.put(
        "/api/auth/rename-project/demo-project_copy",
        json={"newProjectName": "renamed-project"},
        headers=headers,
    )
    delete_response = client.delete(
        "/api/auth/delete-project/renamed-project", headers=headers
    )
    final_list_response = client.get("/api/auth/get-existing-projects", headers=headers)

    assert save_response.status_code == 200
    assert update_response.status_code == 200
    assert list_response.get_json()["projects"] == ["demo-project"]
    assert load_response.get_json()["projectFile"] == updated_payload
    assert duplicate_response.status_code == 200
    assert duplicate_response.get_json()["newProjectName"] == "demo-project_copy"
    assert rename_response.status_code == 200
    assert delete_response.status_code == 200
    assert final_list_response.get_json()["projects"] == ["demo-project"]
    assert fake_db.find_project(1, "renamed-project") is None
