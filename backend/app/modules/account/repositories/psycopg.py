from uuid import UUID

from psycopg import Connection

from app.modules.account.models import PasswordResetTokenRecord, PendingRegistration, RefreshTokenRecord, User
from app.modules.account.repositories.mappers import (
    password_reset_token_from_row,
    pending_registration_from_row,
    refresh_token_from_row,
    user_from_row,
)


class PsycopgUserRepository:
    def __init__(self, connection: Connection) -> None:
        self.connection = connection

    def get_by_id(self, user_id: UUID) -> User | None:
        row = self.connection.execute(
            "SELECT * FROM account.users WHERE id = %s AND deleted_at IS NULL",
            (user_id,),
        ).fetchone()
        return user_from_row(row) if row else None

    def get_by_email(self, email: str) -> User | None:
        row = self.connection.execute(
            "SELECT * FROM account.users WHERE lower(email) = lower(%s) AND deleted_at IS NULL",
            (email,),
        ).fetchone()
        return user_from_row(row) if row else None

    def email_exists(self, email: str, exclude_user_id: UUID | None = None) -> bool:
        if exclude_user_id is None:
            row = self.connection.execute(
                "SELECT 1 FROM account.users WHERE lower(email) = lower(%s) AND deleted_at IS NULL",
                (email,),
            ).fetchone()
        else:
            row = self.connection.execute(
                """
                SELECT 1 FROM account.users
                WHERE lower(email) = lower(%s) AND id <> %s AND deleted_at IS NULL
                """,
                (email, exclude_user_id),
            ).fetchone()
        return row is not None

    def create(self, user: User) -> User:
        row = self.connection.execute(
            """
            INSERT INTO account.users (
              id, first_name, last_name, birth_date, email, phone, password_hash, theme
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                user.id,
                user.first_name,
                user.last_name,
                user.birth_date,
                user.email,
                user.phone,
                user.password_hash,
                user.theme,
            ),
        ).fetchone()
        return user_from_row(row)

    def update(self, user: User) -> User:
        row = self.connection.execute(
            """
            UPDATE account.users
            SET first_name = %s, last_name = %s, birth_date = %s, email = %s, phone = %s,
                updated_at = now()
            WHERE id = %s AND deleted_at IS NULL
            RETURNING *
            """,
            (user.first_name, user.last_name, user.birth_date, user.email, user.phone, user.id),
        ).fetchone()
        return user_from_row(row)

    def delete(self, user_id: UUID) -> None:
        self.connection.execute(
            "UPDATE account.users SET deleted_at = now(), updated_at = now() WHERE id = %s",
            (user_id,),
        )

    def update_password(self, user_id: UUID, password_hash: str) -> None:
        self.connection.execute(
            "UPDATE account.users SET password_hash = %s, updated_at = now() WHERE id = %s",
            (password_hash, user_id),
        )

    def update_theme(self, user_id: UUID, theme: str) -> User:
        row = self.connection.execute(
            """
            UPDATE account.users SET theme = %s, updated_at = now()
            WHERE id = %s AND deleted_at IS NULL
            RETURNING *
            """,
            (theme, user_id),
        ).fetchone()
        return user_from_row(row)


class PsycopgPendingRegistrationRepository:
    def __init__(self, connection: Connection) -> None:
        self.connection = connection

    def create(self, registration: PendingRegistration) -> PendingRegistration:
        row = self.connection.execute(
            """
            INSERT INTO account.pending_registrations (
              id, first_name, last_name, birth_date, email, phone,
              email_code_hash, phone_code_hash, email_verified, phone_verified, expires_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                registration.id,
                registration.first_name,
                registration.last_name,
                registration.birth_date,
                registration.email,
                registration.phone,
                registration.email_code_hash,
                registration.phone_code_hash,
                registration.email_verified,
                registration.phone_verified,
                registration.expires_at,
            ),
        ).fetchone()
        return pending_registration_from_row(row)

    def get_by_id(self, registration_id: UUID) -> PendingRegistration | None:
        row = self.connection.execute(
            "SELECT * FROM account.pending_registrations WHERE id = %s",
            (registration_id,),
        ).fetchone()
        return pending_registration_from_row(row) if row else None

    def update(self, registration: PendingRegistration) -> PendingRegistration:
        row = self.connection.execute(
            """
            UPDATE account.pending_registrations
            SET email_verified = %s, phone_verified = %s
            WHERE id = %s
            RETURNING *
            """,
            (registration.email_verified, registration.phone_verified, registration.id),
        ).fetchone()
        return pending_registration_from_row(row)

    def delete(self, registration_id: UUID) -> None:
        self.connection.execute(
            "DELETE FROM account.pending_registrations WHERE id = %s",
            (registration_id,),
        )


class PsycopgRefreshTokenRepository:
    def __init__(self, connection: Connection) -> None:
        self.connection = connection

    def create(self, record: RefreshTokenRecord) -> RefreshTokenRecord:
        row = self.connection.execute(
            """
            INSERT INTO account.refresh_tokens (id, user_id, token_hash, expires_at, revoked_at)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING *
            """,
            (record.id, record.user_id, record.token_hash, record.expires_at, record.revoked_at),
        ).fetchone()
        return refresh_token_from_row(row)

    def get_by_hash(self, token_hash: str) -> RefreshTokenRecord | None:
        row = self.connection.execute(
            "SELECT * FROM account.refresh_tokens WHERE token_hash = %s",
            (token_hash,),
        ).fetchone()
        return refresh_token_from_row(row) if row else None

    def revoke(self, token_hash: str) -> None:
        self.connection.execute(
            "UPDATE account.refresh_tokens SET revoked_at = now() WHERE token_hash = %s",
            (token_hash,),
        )

    def revoke_all_for_user(self, user_id: UUID) -> None:
        self.connection.execute(
            "UPDATE account.refresh_tokens SET revoked_at = now() WHERE user_id = %s AND revoked_at IS NULL",
            (user_id,),
        )


class PsycopgPasswordResetTokenRepository:
    def __init__(self, connection: Connection) -> None:
        self.connection = connection

    def create(self, record: PasswordResetTokenRecord) -> PasswordResetTokenRecord:
        row = self.connection.execute(
            """
            INSERT INTO account.password_reset_tokens (id, user_id, token_hash, expires_at, used_at)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING *
            """,
            (record.id, record.user_id, record.token_hash, record.expires_at, record.used_at),
        ).fetchone()
        return password_reset_token_from_row(row)

    def get_by_hash(self, token_hash: str) -> PasswordResetTokenRecord | None:
        row = self.connection.execute(
            "SELECT * FROM account.password_reset_tokens WHERE token_hash = %s",
            (token_hash,),
        ).fetchone()
        return password_reset_token_from_row(row) if row else None

    def mark_used(self, token_hash: str) -> None:
        self.connection.execute(
            "UPDATE account.password_reset_tokens SET used_at = now() WHERE token_hash = %s",
            (token_hash,),
        )
