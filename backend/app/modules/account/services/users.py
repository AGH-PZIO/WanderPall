from app.modules.account.models import User
from app.modules.account.schemas import UserResponse


def user_to_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        first_name=user.first_name,
        last_name=user.last_name,
        birth_date=user.birth_date,
        email=user.email,
        phone=user.phone,
        theme=user.theme,
    )
