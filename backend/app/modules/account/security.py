from datetime import datetime, timedelta, timezone
from hashlib import sha256
from secrets import randbelow, token_urlsafe
from typing import Any
from uuid import UUID, uuid4

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.core.config import settings

password_hasher = PasswordHasher(time_cost=2, memory_cost=19456, parallelism=1)


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return password_hasher.verify(password_hash, password)
    except VerifyMismatchError:
        return False


def hash_token(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()


def generate_opaque_token() -> str:
    return token_urlsafe(32)


def generate_verification_code() -> str:
    return f"{randbelow(1_000_000):06d}"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(user_id: UUID) -> tuple[str, datetime]:
    expires_at = utc_now() + timedelta(minutes=settings.access_token_expire_minutes)
    payload: dict[str, Any] = {"sub": str(user_id), "exp": expires_at, "type": "access"}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm="HS256"), expires_at


def create_refresh_token(user_id: UUID) -> tuple[str, datetime, str]:
    expires_at = utc_now() + timedelta(days=settings.refresh_token_expire_days)
    jti = str(uuid4())
    payload: dict[str, Any] = {"sub": str(user_id), "jti": jti, "exp": expires_at, "type": "refresh"}
    token = jwt.encode(payload, settings.jwt_secret_key, algorithm="HS256")
    return token, expires_at, hash_token(jti)


def decode_access_token(token: str) -> UUID:
    payload = jwt.decode(token, settings.jwt_secret_key, algorithms=["HS256"])
    if payload.get("type") != "access":
        raise jwt.InvalidTokenError("Invalid token type")
    return UUID(payload["sub"])


def decode_refresh_token(token: str) -> tuple[UUID, str]:
    payload = jwt.decode(token, settings.jwt_secret_key, algorithms=["HS256"])
    if payload.get("type") != "refresh":
        raise jwt.InvalidTokenError("Invalid token type")
    return UUID(payload["sub"]), hash_token(payload["jti"])
