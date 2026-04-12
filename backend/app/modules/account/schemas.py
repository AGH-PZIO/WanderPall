from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UserResponse(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    birth_date: date
    email: EmailStr
    phone: str | None = None
    theme: str


class RegistrationStartRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    birth_date: date
    email: EmailStr
    phone: str | None = Field(default=None, max_length=32)


class RegistrationStartResponse(BaseModel):
    registration_id: UUID
    email_verification_required: bool = True
    phone_verification_required: bool


class VerifyCodeRequest(BaseModel):
    registration_id: UUID
    code: str = Field(min_length=1, max_length=32)


class RegistrationCompleteRequest(BaseModel):
    registration_id: UUID
    password: str
    password_confirmation: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_at: datetime
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class UpdateUserRequest(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    birth_date: date | None = None
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=32)


class DeleteUserRequest(BaseModel):
    confirm: bool


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirmRequest(BaseModel):
    token: str
    password: str
    password_confirmation: str


class ThemeResponse(BaseModel):
    theme: str


class ThemeUpdateRequest(BaseModel):
    theme: str
