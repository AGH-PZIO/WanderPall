from dataclasses import replace
from datetime import date, timedelta
from uuid import UUID, uuid4

import pytest

from app.modules.account.errors import AuthenticationError, ConflictError, NotFoundError, ValidationError
from app.modules.account.models import PasswordResetTokenRecord, PendingRegistration, RefreshTokenRecord, User
from app.modules.account.schemas import (
    LoginRequest,
    RegistrationCompleteRequest,
    RegistrationStartRequest,
    UpdateUserRequest,
)
from app.modules.account.security import create_access_token, hash_password, hash_token, utc_now, verify_password
from app.modules.account.services import (
    EditUserService,
    LoginService,
    PasswordResetService,
    RegistrationService,
    ThemeService,
    TokenService,
)


class FakeNotifications:
    def __init__(self) -> None:
        self.email_codes: dict[str, str] = {}
        self.phone_codes: dict[str, str] = {}
        self.reset_tokens: dict[str, str] = {}

    def send_email_verification(self, email: str, code: str) -> None:
        self.email_codes[email] = code

    def send_phone_verification(self, phone: str, code: str) -> None:
        self.phone_codes[phone] = code

    def send_password_reset(self, email: str, token: str) -> None:
        self.reset_tokens[email] = token


class FakeUsers:
    def __init__(self) -> None:
        self.users: dict[UUID, User] = {}

    def get_by_id(self, user_id: UUID) -> User | None:
        user = self.users.get(user_id)
        if user and user.deleted_at is None:
            return user
        return None

    def get_by_email(self, email: str) -> User | None:
        for user in self.users.values():
            if user.email.lower() == email.lower() and user.deleted_at is None:
                return user
        return None

    def email_exists(self, email: str, exclude_user_id: UUID | None = None) -> bool:
        user = self.get_by_email(email)
        return user is not None and user.id != exclude_user_id

    def create(self, user: User) -> User:
        self.users[user.id] = user
        return user

    def update(self, user: User) -> User:
        self.users[user.id] = user
        return user

    def delete(self, user_id: UUID) -> None:
        self.users[user_id] = replace(self.users[user_id], deleted_at=utc_now())

    def update_password(self, user_id: UUID, password_hash: str) -> None:
        self.users[user_id] = replace(self.users[user_id], password_hash=password_hash)

    def update_theme(self, user_id: UUID, theme: str) -> User:
        user = replace(self.users[user_id], theme=theme)
        self.users[user_id] = user
        return user


class FakePendingRegistrations:
    def __init__(self) -> None:
        self.registrations: dict[UUID, PendingRegistration] = {}

    def create(self, registration: PendingRegistration) -> PendingRegistration:
        self.registrations[registration.id] = registration
        return registration

    def get_by_id(self, registration_id: UUID) -> PendingRegistration | None:
        return self.registrations.get(registration_id)

    def update(self, registration: PendingRegistration) -> PendingRegistration:
        self.registrations[registration.id] = registration
        return registration

    def delete(self, registration_id: UUID) -> None:
        self.registrations.pop(registration_id, None)


class FakeRefreshTokens:
    def __init__(self) -> None:
        self.records: dict[str, RefreshTokenRecord] = {}

    def create(self, record: RefreshTokenRecord) -> RefreshTokenRecord:
        self.records[record.token_hash] = record
        return record

    def get_by_hash(self, token_hash: str) -> RefreshTokenRecord | None:
        return self.records.get(token_hash)

    def revoke(self, token_hash: str) -> None:
        if token_hash in self.records:
            self.records[token_hash] = replace(self.records[token_hash], revoked_at=utc_now())

    def revoke_all_for_user(self, user_id: UUID) -> None:
        for token_hash, record in list(self.records.items()):
            if record.user_id == user_id:
                self.records[token_hash] = replace(record, revoked_at=utc_now())


class FakePasswordResetTokens:
    def __init__(self) -> None:
        self.records: dict[str, PasswordResetTokenRecord] = {}

    def create(self, record: PasswordResetTokenRecord) -> PasswordResetTokenRecord:
        self.records[record.token_hash] = record
        return record

    def get_by_hash(self, token_hash: str) -> PasswordResetTokenRecord | None:
        return self.records.get(token_hash)

    def mark_used(self, token_hash: str) -> None:
        self.records[token_hash] = replace(self.records[token_hash], used_at=utc_now())


def make_user(email: str = "user@example.com", password: str = "Strong12!") -> User:
    return User(
        id=uuid4(),
        first_name="Test",
        last_name="User",
        birth_date=date(2000, 1, 1),
        email=email,
        phone=None,
        password_hash=hash_password(password),
        theme="light",
    )


