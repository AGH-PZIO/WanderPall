from dataclasses import replace
from datetime import timedelta
from uuid import UUID, uuid4

from app.core.config import settings
from app.modules.account.errors import ConflictError, NotFoundError, ValidationError
from app.modules.account.models import PendingRegistration, User
from app.modules.account.notifications import ConsoleNotificationService
from app.modules.account.repositories import PendingRegistrationRepository, UserRepository
from app.modules.account.schemas import RegistrationCompleteRequest, RegistrationStartRequest, RegistrationStartResponse, UserResponse
from app.modules.account.security import generate_verification_code, hash_password, hash_token, utc_now
from app.modules.account.services.users import user_to_response
from app.modules.account.services.validation import validate_password_confirmation


class RegistrationService:
    def __init__(
        self,
        users: UserRepository,
        pending_registrations: PendingRegistrationRepository,
        notifications: ConsoleNotificationService,
    ) -> None:
        self.users = users
        self.pending_registrations = pending_registrations
        self.notifications = notifications

    def start(self, request: RegistrationStartRequest) -> RegistrationStartResponse:
        if self.users.email_exists(str(request.email)):
            raise ConflictError("User with this email already exists")

        email_code = generate_verification_code()
        phone_code = generate_verification_code() if request.phone else None
        registration = PendingRegistration(
            id=uuid4(),
            first_name=request.first_name,
            last_name=request.last_name,
            birth_date=request.birth_date,
            email=str(request.email),
            phone=request.phone,
            email_code_hash=hash_token(email_code),
            phone_code_hash=hash_token(phone_code) if phone_code else None,
            email_verified=False,
            phone_verified=False,
            expires_at=utc_now() + timedelta(minutes=settings.verification_code_expire_minutes),
        )
        self.pending_registrations.create(registration)
        self.notifications.send_email_verification(registration.email, email_code)
        if registration.phone and phone_code:
            self.notifications.send_phone_verification(registration.phone, phone_code)

        return RegistrationStartResponse(
            registration_id=registration.id,
            phone_verification_required=registration.phone is not None,
        )

    def verify_email(self, registration_id: UUID, code: str) -> None:
        registration = self._get_active_registration(registration_id)
        if registration.email_code_hash != hash_token(code):
            raise ValidationError("Invalid email verification code")
        self.pending_registrations.update(replace(registration, email_verified=True))

    def verify_phone(self, registration_id: UUID, code: str) -> None:
        registration = self._get_active_registration(registration_id)
        if registration.phone is None or registration.phone_code_hash is None:
            raise ValidationError("Phone verification was not requested")
        if registration.phone_code_hash != hash_token(code):
            raise ValidationError("Invalid phone verification code")
        self.pending_registrations.update(replace(registration, phone_verified=True))

    def complete(self, request: RegistrationCompleteRequest) -> UserResponse:
        registration = self._get_active_registration(request.registration_id)
        if not registration.email_verified:
            raise ValidationError("Email must be verified before account creation")
        if self.users.email_exists(registration.email):
            raise ConflictError("User with this email already exists")
        validate_password_confirmation(request.password, request.password_confirmation)

        user = User(
            id=uuid4(),
            first_name=registration.first_name,
            last_name=registration.last_name,
            birth_date=registration.birth_date,
            email=registration.email,
            phone=registration.phone if registration.phone_verified else None,
            password_hash=hash_password(request.password),
            theme="light",
        )
        created = self.users.create(user)
        self.pending_registrations.delete(registration.id)
        return user_to_response(created)

    def _get_active_registration(self, registration_id: UUID) -> PendingRegistration:
        registration = self.pending_registrations.get_by_id(registration_id)
        if registration is None or registration.expires_at < utc_now():
            raise NotFoundError("Registration was not found or expired")
        return registration
