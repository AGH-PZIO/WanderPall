from uuid import UUID

from app.modules.account.errors import NotFoundError, ValidationError
from app.modules.account.repositories import UserRepository


class ThemeService:
    def __init__(self, users: UserRepository) -> None:
        self.users = users

    def get_theme(self, user_id: UUID) -> str:
        user = self.users.get_by_id(user_id)
        if user is None:
            raise NotFoundError("User not found")
        return user.theme

    def update_theme(self, user_id: UUID, theme: str) -> str:
        if theme not in {"light", "dark"}:
            raise ValidationError("Theme must be light or dark")
        user = self.users.update_theme(user_id, theme)
        return user.theme
