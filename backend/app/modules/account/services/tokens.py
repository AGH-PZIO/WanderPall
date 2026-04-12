from uuid import uuid4

import jwt

from app.modules.account.errors import AuthenticationError
from app.modules.account.models import RefreshTokenRecord, User
from app.modules.account.repositories import RefreshTokenRepository, UserRepository
from app.modules.account.schemas import TokenResponse
from app.modules.account.security import create_access_token, create_refresh_token, decode_refresh_token, utc_now
from app.modules.account.services.users import user_to_response


class TokenService:
    def __init__(self, users: UserRepository, refresh_tokens: RefreshTokenRepository) -> None:
        self.users = users
        self.refresh_tokens = refresh_tokens

    def issue_tokens(self, user: User) -> TokenResponse:
        access_token, access_expires_at = create_access_token(user.id)
        refresh_token, refresh_expires_at, refresh_token_hash = create_refresh_token(user.id)
        self.refresh_tokens.create(
            RefreshTokenRecord(
                id=uuid4(),
                user_id=user.id,
                token_hash=refresh_token_hash,
                expires_at=refresh_expires_at,
            )
        )
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=access_expires_at,
            user=user_to_response(user),
        )

    def refresh(self, refresh_token: str) -> TokenResponse:
        try:
            user_id, refresh_token_hash = decode_refresh_token(refresh_token)
        except jwt.InvalidTokenError as exc:
            raise AuthenticationError("Invalid refresh token") from exc
        record = self.refresh_tokens.get_by_hash(refresh_token_hash)
        if record is None or record.revoked_at is not None or record.expires_at < utc_now():
            raise AuthenticationError("Invalid refresh token")
        user = self.users.get_by_id(user_id)
        if user is None:
            raise AuthenticationError("Invalid refresh token")
        self.refresh_tokens.revoke(refresh_token_hash)
        return self.issue_tokens(user)

    def logout(self, refresh_token: str) -> None:
        try:
            _, refresh_token_hash = decode_refresh_token(refresh_token)
        except jwt.InvalidTokenError:
            return
        self.refresh_tokens.revoke(refresh_token_hash)
