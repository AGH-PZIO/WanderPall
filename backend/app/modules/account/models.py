from dataclasses import dataclass
from datetime import date, datetime
from uuid import UUID


@dataclass(frozen=True)
class User:
    id: UUID
    first_name: str
    last_name: str
    birth_date: date
    email: str
    phone: str | None
    password_hash: str
    theme: str
    created_at: datetime | None = None
    updated_at: datetime | None = None
    deleted_at: datetime | None = None


@dataclass(frozen=True)
class PendingRegistration:
    id: UUID
    first_name: str
    last_name: str
    birth_date: date
    email: str
    phone: str | None
    email_code_hash: str
    phone_code_hash: str | None
    email_verified: bool
    phone_verified: bool
    expires_at: datetime


@dataclass(frozen=True)
class RefreshTokenRecord:
    id: UUID
    user_id: UUID
    token_hash: str
    expires_at: datetime
    revoked_at: datetime | None = None


@dataclass(frozen=True)
class PasswordResetTokenRecord:
    id: UUID
    user_id: UUID
    token_hash: str
    expires_at: datetime
    used_at: datetime | None = None
