from datetime import date
from uuid import uuid4

import psycopg
import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.modules.account import router as account_router


class CapturingNotificationService:
    def __init__(self) -> None:
        self.email_codes: dict[str, str] = {}
        self.phone_codes: dict[str, str] = {}
        self.reset_tokens: dict[str, str] = {}

    def send_email_verification(self, email: str, code: str) -> None:
        self.email_codes[email] = code

    def send_phone_verification(self, phone: str, code: str) -> None:
        self.phone_codes[phone] = code

    def send_password_reset(self, email: str, token: str) -> None:
        self.reset_tokens[email] = token


@pytest.fixture()
def notifications(monkeypatch: pytest.MonkeyPatch) -> CapturingNotificationService:
    service = CapturingNotificationService()
    monkeypatch.setattr(account_router, "ConsoleNotificationService", lambda: service)
    return service


@pytest.fixture()
def client(notifications: CapturingNotificationService) -> TestClient:
    return TestClient(app)


@pytest.fixture()
def test_emails():
    emails: list[str] = []
    yield emails
    with psycopg.connect(settings.database_url) as connection:
        for email in emails:
            connection.execute("DELETE FROM account.pending_registrations WHERE lower(email) = lower(%s)", (email,))
            connection.execute("DELETE FROM account.users WHERE lower(email) = lower(%s)", (email,))


def _test_email(test_emails: list[str]) -> str:
    email = f"integration-{uuid4().hex}@example.com"
    test_emails.append(email)
    return email


def _test_phone() -> str:
    return f"+48{uuid4().int % 10_000_000_000:010d}"


def _start_registration(client: TestClient, email: str, phone: str | None = None) -> str:
    response = client.post(
        "/account/register/start",
        json={
            "first_name": "Jan",
            "last_name": "Kowalski",
            "birth_date": date(2000, 1, 1).isoformat(),
            "email": email,
            "phone": phone,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()["registration_id"]


def _register_user(
    client: TestClient,
    notifications: CapturingNotificationService,
    email: str,
    phone: str | None = None,
    password: str = "Strong12!",
) -> dict:
    registration_id = _start_registration(client, email, phone)
    email_code = notifications.email_codes[email]

    response = client.post("/account/register/verify-email", json={"registration_id": registration_id, "code": email_code})
    assert response.status_code == 204, response.text
    if phone is not None:
        phone_code = notifications.phone_codes[phone]
        response = client.post("/account/register/verify-phone", json={"registration_id": registration_id, "code": phone_code})
        assert response.status_code == 204, response.text

    response = client.post(
        "/account/register/complete",
        json={
            "registration_id": registration_id,
            "password": password,
            "password_confirmation": password,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_health_and_account_status(client: TestClient) -> None:
    assert client.get("/health").json() == {"status": "ok"}
    assert client.get("/account/status").json() == {"module": "account", "status": "ok"}


def test_account_registration_login_refresh_logout_flow(
    client: TestClient,
    notifications: CapturingNotificationService,
    test_emails: list[str],
) -> None:
    email = _test_email(test_emails)
    phone = _test_phone()

    created_user = _register_user(client, notifications, email, phone)
    assert created_user["email"] == email
    assert created_user["phone"] == phone

    login_response = client.post("/account/login", json={"email": email, "password": "Strong12!"})
    assert login_response.status_code == 200, login_response.text
    tokens = login_response.json()

    me_response = client.get("/account/me", headers={"Authorization": f"Bearer {tokens['access_token']}"})
    assert me_response.status_code == 200, me_response.text
    assert me_response.json()["email"] == email

    theme_response = client.put(
        "/account/theme",
        json={"theme": "dark"},
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert theme_response.status_code == 200, theme_response.text
    assert theme_response.json() == {"theme": "dark"}

    refresh_response = client.post("/account/token/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert refresh_response.status_code == 200, refresh_response.text
    refreshed = refresh_response.json()
    assert refreshed["refresh_token"] != tokens["refresh_token"]

    reused_response = client.post("/account/token/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert reused_response.status_code == 401

    logout_response = client.post("/account/logout", json={"refresh_token": refreshed["refresh_token"]})
    assert logout_response.status_code == 204
    after_logout_response = client.post("/account/token/refresh", json={"refresh_token": refreshed["refresh_token"]})
    assert after_logout_response.status_code == 401


def test_registration_errors_are_returned_as_http_responses(
    client: TestClient,
    notifications: CapturingNotificationService,
    test_emails: list[str],
) -> None:
    email = _test_email(test_emails)
    registration_id = _start_registration(client, email)

    complete_response = client.post(
        "/account/register/complete",
        json={
            "registration_id": registration_id,
            "password": "Strong12!",
            "password_confirmation": "Strong12!",
        },
    )
    assert complete_response.status_code == 422
    assert complete_response.json()["detail"] == "Email must be verified before account creation"

    invalid_code_response = client.post(
        "/account/register/verify-email",
        json={"registration_id": registration_id, "code": "wrong-code"},
    )
    assert invalid_code_response.status_code == 422

    valid_code = notifications.email_codes[email]
    assert client.post(
        "/account/register/verify-email",
        json={"registration_id": registration_id, "code": valid_code},
    ).status_code == 204
    assert client.post(
        "/account/register/complete",
        json={
            "registration_id": registration_id,
            "password": "Strong12!",
            "password_confirmation": "Strong12!",
        },
    ).status_code == 201

    duplicate_response = client.post(
        "/account/register/start",
        json={
            "first_name": "Jan",
            "last_name": "Kowalski",
            "birth_date": date(2000, 1, 1).isoformat(),
            "email": email.upper(),
        },
    )
    assert duplicate_response.status_code == 409


def test_password_reset_flow(
    client: TestClient,
    notifications: CapturingNotificationService,
    test_emails: list[str],
) -> None:
    email = _test_email(test_emails)
    _register_user(client, notifications, email)

    response = client.post("/account/password-reset/request", json={"email": email})
    assert response.status_code == 204, response.text
    token = notifications.reset_tokens[email]

    response = client.post(
        "/account/password-reset/confirm",
        json={"token": token, "password": "Newpass12!", "password_confirmation": "Newpass12!"},
    )
    assert response.status_code == 204, response.text

    assert client.post("/account/login", json={"email": email, "password": "Strong12!"}).status_code == 401
    assert client.post("/account/login", json={"email": email, "password": "Newpass12!"}).status_code == 200
    assert client.post(
        "/account/password-reset/confirm",
        json={"token": token, "password": "Other12!", "password_confirmation": "Other12!"},
    ).status_code == 422


def test_protected_endpoint_rejects_missing_and_invalid_access_token(client: TestClient) -> None:
    assert client.get("/account/me").status_code == 401
    assert client.get("/account/me", headers={"Authorization": "Bearer invalid-token"}).status_code == 401
