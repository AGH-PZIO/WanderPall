from typing import Any
from uuid import UUID

from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials

from app.core.config import settings
from app.modules.travel_assistance.mail.oauth_state import sign_oauth_state

GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly"


def _client_config() -> dict[str, Any]:
    if not settings.google_oauth_client_id or not settings.google_oauth_client_secret:
        raise RuntimeError("Google OAuth client id/secret are not configured")
    return {
        "web": {
            "client_id": settings.google_oauth_client_id,
            "client_secret": settings.google_oauth_client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [settings.google_oauth_redirect_uri],
        }
    }


def build_authorization_url(user_id: UUID) -> str:
    state = sign_oauth_state(user_id)
    flow = Flow.from_client_config(
        _client_config(),
        scopes=[GMAIL_READONLY_SCOPE],
        redirect_uri=settings.google_oauth_redirect_uri,
        autogenerate_code_verifier=False,
    )

    url, _ = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        state=state,
    )
    return url


def exchange_code_for_credentials(code: str) -> tuple[Credentials, str | None]:
    flow = Flow.from_client_config(
        _client_config(),
        scopes=[GMAIL_READONLY_SCOPE],
        redirect_uri=settings.google_oauth_redirect_uri,
    )
    flow.fetch_token(code=code)
    creds = flow.credentials
    email: str | None = None
    try:
        from googleapiclient.discovery import build

        service = build("gmail", "v1", credentials=creds, cache_discovery=False)
        prof = service.users().getProfile(userId="me").execute()
        email = prof.get("emailAddress")
    except Exception:
        email = None
    return creds, email
