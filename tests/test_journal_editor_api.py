from __future__ import annotations

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

    def send_email_verification(self, email: str, code: str) -> None:
        self.email_codes[email] = code

    def send_phone_verification(self, phone: str, code: str) -> None:
        self.phone_codes[phone] = code

    def send_password_reset(self, email: str, token: str) -> None:
        raise AssertionError("not used in this test")


@pytest.fixture()
def notifications(monkeypatch: pytest.MonkeyPatch) -> CapturingNotificationService:
    service = CapturingNotificationService()
    monkeypatch.setattr(account_router, "ConsoleNotificationService", lambda: service)
    return service


@pytest.fixture()
def client(notifications: CapturingNotificationService, tmp_path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setattr(settings, "journal_media_dir", str(tmp_path / "journal-media"))
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
    email = f"integration-journal-{uuid4().hex}@example.com"
    test_emails.append(email)
    return email


def _register_user(client: TestClient, notifications: CapturingNotificationService, email: str) -> None:
    response = client.post(
        "/account/register/start",
        json={
            "first_name": "Jan",
            "last_name": "Kowalski",
            "birth_date": date(2000, 1, 1).isoformat(),
            "email": email,
            "phone": None,
        },
    )
    assert response.status_code == 201, response.text
    registration_id = response.json()["registration_id"]

    email_code = notifications.email_codes[email]
    response = client.post("/account/register/verify-email", json={"registration_id": registration_id, "code": email_code})
    assert response.status_code == 204, response.text

    response = client.post(
        "/account/register/complete",
        json={
            "registration_id": registration_id,
            "password": "Strong12!",
            "password_confirmation": "Strong12!",
        },
    )
    assert response.status_code == 201, response.text


def _login(client: TestClient, email: str) -> str:
    response = client.post("/account/login", json={"email": email, "password": "Strong12!"})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def test_journal_editor_crud_and_images(
    client: TestClient,
    notifications: CapturingNotificationService,
    test_emails: list[str],
) -> None:
    email = _test_email(test_emails)
    _register_user(client, notifications, email)
    access = _login(client, email)
    headers = {"Authorization": f"Bearer {access}"}

    # Create journal
    response = client.post("/journals", json={"title": "My trip"}, headers=headers)
    assert response.status_code == 201, response.text
    journal = response.json()
    journal_id = journal["id"]
    assert journal["title"] == "My trip"
    assert journal["visibility"] == "private"

    # Update visibility
    response = client.patch(f"/journals/{journal_id}/visibility", json={"visibility": "public"}, headers=headers)
    assert response.status_code == 200, response.text
    assert response.json()["visibility"] == "public"

    # Create entry
    response = client.post(
        f"/journals/{journal_id}/entries",
        json={"lat": 52.2297, "lng": 21.0122, "text": "Warsaw"},
        headers=headers,
    )
    assert response.status_code == 201, response.text
    entry = response.json()
    entry_id = entry["id"]
    assert entry["text"] == "Warsaw"

    # Upload one image
    png_bytes = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32
    response = client.post(
        f"/journals/{journal_id}/entries/{entry_id}/images",
        headers=headers,
        files={"files": ("test.png", png_bytes, "image/png")},
    )
    assert response.status_code == 201, response.text
    images = response.json()
    assert len(images) == 1
    image_id = images[0]["id"]

    # Fetch image bytes
    response = client.get(f"/journals/{journal_id}/entries/{entry_id}/images/{image_id}", headers=headers)
    assert response.status_code == 200, response.text
    assert response.headers.get("content-type", "").startswith("image/png")
    assert response.content == png_bytes

    # Update entry
    response = client.patch(
        f"/journals/{journal_id}/entries/{entry_id}",
        json={"text": "Warsaw (updated)"},
        headers=headers,
    )
    assert response.status_code == 200, response.text
    assert response.json()["text"] == "Warsaw (updated)"

    # Delete image
    response = client.delete(f"/journals/{journal_id}/entries/{entry_id}/images/{image_id}", headers=headers)
    assert response.status_code == 204, response.text
    response = client.get(f"/journals/{journal_id}/entries/{entry_id}/images/{image_id}", headers=headers)
    assert response.status_code == 404

    # Delete entry + journal
    response = client.delete(f"/journals/{journal_id}/entries/{entry_id}", headers=headers)
    assert response.status_code == 204, response.text
    response = client.delete(f"/journals/{journal_id}", headers=headers)
    assert response.status_code == 204, response.text
