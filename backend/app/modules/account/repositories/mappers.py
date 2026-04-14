from collections.abc import Mapping

from app.modules.account.models import PasswordResetTokenRecord, PendingRegistration, RefreshTokenRecord, User


def user_from_row(row: Mapping) -> User:
    return User(
        id=row["id"],
        first_name=row["first_name"],
        last_name=row["last_name"],
        birth_date=row["birth_date"],
        email=row["email"],
        phone=row["phone"],
        password_hash=row["password_hash"],
        theme=row["theme"],
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
        deleted_at=row.get("deleted_at"),
    )


def pending_registration_from_row(row: Mapping) -> PendingRegistration:
    return PendingRegistration(
        id=row["id"],
        first_name=row["first_name"],
        last_name=row["last_name"],
        birth_date=row["birth_date"],
        email=row["email"],
        phone=row["phone"],
        email_code_hash=row["email_code_hash"],
        phone_code_hash=row["phone_code_hash"],
        email_verified=row["email_verified"],
        phone_verified=row["phone_verified"],
        expires_at=row["expires_at"],
    )


def refresh_token_from_row(row: Mapping) -> RefreshTokenRecord:
    return RefreshTokenRecord(
        id=row["id"],
        user_id=row["user_id"],
        token_hash=row["token_hash"],
        expires_at=row["expires_at"],
        revoked_at=row.get("revoked_at"),
    )


def password_reset_token_from_row(row: Mapping) -> PasswordResetTokenRecord:
    return PasswordResetTokenRecord(
        id=row["id"],
        user_id=row["user_id"],
        token_hash=row["token_hash"],
        expires_at=row["expires_at"],
        used_at=row.get("used_at"),
    )
