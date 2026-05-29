"""
Integration tests for the public-journal explorer module.

Focus areas
-----------
* Public-journal visibility and access control (private journals must NOT appear).
* Image serving from the public explorer endpoint (no-auth) vs. the editor endpoint.
* Reactions (emotes):
    - Two separate accounts reacting to the same journal.
    - Each account sees its own ``my_reaction`` value correctly.
    - Reaction counts aggregate properly (``reactions`` dict + ``reaction_count``).
    - Changing emote (upsert) replaces the previous one.
    - Removing a reaction (DELETE) decrements the count.
    - Attempting to react to a private journal returns 404.
    - Owner can also react to their own public journal.
* Login → react → logout → login as different account → react scenario.
* Comments:
    - Creating, listing, and soft-deleting comments.
    - Threaded comments (parent_comment_id).
    - Non-owner cannot delete another user's comment.
* Feed listing:
    - Own journals are excluded from ``GET /journals/explorer``.
    - Own public journals appear in ``GET /journals/explorer/my-public``.

No direct database connection is used anywhere — all setup and teardown goes
through the backend HTTP API (registration, login, DELETE /account/me, etc.).
"""
from __future__ import annotations

from datetime import date
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.modules.account import router as account_router


# ---------------------------------------------------------------------------
# Helpers / fixtures
# ---------------------------------------------------------------------------


class CapturingNotificationService:
    """Captures outgoing notification codes so tests can retrieve them."""

    def __init__(self) -> None:
        self.email_codes: dict[str, str] = {}
        self.phone_codes: dict[str, str] = {}

    def send_email_verification(self, email: str, code: str) -> None:
        self.email_codes[email] = code

    def send_phone_verification(self, phone: str, code: str) -> None:
        self.phone_codes[phone] = code

    def send_password_reset(self, email: str, token: str) -> None:
        raise AssertionError("send_password_reset not used in this test suite")


@pytest.fixture()
def notifications(monkeypatch: pytest.MonkeyPatch) -> CapturingNotificationService:
    service = CapturingNotificationService()
    monkeypatch.setattr(account_router, "ConsoleNotificationService", lambda: service)
    return service