def registration_service():
    users = FakeUsers()
    pending = FakePendingRegistrations()
    notifications = FakeNotifications()
    return users, pending, notifications, RegistrationService(users, pending, notifications)


def test_registration_requires_email_verification_before_completion() -> None:
    _, _, _, service = registration_service()
    started = service.start(
        RegistrationStartRequest(
            first_name="Jan",
            last_name="Kowalski",
            birth_date=date(2000, 1, 1),
            email="jan@example.com",
        )
    )

    with pytest.raises(ValidationError):
        service.complete(
            RegistrationCompleteRequest(
                registration_id=started.registration_id,
                password="Strong12!",
                password_confirmation="Strong12!",
            )
        )


def test_registration_rejects_duplicate_existing_email() -> None:
    users, _, _, service = registration_service()
    users.create(make_user(email="jan@example.com"))

    with pytest.raises(ConflictError):
        service.start(
            RegistrationStartRequest(
                first_name="Jan",
                last_name="Kowalski",
                birth_date=date(2000, 1, 1),
                email="JAN@example.com",
            )
        )


def test_registration_optional_phone_is_saved_only_when_verified() -> None:
    users, _, notifications, service = registration_service()
    started = service.start(
        RegistrationStartRequest(
            first_name="Jan",
            last_name="Kowalski",
            birth_date=date(2000, 1, 1),
            email="jan@example.com",
            phone="+48123123123",
        )
    )
    service.verify_email(started.registration_id, notifications.email_codes["jan@example.com"])
    user = service.complete(
        RegistrationCompleteRequest(
            registration_id=started.registration_id,
            password="Strong12!",
            password_confirmation="Strong12!",
        )
    )
    assert user.phone is None

    started = service.start(
        RegistrationStartRequest(
            first_name="Anna",
            last_name="Nowak",
            birth_date=date(2000, 1, 1),
            email="anna@example.com",
            phone="+48555555555",
        )
    )
    service.verify_email(started.registration_id, notifications.email_codes["anna@example.com"])
    service.verify_phone(started.registration_id, notifications.phone_codes["+48555555555"])
    user = service.complete(
        RegistrationCompleteRequest(
            registration_id=started.registration_id,
            password="Strong12!",
            password_confirmation="Strong12!",
        )
    )
    assert user.phone == "+48555555555"
    assert len(users.users) == 2


def test_registration_rejects_invalid_and_expired_verification_codes() -> None:
    _, pending, notifications, service = registration_service()
    started = service.start(
        RegistrationStartRequest(
            first_name="Jan",
            last_name="Kowalski",
            birth_date=date(2000, 1, 1),
            email="jan@example.com",
            phone="+48123123123",
        )
    )

    with pytest.raises(ValidationError):
        service.verify_email(started.registration_id, "wrong-code")
    assert pending.get_by_id(started.registration_id).email_verified is False

    service.verify_email(started.registration_id, notifications.email_codes["jan@example.com"])
    with pytest.raises(ValidationError):
        service.verify_phone(started.registration_id, "wrong-code")
    assert pending.get_by_id(started.registration_id).phone_verified is False

    expired = replace(pending.get_by_id(started.registration_id), expires_at=utc_now() - timedelta(minutes=1))
    pending.update(expired)
    with pytest.raises(NotFoundError):
        service.verify_phone(started.registration_id, notifications.phone_codes["+48123123123"])


def test_weak_password_is_rejected() -> None:
    _, _, notifications, service = registration_service()
    started = service.start(
        RegistrationStartRequest(
            first_name="Jan",
            last_name="Kowalski",
            birth_date=date(2000, 1, 1),
            email="jan@example.com",
        )
    )
    service.verify_email(started.registration_id, notifications.email_codes["jan@example.com"])
    with pytest.raises(ValidationError):
        service.complete(
            RegistrationCompleteRequest(
                registration_id=started.registration_id,
                password="weak",
                password_confirmation="weak",
            )
        )


def test_password_confirmation_must_match() -> None:
    _, _, notifications, service = registration_service()
    started = service.start(
        RegistrationStartRequest(
            first_name="Jan",
            last_name="Kowalski",
            birth_date=date(2000, 1, 1),
            email="jan@example.com",
        )
    )
    service.verify_email(started.registration_id, notifications.email_codes["jan@example.com"])

    with pytest.raises(ValidationError):
        service.complete(
            RegistrationCompleteRequest(
                registration_id=started.registration_id,
                password="Strong12!",
                password_confirmation="Strong13!",
            )
        )


