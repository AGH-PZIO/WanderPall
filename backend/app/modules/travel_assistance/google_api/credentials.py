from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials


def credentials_from_refresh_token(
    refresh_token: str,
    client_id: str,
    client_secret: str,
    *,
    scopes: list[str],
) -> Credentials:
    return Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=client_id,
        client_secret=client_secret,
        scopes=scopes,
    )


def ensure_fresh_credentials(creds: Credentials) -> Credentials:
    if creds.expired or not creds.token:
        creds.refresh(Request())
    return creds

