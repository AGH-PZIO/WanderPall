from app.modules.account.errors import AuthenticationError
from app.modules.account.repositories import UserRepository
from app.modules.account.schemas import LoginRequest, TokenResponse
from app.modules.account.security import verify_password
from app.modules.account.services.tokens import TokenService


class LoginService:
    def __init__(self, users: UserRepository, token_service: TokenService) -> None:
        self.users = users
        self.token_service = token_service

    def login(self, request: LoginRequest) -> TokenResponse:
        user = self.users.get_by_email(str(request.email))
        if user is None or not verify_password(request.password, user.password_hash):
            raise AuthenticationError("Wprowadzono niepoprawne hasło")
        return self.token_service.issue_tokens(user)
