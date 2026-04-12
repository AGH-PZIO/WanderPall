from typing import Annotated

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from psycopg import Connection

from app.core.database import get_connection
from app.modules.account.errors import AuthenticationError
from app.modules.account.models import User
from app.modules.account.repositories import PsycopgUserRepository
from app.modules.account.security import decode_access_token

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> User:
    try:
        user_id = decode_access_token(credentials.credentials)
    except jwt.InvalidTokenError as exc:
        raise AuthenticationError("Invalid access token") from exc
    user = PsycopgUserRepository(connection).get_by_id(user_id)
    if user is None:
        raise AuthenticationError("Invalid access token")
    return user
