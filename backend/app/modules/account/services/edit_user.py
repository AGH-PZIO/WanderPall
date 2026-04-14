from dataclasses import replace
from uuid import UUID

from app.modules.account.errors import ConflictError, NotFoundError, ValidationError
from app.modules.account.models import User
from app.modules.account.repositories import RefreshTokenRepository, UserRepository
from app.modules.account.schemas import UpdateUserRequest, UserResponse
from app.modules.account.services.users import user_to_response


class EditUserService:
    def __init__(self, users: UserRepository, refresh_tokens: RefreshTokenRepository) -> None:
        self.users = users
        self.refresh_tokens = refresh_tokens

    def get_user(self, user_id: UUID) -> UserResponse:
        user = self._get_user(user_id)
        return user_to_response(user)

    def update_user(self, user_id: UUID, request: UpdateUserRequest) -> UserResponse:
        user = self._get_user(user_id)
        next_email = str(request.email) if request.email is not None else user.email
        if next_email != user.email and self.users.email_exists(next_email, exclude_user_id=user_id):
            raise ConflictError("User with this email already exists")
        updated = replace(
            user,
            first_name=request.first_name if request.first_name is not None else user.first_name,
            last_name=request.last_name if request.last_name is not None else user.last_name,
            birth_date=request.birth_date if request.birth_date is not None else user.birth_date,
            email=next_email,
            phone=request.phone if request.phone is not None else user.phone,
        )
        return user_to_response(self.users.update(updated))

    def delete_user(self, user_id: UUID, confirm: bool) -> None:
        if not confirm:
            raise ValidationError("Account deletion must be confirmed")
        self._get_user(user_id)
        self.users.delete(user_id)
        self.refresh_tokens.revoke_all_for_user(user_id)

    def _get_user(self, user_id: UUID) -> User:
        user = self.users.get_by_id(user_id)
        if user is None:
            raise NotFoundError("User not found")
        return user