@pytest.fixture()
def client(notifications: CapturingNotificationService, tmp_path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setattr(settings, "journal_media_dir", str(tmp_path / "journal-media"))
    return TestClient(app)


# ---------------------------------------------------------------------------
# Account helpers
# ---------------------------------------------------------------------------


def _unique_email(prefix: str = "pub-journal") -> str:
    return f"integration-{prefix}-{uuid4().hex}@example.com"


def _register_user(
    client: TestClient,
    notifications: CapturingNotificationService,
    email: str,
    first_name: str = "Alice",
    last_name: str = "Test",
    password: str = "Strong12!",
) -> None:
    """Register a new user via the API."""
    resp = client.post(
        "/account/register/start",
        json={
            "first_name": first_name,
            "last_name": last_name,
            "birth_date": date(1995, 6, 15).isoformat(),
            "email": email,
            "phone": None,
        },
    )
    assert resp.status_code == 201, resp.text
    reg_id = resp.json()["registration_id"]

    code = notifications.email_codes[email]
    resp = client.post("/account/register/verify-email", json={"registration_id": reg_id, "code": code})
    assert resp.status_code == 204, resp.text

    resp = client.post(
        "/account/register/complete",
        json={"registration_id": reg_id, "password": password, "password_confirmation": password},
    )
    assert resp.status_code == 201, resp.text


def _login(client: TestClient, email: str, password: str = "Strong12!") -> str:
    """Return a fresh access token."""
    resp = client.post("/account/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def _delete_account(client: TestClient, token: str) -> None:
    """Delete the account that owns *token* via DELETE /account/me."""
    # Use client.request() instead of client.delete() so that the json= kwarg
    # is forwarded correctly regardless of the httpx version in the environment.
    resp = client.request("DELETE", "/account/me", json={"confirm": True}, headers=_auth(token))
    # 204 = deleted; 401 = already gone / token expired — both are fine for teardown
    assert resp.status_code in (204, 401), f"Unexpected status deleting account: {resp.status_code} {resp.text}"


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Journal / entry / image helpers
# ---------------------------------------------------------------------------


def _create_public_journal(client: TestClient, token: str, title: str = "My Public Journal") -> str:
    """Create a journal and immediately set visibility to public. Returns journal_id."""
    resp = client.post("/journals", json={"title": title}, headers=_auth(token))
    assert resp.status_code == 201, resp.text
    journal_id = resp.json()["id"]

    resp = client.patch(f"/journals/{journal_id}/visibility", json={"visibility": "public"}, headers=_auth(token))
    assert resp.status_code == 200, resp.text
    assert resp.json()["visibility"] == "public"
    return journal_id


def _create_private_journal(client: TestClient, token: str, title: str = "My Private Journal") -> str:
    """Create a private journal (default). Returns journal_id."""
    resp = client.post("/journals", json={"title": title}, headers=_auth(token))
    assert resp.status_code == 201, resp.text
    assert resp.json()["visibility"] == "private"
    return resp.json()["id"]


def _create_entry(client: TestClient, token: str, journal_id: str) -> str:
    """Add a journal entry and return its entry_id."""
    resp = client.post(
        f"/journals/{journal_id}/entries",
        json={"lat": 50.0647, "lng": 19.9450, "text": "Kraków – test entry"},
        headers=_auth(token),
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


_MINIMAL_PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32  # not a valid PNG, but the endpoint accepts any bytes


def _upload_image(client: TestClient, token: str, journal_id: str, entry_id: str) -> str:
    """Upload a single test image and return its image_id."""
    resp = client.post(
        f"/journals/{journal_id}/entries/{entry_id}/images",
        headers=_auth(token),
        files={"files": ("photo.png", _MINIMAL_PNG, "image/png")},
    )
    assert resp.status_code == 201, resp.text
    images = resp.json()
    assert len(images) == 1
    return images[0]["id"]


def _cleanup_journal(client: TestClient, token: str, journal_id: str) -> None:
    """Best-effort deletion of a journal and all its entries/images via the API."""
    resp = client.get(f"/journals/{journal_id}/entries", headers=_auth(token))
    if resp.status_code == 200:
        for entry in resp.json().get("items", []):
            entry_id = entry["id"]
            for img in entry.get("images", []):
                client.delete(f"/journals/{journal_id}/entries/{entry_id}/images/{img['id']}", headers=_auth(token))
            client.delete(f"/journals/{journal_id}/entries/{entry_id}", headers=_auth(token))
    client.delete(f"/journals/{journal_id}", headers=_auth(token))


# ===========================================================================
# TEST SUITE
# ===========================================================================


# ---------------------------------------------------------------------------
# 1. Access-control: private journals must never appear in the explorer
# ---------------------------------------------------------------------------


def test_private_journal_not_visible_in_explorer(
    client: TestClient,
    notifications: CapturingNotificationService,
) -> None:
    """A private journal must NOT appear in another user's explorer feed."""
    owner_email = _unique_email("owner")
    viewer_email = _unique_email("viewer")
    _register_user(client, notifications, owner_email, first_name="Owner", last_name="One")
    _register_user(client, notifications, viewer_email, first_name="Viewer", last_name="Two")

    owner_token = _login(client, owner_email)
    viewer_token = _login(client, viewer_email)

    journal_id = _create_private_journal(client, owner_token, title="Secret Diary")

    try:
        # Viewer must not see the private journal in the feed
        resp = client.get("/journals/explorer", headers=_auth(viewer_token))
        assert resp.status_code == 200, resp.text
        feed_ids = [j["id"] for j in resp.json()["items"]]
        assert journal_id not in feed_ids, "Private journal must not appear in the explorer feed"

        # Direct access must return 404
        resp = client.get(f"/journals/explorer/{journal_id}", headers=_auth(viewer_token))
        assert resp.status_code == 404
    finally:
        _cleanup_journal(client, owner_token, journal_id)
        _delete_account(client, owner_token)
        _delete_account(client, viewer_token)


# ---------------------------------------------------------------------------
# 2. Public journal appears in explorer and in my-public
# ---------------------------------------------------------------------------


def test_public_journal_visible_in_explorer_and_my_public(
    client: TestClient,
    notifications: CapturingNotificationService,
) -> None:
    """A public journal must appear in a viewer's feed and in the owner's /my-public."""
    owner_email = _unique_email("owner2")
    viewer_email = _unique_email("viewer2")
    _register_user(client, notifications, owner_email, first_name="Owner", last_name="Two")
    _register_user(client, notifications, viewer_email, first_name="Viewer", last_name="Two")

    owner_token = _login(client, owner_email)
    viewer_token = _login(client, viewer_email)

    journal_id = _create_public_journal(client, owner_token, title="Rome 2024")

    try:
        # Owner sees it in /my-public
        resp = client.get("/journals/explorer/my-public", headers=_auth(owner_token))
        assert resp.status_code == 200, resp.text
        my_ids = [j["id"] for j in resp.json()["items"]]
        assert journal_id in my_ids, "Owner must see own public journal in /my-public"

        # Owner must NOT see own journal in general feed
        resp = client.get("/journals/explorer", headers=_auth(owner_token))
        assert resp.status_code == 200, resp.text
        feed_ids = [j["id"] for j in resp.json()["items"]]
        assert journal_id not in feed_ids, "Owner must not see own journal in the general explorer feed"

        # Viewer sees it in the feed
        resp = client.get("/journals/explorer", headers=_auth(viewer_token))
        assert resp.status_code == 200, resp.text
        feed_ids = [j["id"] for j in resp.json()["items"]]
        assert journal_id in feed_ids, "Public journal must appear in another user's explorer feed"

        # Viewer can fetch journal detail
        resp = client.get(f"/journals/explorer/{journal_id}", headers=_auth(viewer_token))
        assert resp.status_code == 200, resp.text
        detail = resp.json()
        assert detail["id"] == journal_id
        assert detail["title"] == "Rome 2024"
        assert detail["visibility"] == "public"
    finally:
        _cleanup_journal(client, owner_token, journal_id)
        _delete_account(client, owner_token)
        _delete_account(client, viewer_token)


# ---------------------------------------------------------------------------
# 3. Image served from public explorer endpoint (no auth required)
# ---------------------------------------------------------------------------


def test_public_image_accessible_without_auth_from_explorer(
    client: TestClient,
    notifications: CapturingNotificationService,
) -> None:
    """Images in public journals should be served via /journals/explorer/… without auth."""
    owner_email = _unique_email("img-owner")
    viewer_email = _unique_email("img-viewer")
    _register_user(client, notifications, owner_email, first_name="Img", last_name="Owner")
    _register_user(client, notifications, viewer_email, first_name="Img", last_name="Viewer")

    owner_token = _login(client, owner_email)
    viewer_token = _login(client, viewer_email)

    journal_id = _create_public_journal(client, owner_token, title="Photo Trip")
    entry_id = _create_entry(client, owner_token, journal_id)
    _upload_image(client, owner_token, journal_id, entry_id)

    try:
        # Fetch explorer detail to get the image URL that the API provides.
        # Note: GET /journals/explorer/{id} excludes the owner's OWN journals by
        # design (it only shows other people's public journals), so we must fetch
        # it as the viewer, not as the owner.
        resp = client.get(f"/journals/explorer/{journal_id}", headers=_auth(viewer_token))
        assert resp.status_code == 200, resp.text
        detail = resp.json()
        assert len(detail["entries"]) == 1
        entry_data = detail["entries"][0]
        assert len(entry_data["images"]) == 1
        img_url: str = entry_data["images"][0]["url"]

        # Strip the base to get the path component
        from urllib.parse import urlparse
        img_path = urlparse(img_url).path

        # Serve image WITHOUT any auth header – must succeed for public journals
        resp_no_auth = client.get(img_path)
        assert resp_no_auth.status_code == 200, (
            f"Public explorer image must be accessible without auth. "
            f"Got {resp_no_auth.status_code}: {resp_no_auth.text}"
        )
        assert resp_no_auth.headers.get("content-type", "").startswith("image/png")
        assert resp_no_auth.content == _MINIMAL_PNG

        # Second (logged-in) account can also access the image
        resp_viewer = client.get(img_path, headers=_auth(viewer_token))
        assert resp_viewer.status_code == 200, resp_viewer.text
        assert resp_viewer.content == _MINIMAL_PNG
    finally:
        _cleanup_journal(client, owner_token, journal_id)
        _delete_account(client, owner_token)
        _delete_account(client, viewer_token)


def test_image_in_private_journal_not_served_via_explorer(
    client: TestClient,
    notifications: CapturingNotificationService,
) -> None:
    """The public explorer image endpoint must refuse images from private journals."""
    owner_email = _unique_email("priv-img-owner")
    _register_user(client, notifications, owner_email, first_name="Priv", last_name="Owner")
    owner_token = _login(client, owner_email)

    # Create private journal with an image
    journal_id = _create_private_journal(client, owner_token, title="Private Photos")
    entry_id = _create_entry(client, owner_token, journal_id)
    image_id = _upload_image(client, owner_token, journal_id, entry_id)

    try:
        # Attempt to fetch via the explorer image endpoint – must be 404
        explorer_img_path = f"/journals/explorer/{journal_id}/entries/{entry_id}/images/{image_id}.png"
        resp = client.get(explorer_img_path)
        assert resp.status_code == 404, (
            f"Explorer must not serve images from private journals. Got {resp.status_code}"
        )
    finally:
        _cleanup_journal(client, owner_token, journal_id)
        _delete_account(client, owner_token)


# ---------------------------------------------------------------------------
# 4. Reactions – two accounts, correct counts and my_reaction tracking
# ---------------------------------------------------------------------------


def test_two_accounts_react_to_public_journal(
    client: TestClient,
    notifications: CapturingNotificationService,
) -> None:
    """
    Owner creates a public journal.
    Account A reacts with 'like'.
    Account B reacts with 'heart'.
    Verify:
      - reaction_count == 2
      - reactions dict has like:1 heart:1
      - each account's my_reaction is reflected correctly
      - the owner (excluded from feed, but visible via /my-public) also sees counts
    """
    owner_email = _unique_email("react-owner")
    account_a_email = _unique_email("react-a")
    account_b_email = _unique_email("react-b")

    _register_user(client, notifications, owner_email, first_name="Owner", last_name="React")
    _register_user(client, notifications, account_a_email, first_name="Alice", last_name="React")
    _register_user(client, notifications, account_b_email, first_name="Bob", last_name="React")

    owner_token = _login(client, owner_email)
    token_a = _login(client, account_a_email)
    token_b = _login(client, account_b_email)

    journal_id = _create_public_journal(client, owner_token, title="React Test Journal")

    try:
        # Account A reacts: like
        resp = client.put(f"/journals/explorer/{journal_id}/reactions", json={"emoji": "like"}, headers=_auth(token_a))
        assert resp.status_code == 200, resp.text
        assert resp.json()["emoji"] == "like"

        # Account B reacts: heart
        resp = client.put(f"/journals/explorer/{journal_id}/reactions", json={"emoji": "heart"}, headers=_auth(token_b))
        assert resp.status_code == 200, resp.text
        assert resp.json()["emoji"] == "heart"

        # Verify counts via explorer detail as Account A
        resp = client.get(f"/journals/explorer/{journal_id}", headers=_auth(token_a))
        assert resp.status_code == 200, resp.text
        detail_a = resp.json()
        assert detail_a["reaction_count"] == 2, f"Expected 2 reactions, got {detail_a['reaction_count']}"
        assert detail_a["reactions"].get("like") == 1
        assert detail_a["reactions"].get("heart") == 1
        assert detail_a["my_reaction"] == "like", \
            f"Account A my_reaction should be 'like', got {detail_a['my_reaction']}"

        # Verify counts via explorer detail as Account B
        resp = client.get(f"/journals/explorer/{journal_id}", headers=_auth(token_b))
        assert resp.status_code == 200, resp.text
        detail_b = resp.json()
        assert detail_b["reaction_count"] == 2
        assert detail_b["my_reaction"] == "heart", \
            f"Account B my_reaction should be 'heart', got {detail_b['my_reaction']}"

        # Verify counts via owner's /my-public feed
        resp = client.get("/journals/explorer/my-public", headers=_auth(owner_token))
        assert resp.status_code == 200, resp.text
        my_journals = [j for j in resp.json()["items"] if j["id"] == journal_id]
        assert len(my_journals) == 1
        my_journal = my_journals[0]
        assert my_journal["reaction_count"] == 2
        assert my_journal["reactions"].get("like") == 1
        assert my_journal["reactions"].get("heart") == 1
        assert my_journal["my_reaction"] is None, "Owner has not reacted; my_reaction should be None"
    finally:
        _cleanup_journal(client, owner_token, journal_id)
        _delete_account(client, owner_token)
        _delete_account(client, token_a)
        _delete_account(client, token_b)


# ---------------------------------------------------------------------------
# 5. Reaction upsert: switching emoji replaces previous one
# ---------------------------------------------------------------------------


def test_reaction_upsert_replaces_emoji(
    client: TestClient,
    notifications: CapturingNotificationService,
) -> None:
    """Calling PUT /reactions again with a different emoji should replace the previous one."""
    owner_email = _unique_email("upsert-owner")
    viewer_email = _unique_email("upsert-viewer")

    _register_user(client, notifications, owner_email, first_name="Upd", last_name="Owner")
    _register_user(client, notifications, viewer_email, first_name="Upd", last_name="Viewer")

    owner_token = _login(client, owner_email)
    viewer_token = _login(client, viewer_email)

    journal_id = _create_public_journal(client, owner_token, title="Upsert Emoji Test")

    try:
        # React with 'haha'
        resp = client.put(f"/journals/explorer/{journal_id}/reactions", json={"emoji": "haha"}, headers=_auth(viewer_token))
        assert resp.status_code == 200, resp.text

        # Switch to 'sad'
        resp = client.put(f"/journals/explorer/{journal_id}/reactions", json={"emoji": "sad"}, headers=_auth(viewer_token))
        assert resp.status_code == 200, resp.text
        assert resp.json()["emoji"] == "sad"

        # Total count must still be 1 (replaced, not added)
        resp = client.get(f"/journals/explorer/{journal_id}", headers=_auth(viewer_token))
        assert resp.status_code == 200, resp.text
        detail = resp.json()
        assert detail["reaction_count"] == 1, \
            f"Upsert should keep count at 1, got {detail['reaction_count']}"
        assert detail["reactions"].get("sad") == 1
        assert detail["reactions"].get("haha") is None, "'haha' should no longer be present after upsert"
        assert detail["my_reaction"] == "sad"
    finally:
        _cleanup_journal(client, owner_token, journal_id)
        _delete_account(client, owner_token)
        _delete_account(client, viewer_token)


# ---------------------------------------------------------------------------
# 6. Reaction deletion
# ---------------------------------------------------------------------------


def test_reaction_delete_decrements_count(
    client: TestClient,
    notifications: CapturingNotificationService,
) -> None:
    """Deleting a reaction should bring reaction_count back to 0."""
    owner_email = _unique_email("del-owner")
    viewer_email = _unique_email("del-viewer")

    _register_user(client, notifications, owner_email, first_name="Del", last_name="Owner")
    _register_user(client, notifications, viewer_email, first_name="Del", last_name="Viewer")

    owner_token = _login(client, owner_email)
    viewer_token = _login(client, viewer_email)

    journal_id = _create_public_journal(client, owner_token, title="Delete Reaction Test")

    try:
        # Add a reaction
        resp = client.put(f"/journals/explorer/{journal_id}/reactions", json={"emoji": "like"}, headers=_auth(viewer_token))
        assert resp.status_code == 200, resp.text

        # Confirm count is 1
        resp = client.get(f"/journals/explorer/{journal_id}", headers=_auth(viewer_token))
        assert resp.json()["reaction_count"] == 1

        # Delete the reaction
        resp = client.delete(f"/journals/explorer/{journal_id}/reactions", headers=_auth(viewer_token))
        assert resp.status_code == 204, resp.text

        # Count must be 0 and my_reaction must be None
        resp = client.get(f"/journals/explorer/{journal_id}", headers=_auth(viewer_token))
        assert resp.status_code == 200, resp.text
        detail = resp.json()
        assert detail["reaction_count"] == 0, \
            f"After deletion count must be 0, got {detail['reaction_count']}"
        assert detail["my_reaction"] is None, \
            f"After deletion my_reaction must be None, got {detail['my_reaction']}"
        assert detail["reactions"] == {}, \
            f"reactions dict must be empty after deletion, got {detail['reactions']}"
    finally:
        _cleanup_journal(client, owner_token, journal_id)
        _delete_account(client, owner_token)
        _delete_account(client, viewer_token)


# ---------------------------------------------------------------------------
# 7. Reactions on private journal are forbidden
# ---------------------------------------------------------------------------


def test_cannot_react_to_private_journal(
    client: TestClient,
    notifications: CapturingNotificationService,
) -> None:
    """PUT /journals/explorer/{id}/reactions must return 404 for private journals."""
    owner_email = _unique_email("priv-react-owner")
    viewer_email = _unique_email("priv-react-viewer")

    _register_user(client, notifications, owner_email, first_name="Priv", last_name="Owner")
    _register_user(client, notifications, viewer_email, first_name="Priv", last_name="Viewer")

    owner_token = _login(client, owner_email)
    viewer_token = _login(client, viewer_email)

    journal_id = _create_private_journal(client, owner_token, title="Nobody Sees This")

    try:
        resp = client.put(
            f"/journals/explorer/{journal_id}/reactions",
            json={"emoji": "like"},
            headers=_auth(viewer_token),
        )
        assert resp.status_code == 404, (
            f"Expected 404 when reacting to a private journal, got {resp.status_code}: {resp.text}"
        )
    finally:
        _cleanup_journal(client, owner_token, journal_id)
        _delete_account(client, owner_token)
        _delete_account(client, viewer_token)


# ---------------------------------------------------------------------------
# 8. Owner can react to their own public journal
# ---------------------------------------------------------------------------


def test_owner_can_react_to_own_public_journal(
    client: TestClient,
    notifications: CapturingNotificationService,
) -> None:
    """The journal owner should be able to react to their own public journal."""
    owner_email = _unique_email("owner-self-react")
    _register_user(client, notifications, owner_email, first_name="Self", last_name="React")
    owner_token = _login(client, owner_email)

    journal_id = _create_public_journal(client, owner_token, title="Self Reaction Test")

    try:
        resp = client.put(
            f"/journals/explorer/{journal_id}/reactions",
            json={"emoji": "heart"},
            headers=_auth(owner_token),
        )
        assert resp.status_code == 200, (
            f"Owner should be able to react to their own public journal, "
            f"got {resp.status_code}: {resp.text}"
        )
        assert resp.json()["emoji"] == "heart"

        # Owner sees their own reaction via /my-public
        resp = client.get("/journals/explorer/my-public", headers=_auth(owner_token))
        assert resp.status_code == 200, resp.text
        items = [j for j in resp.json()["items"] if j["id"] == journal_id]
        assert items, "Journal not found in /my-public after reacting"
        assert items[0]["my_reaction"] == "heart"
        assert items[0]["reaction_count"] == 1
    finally:
        _cleanup_journal(client, owner_token, journal_id)
        _delete_account(client, owner_token)


# ---------------------------------------------------------------------------
# 9. Cross-session reaction: login → react → logout → login as different user → react
# ---------------------------------------------------------------------------


def test_login_react_logout_login_react_other_account(
    client: TestClient,
    notifications: CapturingNotificationService,
) -> None:
    """
    Full session-switching scenario:
      1. Owner creates public journal.
      2. Account A logs in, reacts 'like', then logs out.
      3. Account B logs in, reacts 'haha'.
      4. Both reactions are present; each account has the correct my_reaction.
      5. Account A logs back in – my_reaction is still 'like'.
      6. Account B deletes reaction – count drops to 1.
      7. Account A switches reaction to 'sad'.
    """
    owner_email = _unique_email("session-owner")
    a_email = _unique_email("session-a")
    b_email = _unique_email("session-b")

    _register_user(client, notifications, owner_email, first_name="Session", last_name="Owner")
    _register_user(client, notifications, a_email, first_name="Alice", last_name="Session")
    _register_user(client, notifications, b_email, first_name="Bob", last_name="Session")

    owner_token = _login(client, owner_email)
    journal_id = _create_public_journal(client, owner_token, title="Cross Session Journal")

    try:
        # --- Step 2: Account A logs in, reacts, logs out ---
        token_a = _login(client, a_email)
        resp = client.put(
            f"/journals/explorer/{journal_id}/reactions",
            json={"emoji": "like"},
            headers=_auth(token_a),
        )
        assert resp.status_code == 200, resp.text

        # Obtain and invalidate A's refresh token (logout)
        login_resp_a = client.post("/account/login", json={"email": a_email, "password": "Strong12!"})
        assert login_resp_a.status_code == 200, login_resp_a.text
        refresh_a = login_resp_a.json()["refresh_token"]
        logout_resp = client.post("/account/logout", json={"refresh_token": refresh_a})
        assert logout_resp.status_code == 204, logout_resp.text

        # --- Step 3: Account B logs in, reacts ---
        token_b = _login(client, b_email)
        resp = client.put(
            f"/journals/explorer/{journal_id}/reactions",
            json={"emoji": "haha"},
            headers=_auth(token_b),
        )
        assert resp.status_code == 200, resp.text

        # --- Step 4: Both reactions present ---
        resp = client.get(f"/journals/explorer/{journal_id}", headers=_auth(token_b))
        assert resp.status_code == 200, resp.text
        detail = resp.json()
        assert detail["reaction_count"] == 2, f"Expected 2 reactions, got {detail['reaction_count']}"
        assert detail["reactions"].get("like") == 1
        assert detail["reactions"].get("haha") == 1
        assert detail["my_reaction"] == "haha"

        # --- Step 5: Account A logs back in – my_reaction still 'like' ---
        token_a2 = _login(client, a_email)
        resp = client.get(f"/journals/explorer/{journal_id}", headers=_auth(token_a2))
        assert resp.status_code == 200, resp.text
        detail_a = resp.json()
        assert detail_a["my_reaction"] == "like", (
            f"After re-login Account A should still have 'like' reaction, "
            f"got {detail_a['my_reaction']}"
        )
        assert detail_a["reaction_count"] == 2

        # --- Step 6: Account B deletes reaction ---
        resp = client.delete(f"/journals/explorer/{journal_id}/reactions", headers=_auth(token_b))
        assert resp.status_code == 204, resp.text

        resp = client.get(f"/journals/explorer/{journal_id}", headers=_auth(token_a2))
        assert resp.status_code == 200, resp.text
        detail_after_b_del = resp.json()
        assert detail_after_b_del["reaction_count"] == 1
        assert detail_after_b_del["reactions"].get("like") == 1
        assert "haha" not in detail_after_b_del["reactions"]

        # --- Step 7: Account A switches to 'sad' ---
        resp = client.put(
            f"/journals/explorer/{journal_id}/reactions",
            json={"emoji": "sad"},
            headers=_auth(token_a2),
        )
        assert resp.status_code == 200, resp.text

        resp = client.get(f"/journals/explorer/{journal_id}", headers=_auth(token_a2))
        detail_final = resp.json()
        assert detail_final["reaction_count"] == 1
        assert detail_final["reactions"].get("sad") == 1
        assert "like" not in detail_final["reactions"]
        assert detail_final["my_reaction"] == "sad"
    finally:
        _cleanup_journal(client, owner_token, journal_id)
        _delete_account(client, owner_token)
        # Use freshly obtained tokens for teardown since original token_a may be stale
        _delete_account(client, _login(client, a_email))
        _delete_account(client, token_b)


# ---------------------------------------------------------------------------
# 10. All valid emoji types are accepted
# ---------------------------------------------------------------------------


def test_all_valid_emojis_are_accepted(
    client: TestClient,
    notifications: CapturingNotificationService,
) -> None:
    """Each ReactionEmoji value must be accepted by the PUT endpoint."""
    owner_email = _unique_email("all-emoji-owner")
    viewer_email = _unique_email("all-emoji-viewer")

    _register_user(client, notifications, owner_email, first_name="Emoji", last_name="Owner")
    _register_user(client, notifications, viewer_email, first_name="Emoji", last_name="Viewer")

    owner_token = _login(client, owner_email)
    viewer_token = _login(client, viewer_email)

    journal_id = _create_public_journal(client, owner_token, title="All Emojis Journal")

    try:
        for emoji in ("like", "heart", "haha", "sad"):
            resp = client.put(
                f"/journals/explorer/{journal_id}/reactions",
                json={"emoji": emoji},
                headers=_auth(viewer_token),
            )
            assert resp.status_code == 200, \
                f"Expected 200 for emoji '{emoji}', got {resp.status_code}: {resp.text}"
            assert resp.json()["emoji"] == emoji

            # After each upsert count should be exactly 1
            detail_resp = client.get(f"/journals/explorer/{journal_id}", headers=_auth(viewer_token))
            detail = detail_resp.json()
            assert detail["reaction_count"] == 1, (
                f"After emoji '{emoji}' reaction_count should be 1, got {detail['reaction_count']}"
            )
            assert detail["my_reaction"] == emoji
    finally:
        _cleanup_journal(client, owner_token, journal_id)
        _delete_account(client, owner_token)
        _delete_account(client, viewer_token)


def test_invalid_emoji_is_rejected(
    client: TestClient,
    notifications: CapturingNotificationService,
) -> None:
    """An unknown emoji value must be rejected with a 422 response."""
    owner_email = _unique_email("bad-emoji-owner")
    viewer_email = _unique_email("bad-emoji-viewer")

    _register_user(client, notifications, owner_email, first_name="Bad", last_name="Owner")
    _register_user(client, notifications, viewer_email, first_name="Bad", last_name="Viewer")

    owner_token = _login(client, owner_email)
    viewer_token = _login(client, viewer_email)

    journal_id = _create_public_journal(client, owner_token, title="Bad Emoji Journal")

    try:
        resp = client.put(
            f"/journals/explorer/{journal_id}/reactions",
            json={"emoji": "angry"},  # not in ReactionEmoji enum
            headers=_auth(viewer_token),
        )
        assert resp.status_code == 422, \
            f"Expected 422 for unknown emoji, got {resp.status_code}: {resp.text}"
    finally:
        _cleanup_journal(client, owner_token, journal_id)
        _delete_account(client, owner_token)
        _delete_account(client, viewer_token)


# ---------------------------------------------------------------------------
# 11. Idempotent reaction: PUT same emoji twice keeps count at 1
# ---------------------------------------------------------------------------


def test_reaction_idempotent_same_emoji_twice(
    client: TestClient,
    notifications: CapturingNotificationService,
) -> None:
    """Sending the same emoji multiple times must not create duplicate reactions."""
    owner_email = _unique_email("idem-owner")
    viewer_email = _unique_email("idem-viewer")

    _register_user(client, notifications, owner_email, first_name="Idem", last_name="Owner")
    _register_user(client, notifications, viewer_email, first_name="Idem", last_name="Viewer")

    owner_token = _login(client, owner_email)
    viewer_token = _login(client, viewer_email)

    journal_id = _create_public_journal(client, owner_token, title="Idempotent Journal")

    try:
        for _ in range(3):
            resp = client.put(
                f"/journals/explorer/{journal_id}/reactions",
                json={"emoji": "like"},
                headers=_auth(viewer_token),
            )
            assert resp.status_code == 200, resp.text

        resp = client.get(f"/journals/explorer/{journal_id}", headers=_auth(viewer_token))
        detail = resp.json()
        assert detail["reaction_count"] == 1, (
            f"Idempotent upsert must keep count at 1, got {detail['reaction_count']}"
        )
        assert detail["reactions"].get("like") == 1
    finally:
        _cleanup_journal(client, owner_token, journal_id)
        _delete_account(client, owner_token)
        _delete_account(client, viewer_token)


# ---------------------------------------------------------------------------
# 12. Comments: basic create / list / soft-delete / thread reply
# ---------------------------------------------------------------------------


def test_comments_create_list_delete(
    client: TestClient,
    notifications: CapturingNotificationService,
) -> None:
    """Test basic comment lifecycle: create, list, soft-delete."""
    owner_email = _unique_email("cmt-owner")
    viewer_email = _unique_email("cmt-viewer")

    _register_user(client, notifications, owner_email, first_name="Cmt", last_name="Owner")
    _register_user(client, notifications, viewer_email, first_name="Cmt", last_name="Viewer")

    owner_token = _login(client, owner_email)
    viewer_token = _login(client, viewer_email)

    journal_id = _create_public_journal(client, owner_token, title="Comment Test Journal")

    try:
        # Viewer posts a comment
        resp = client.post(
            f"/journals/explorer/{journal_id}/comments",
            json={"body": "Great journal!"},
            headers=_auth(viewer_token),
        )
        assert resp.status_code == 201, resp.text
        comment = resp.json()
        comment_id = comment["id"]
        assert comment["body"] == "Great journal!"
        assert comment["is_deleted"] is False
        assert comment["parent_comment_id"] is None

        # List comments
        resp = client.get(f"/journals/explorer/{journal_id}/comments", headers=_auth(viewer_token))
        assert resp.status_code == 200, resp.text
        listing = resp.json()
        assert listing["total"] >= 1
        ids_in_listing = [c["id"] for c in listing["items"]]
        assert comment_id in ids_in_listing

        # Owner posts a threaded reply
        resp = client.post(
            f"/journals/explorer/{journal_id}/comments",
            json={"body": "Thank you!", "parent_comment_id": comment_id},
            headers=_auth(owner_token),
        )
        assert resp.status_code == 201, resp.text
        reply = resp.json()
        reply_id = reply["id"]
        assert reply["parent_comment_id"] == comment_id

        # Viewer soft-deletes their own comment
        resp = client.delete(
            f"/journals/explorer/{journal_id}/comments/{comment_id}",
            headers=_auth(viewer_token),
        )
        assert resp.status_code == 204, resp.text

        # After deletion: comment appears as deleted; body is None
        resp = client.get(f"/journals/explorer/{journal_id}/comments", headers=_auth(viewer_token))
        all_comments = {c["id"]: c for c in resp.json()["items"]}
        assert all_comments[comment_id]["is_deleted"] is True
        assert all_comments[comment_id]["body"] is None

        # Reply still intact
        assert reply_id in all_comments
        assert all_comments[reply_id]["is_deleted"] is False
    finally:
        _cleanup_journal(client, owner_token, journal_id)
        _delete_account(client, owner_token)
        _delete_account(client, viewer_token)


def test_non_owner_cannot_delete_another_users_comment(
    client: TestClient,
    notifications: CapturingNotificationService,
) -> None:
    """A user must not be able to soft-delete a comment they did not author."""
    owner_email = _unique_email("cmt2-owner")
    a_email = _unique_email("cmt2-a")
    b_email = _unique_email("cmt2-b")

    _register_user(client, notifications, owner_email, first_name="Cmt2", last_name="Owner")
    _register_user(client, notifications, a_email, first_name="Alice", last_name="Cmt2")
    _register_user(client, notifications, b_email, first_name="Bob", last_name="Cmt2")

    owner_token = _login(client, owner_email)
    token_a = _login(client, a_email)
    token_b = _login(client, b_email)

    journal_id = _create_public_journal(client, owner_token, title="Comment Auth Test")

    try:
        # Account A posts a comment
        resp = client.post(
            f"/journals/explorer/{journal_id}/comments",
            json={"body": "Hello from A"},
            headers=_auth(token_a),
        )
        assert resp.status_code == 201, resp.text
        comment_id = resp.json()["id"]

        # Account B tries to delete Account A's comment → must fail
        resp = client.delete(
            f"/journals/explorer/{journal_id}/comments/{comment_id}",
            headers=_auth(token_b),
        )
        assert resp.status_code == 404, (
            f"Non-author must not delete another user's comment. Got {resp.status_code}: {resp.text}"
        )

        # Comment still exists and is not deleted
        resp = client.get(f"/journals/explorer/{journal_id}/comments", headers=_auth(token_a))
        all_comments = {c["id"]: c for c in resp.json()["items"]}
        assert all_comments[comment_id]["is_deleted"] is False
    finally:
        _cleanup_journal(client, owner_token, journal_id)
        _delete_account(client, owner_token)
        _delete_account(client, token_a)
        _delete_account(client, token_b)


# ---------------------------------------------------------------------------
# 13. Feed carries my_reaction in preview items
# ---------------------------------------------------------------------------


def test_feed_includes_my_reaction_in_preview(
    client: TestClient,
    notifications: CapturingNotificationService,
) -> None:
    """The feed preview items must carry my_reaction for the requesting user."""
    owner_email = _unique_email("feed-owner")
    viewer_email = _unique_email("feed-viewer")
    other_email = _unique_email("feed-other")

    _register_user(client, notifications, owner_email, first_name="Feed", last_name="Owner")
    _register_user(client, notifications, viewer_email, first_name="Feed", last_name="Viewer")
    _register_user(client, notifications, other_email, first_name="Feed", last_name="Other")

    owner_token = _login(client, owner_email)
    viewer_token = _login(client, viewer_email)
    other_token = _login(client, other_email)

    journal_id = _create_public_journal(client, owner_token, title="Feed Preview Reaction")

    try:
        # Viewer reacts
        resp = client.put(
            f"/journals/explorer/{journal_id}/reactions",
            json={"emoji": "heart"},
            headers=_auth(viewer_token),
        )
        assert resp.status_code == 200, resp.text

        # Check the feed preview (as viewer)
        resp = client.get("/journals/explorer", headers=_auth(viewer_token))
        assert resp.status_code == 200, resp.text
        feed_items = {j["id"]: j for j in resp.json()["items"]}
        assert journal_id in feed_items, "Public journal must appear in feed"
        preview = feed_items[journal_id]
        assert preview["my_reaction"] == "heart", (
            f"Feed preview must carry viewer's my_reaction. Got {preview['my_reaction']}"
        )
        assert preview["reaction_count"] == 1

        # Another user (no reaction) must see my_reaction=None
        resp = client.get("/journals/explorer", headers=_auth(other_token))
        feed_items_other = {j["id"]: j for j in resp.json()["items"]}
        if journal_id in feed_items_other:
            assert feed_items_other[journal_id]["my_reaction"] is None, (
                "User who has not reacted must see my_reaction=None in the feed"
            )
    finally:
        _cleanup_journal(client, owner_token, journal_id)
        _delete_account(client, owner_token)
        _delete_account(client, viewer_token)
        _delete_account(client, other_token)


# ---------------------------------------------------------------------------
# 14. Unauthenticated access to protected explorer endpoints is rejected
# ---------------------------------------------------------------------------


def test_unauthenticated_requests_to_explorer_are_rejected(client: TestClient) -> None:
    """All explorer endpoints (except the public image endpoint) must require auth."""
    import uuid
    fake_id = str(uuid.uuid4())

    endpoints = [
        ("GET", "/journals/explorer"),
        ("GET", "/journals/explorer/my-public"),
        ("GET", f"/journals/explorer/{fake_id}"),
        ("PUT", f"/journals/explorer/{fake_id}/reactions"),
        ("DELETE", f"/journals/explorer/{fake_id}/reactions"),
        ("POST", f"/journals/explorer/{fake_id}/comments"),
        ("GET", f"/journals/explorer/{fake_id}/comments"),
    ]

    for method, path in endpoints:
        resp = client.request(method, path, json={"emoji": "like", "body": "x"})
        assert resp.status_code == 401, (
            f"Expected 401 for unauthenticated {method} {path}, "
            f"got {resp.status_code}: {resp.text}"
        )