def test_login_and_refresh_token_rotation() -> None:
    users = FakeUsers()
    refresh_tokens = FakeRefreshTokens()
    user = users.create(make_user())
    token_service = TokenService(users, refresh_tokens)
    login_response = LoginService(users, token_service).login(
        LoginRequest(email="user@example.com", password="Strong12!")
    )

    assert login_response.refresh_token.count(".") == 2
    refreshed = token_service.refresh(login_response.refresh_token)
    assert refreshed.refresh_token != login_response.refresh_token
    with pytest.raises(AuthenticationError):
        token_service.refresh(login_response.refresh_token)
    assert refreshed.user.id == user.id


def test_login_rejects_wrong_password() -> None:
    users = FakeUsers()
    refresh_tokens = FakeRefreshTokens()
    users.create(make_user())
    token_service = TokenService(users, refresh_tokens)

    with pytest.raises(AuthenticationError):
        LoginService(users, token_service).login(LoginRequest(email="user@example.com", password="Wrong12!"))


def test_refresh_rejects_access_tokens_and_expired_records() -> None:
    users = FakeUsers()
    refresh_tokens = FakeRefreshTokens()
    user = users.create(make_user())
    token_service = TokenService(users, refresh_tokens)
    login_response = token_service.issue_tokens(user)

    access_token, _ = create_access_token(user.id)
    with pytest.raises(AuthenticationError):
        token_service.refresh(access_token)

    record = next(iter(refresh_tokens.records.values()))
    refresh_tokens.records[record.token_hash] = replace(record, expires_at=utc_now() - timedelta(minutes=1))
    with pytest.raises(AuthenticationError):
        token_service.refresh(login_response.refresh_token)


def test_logout_revokes_refresh_token() -> None:
    users = FakeUsers()
    refresh_tokens = FakeRefreshTokens()
    user = users.create(make_user())
    token_service = TokenService(users, refresh_tokens)
    login_response = token_service.issue_tokens(user)

    token_service.logout(login_response.refresh_token)

    with pytest.raises(AuthenticationError):
        token_service.refresh(login_response.refresh_token)


def test_password_reset_changes_password_and_cannot_be_reused() -> None:
    users = FakeUsers()
    reset_tokens = FakePasswordResetTokens()
    notifications = FakeNotifications()
    user = users.create(make_user())
    service = PasswordResetService(users, reset_tokens, notifications)

    service.request_reset(user.email)
    token = notifications.reset_tokens[user.email]
    service.confirm_reset(token, "Newpass12!", "Newpass12!")

    assert verify_password("Newpass12!", users.get_by_id(user.id).password_hash)
    with pytest.raises(ValidationError):
        service.confirm_reset(token, "Another12!", "Another12!")


def test_password_reset_rejects_unknown_email_and_weak_confirmation() -> None:
    users = FakeUsers()
    reset_tokens = FakePasswordResetTokens()
    notifications = FakeNotifications()
    user = users.create(make_user())
    service = PasswordResetService(users, reset_tokens, notifications)

    with pytest.raises(NotFoundError):
        service.request_reset("missing@example.com")

    service.request_reset(user.email)
    token = notifications.reset_tokens[user.email]
    with pytest.raises(ValidationError):
        service.confirm_reset(token, "weak", "weak")
    with pytest.raises(ValidationError):
        service.confirm_reset(token, "Strong12!", "Strong13!")


def test_edit_delete_and_theme_flow() -> None:
    users = FakeUsers()
    refresh_tokens = FakeRefreshTokens()
    user = users.create(make_user())
    edit_service = EditUserService(users, refresh_tokens)

    updated = edit_service.update_user(user.id, UpdateUserRequest(first_name="Changed"))
    assert updated.first_name == "Changed"

    theme_service = ThemeService(users)
    assert theme_service.update_theme(user.id, "dark") == "dark"
    with pytest.raises(ValidationError):
        theme_service.update_theme(user.id, "blue")

    edit_service.delete_user(user.id, confirm=True)
    with pytest.raises(NotFoundError):
        edit_service.get_user(user.id)


def test_edit_rejects_email_conflict_and_delete_without_confirmation() -> None:
    users = FakeUsers()
    refresh_tokens = FakeRefreshTokens()
    user = users.create(make_user(email="user@example.com"))
    other_user = users.create(make_user(email="other@example.com"))
    token_service = TokenService(users, refresh_tokens)
    token_service.issue_tokens(user)
    edit_service = EditUserService(users, refresh_tokens)

    with pytest.raises(ConflictError):
        edit_service.update_user(user.id, UpdateUserRequest(email=other_user.email))
    with pytest.raises(ValidationError):
        edit_service.delete_user(user.id, confirm=False)

    edit_service.delete_user(user.id, confirm=True)
    assert all(record.revoked_at is not None for record in refresh_tokens.records.values())
