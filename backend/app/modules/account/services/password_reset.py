from datetime import timedelta
from uuid import uuid4

from app.core.config import settings
from app.modules.account.errors import NotFoundError, ValidationError
from app.modules.account.models import PasswordResetTokenRecord
from app.modules.account.notifications import ConsoleNotificationService
from app.modules.account.repositories import PasswordResetTokenRepository, UserRepository
from app.modules.account.security import generate_opaque_token, hash_password, hash_token, utc_now
from app.modules.account.services.validation import validate_password_confirmation


class PasswordResetService:
    def __init__(
        self,
        users: UserRepository,
        password_reset_tokens: PasswordResetTokenRepository,
        notifications: ConsoleNotificationService,
    ) -> None:
        self.users = users
        self.password_reset_tokens = password_reset_tokens
        self.notifications = notifications

    def request_reset(self, email: str) -> None:
        user = self.users.get_by_email(email)
        if user is None:
            raise NotFoundError("Twój adres e-mail nie jest związany z żadnym kontem - utwórz nowe konto")
        token = generate_opaque_token()
        self.password_reset_tokens.create(
            PasswordResetTokenRecord(
                id=uuid4(),
                user_id=user.id,
                token_hash=hash_token(token),
                expires_at=utc_now() + timedelta(minutes=settings.password_reset_expire_minutes),
            )
        )
        self.notifications.send_password_reset(user.email, token)

    def confirm_reset(self, token: str, password: str, password_confirmation: str) -> None:
        validate_password_confirmation(password, password_confirmation)
        token_hash = hash_token(token)
        record = self.password_reset_tokens.get_by_hash(token_hash)
        if record is None or record.used_at is not None or record.expires_at < utc_now():
            raise ValidationError("Invalid or expired password reset token")
        self.users.update_password(record.user_id, hash_password(password))
        self.password_reset_tokens.mark_used(token_hash)
