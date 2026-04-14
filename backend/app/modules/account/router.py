from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from psycopg import Connection

from app.core.database import get_connection
from app.modules.account.dependencies import get_current_user
from app.modules.account.models import User
from app.modules.account.notifications import ConsoleNotificationService
from app.modules.account.repositories import (
    PsycopgPasswordResetTokenRepository,
    PsycopgPendingRegistrationRepository,
    PsycopgRefreshTokenRepository,
    PsycopgUserRepository,
)
from app.modules.account.schemas import (
    DeleteUserRequest,
    LoginRequest,
    LogoutRequest,
    PasswordResetConfirmRequest,
    PasswordResetRequest,
    RefreshTokenRequest,
    RegistrationCompleteRequest,
    RegistrationStartRequest,
    RegistrationStartResponse,
    ThemeResponse,
    ThemeUpdateRequest,
    TokenResponse,
    UpdateUserRequest,
    UserResponse,
    VerifyCodeRequest,
)
from app.modules.account.services import (
    EditUserService,
    LoginService,
    PasswordResetService,
    RegistrationService,
    ThemeService,
    TokenService,
    user_to_response,
)

router = APIRouter(prefix="/account", tags=["module-1-account-auth"])


@router.get("/status")
def account_status() -> dict[str, str]:
    return {"module": "account", "status": "ok"}


def _repositories(connection: Connection):
    users = PsycopgUserRepository(connection)
    refresh_tokens = PsycopgRefreshTokenRepository(connection)
    return users, refresh_tokens


@router.post("/register/start", response_model=RegistrationStartResponse, status_code=status.HTTP_201_CREATED)
def start_registration(
    request: RegistrationStartRequest,
    connection: Annotated[Connection, Depends(get_connection)],
) -> RegistrationStartResponse:
    users, _ = _repositories(connection)
    service = RegistrationService(
        users,
        PsycopgPendingRegistrationRepository(connection),
        ConsoleNotificationService(),
    )
    return service.start(request)


@router.post("/register/verify-email", status_code=status.HTTP_204_NO_CONTENT)
def verify_registration_email(
    request: VerifyCodeRequest,
    connection: Annotated[Connection, Depends(get_connection)],
) -> Response:
    users, _ = _repositories(connection)
    RegistrationService(
        users,
        PsycopgPendingRegistrationRepository(connection),
        ConsoleNotificationService(),
    ).verify_email(request.registration_id, request.code)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/register/verify-phone", status_code=status.HTTP_204_NO_CONTENT)
def verify_registration_phone(
    request: VerifyCodeRequest,
    connection: Annotated[Connection, Depends(get_connection)],
) -> Response:
    users, _ = _repositories(connection)
    RegistrationService(
        users,
        PsycopgPendingRegistrationRepository(connection),
        ConsoleNotificationService(),
    ).verify_phone(request.registration_id, request.code)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/register/complete", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def complete_registration(
    request: RegistrationCompleteRequest,
    connection: Annotated[Connection, Depends(get_connection)],
) -> UserResponse:
    users, _ = _repositories(connection)
    return RegistrationService(
        users,
        PsycopgPendingRegistrationRepository(connection),
        ConsoleNotificationService(),
    ).complete(request)


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, connection: Annotated[Connection, Depends(get_connection)]) -> TokenResponse:
    users, refresh_tokens = _repositories(connection)
    return LoginService(users, TokenService(users, refresh_tokens)).login(request)


@router.post("/token/refresh", response_model=TokenResponse)
def refresh_token(
    request: RefreshTokenRequest,
    connection: Annotated[Connection, Depends(get_connection)],
) -> TokenResponse:
    users, refresh_tokens = _repositories(connection)
    return TokenService(users, refresh_tokens).refresh(request.refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: LogoutRequest, connection: Annotated[Connection, Depends(get_connection)]) -> Response:
    _, refresh_tokens = _repositories(connection)
    TokenService(PsycopgUserRepository(connection), refresh_tokens).logout(request.refresh_token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: Annotated[User, Depends(get_current_user)]) -> UserResponse:
    return user_to_response(current_user)


@router.patch("/me", response_model=UserResponse)
def update_me(
    request: UpdateUserRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> UserResponse:
    users, refresh_tokens = _repositories(connection)
    return EditUserService(users, refresh_tokens).update_user(current_user.id, request)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(
    request: DeleteUserRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> Response:
    users, refresh_tokens = _repositories(connection)
    EditUserService(users, refresh_tokens).delete_user(current_user.id, request.confirm)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/password-reset/request", status_code=status.HTTP_204_NO_CONTENT)
def request_password_reset(
    request: PasswordResetRequest,
    connection: Annotated[Connection, Depends(get_connection)],
) -> Response:
    PasswordResetService(
        PsycopgUserRepository(connection),
        PsycopgPasswordResetTokenRepository(connection),
        ConsoleNotificationService(),
    ).request_reset(str(request.email))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/password-reset/confirm", status_code=status.HTTP_204_NO_CONTENT)
def confirm_password_reset(
    request: PasswordResetConfirmRequest,
    connection: Annotated[Connection, Depends(get_connection)],
) -> Response:
    PasswordResetService(
        PsycopgUserRepository(connection),
        PsycopgPasswordResetTokenRepository(connection),
        ConsoleNotificationService(),
    ).confirm_reset(request.token, request.password, request.password_confirmation)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/theme", response_model=ThemeResponse)
def get_theme(current_user: Annotated[User, Depends(get_current_user)]) -> ThemeResponse:
    return ThemeResponse(theme=current_user.theme)


@router.put("/theme", response_model=ThemeResponse)
def update_theme(
    request: ThemeUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> ThemeResponse:
    theme = ThemeService(PsycopgUserRepository(connection)).update_theme(current_user.id, request.theme)
    return ThemeResponse(theme=theme)
