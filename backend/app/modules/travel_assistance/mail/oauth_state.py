import base64
import hashlib
import hmac
import time
from uuid import UUID

from app.core.config import settings


def _secret_key() -> bytes:
    raw = settings.gmail_token_encryption_key.strip()
    if not raw:
        raise RuntimeError("GMAIL_TOKEN_ENCRYPTION_KEY is not set")
    return hashlib.sha256(raw.encode("utf-8")).digest()


def sign_oauth_state(user_id: UUID) -> str:
    ts = str(int(time.time()))
    payload = f"{user_id!s}|{ts}"
    sig = hmac.new(_secret_key(), payload.encode(), hashlib.sha256).hexdigest()
    token = f"{payload}|{sig}"
    return base64.urlsafe_b64encode(token.encode("utf-8")).decode("ascii")


def verify_oauth_state(token: str) -> UUID:
    try:
        raw = base64.urlsafe_b64decode(token.encode("ascii")).decode("utf-8")
    except (ValueError, UnicodeDecodeError) as exc:
        raise ValueError("Invalid state encoding") from exc

    parts = raw.rsplit("|", 1)
    if len(parts) != 2:
        raise ValueError("Invalid state shape")
    payload, sig = parts
    payload_parts = payload.split("|")
    if len(payload_parts) != 2:
        raise ValueError("Invalid state payload")
    uid_s, ts_s = payload_parts

    expected = hmac.new(_secret_key(), f"{uid_s}|{ts_s}".encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, sig):
        raise ValueError("Invalid state signature")

    age = int(time.time()) - int(ts_s)
    if age < 0 or age > settings.oauth_state_ttl_seconds:
        raise ValueError("State expired")

    return UUID(uid_s)
