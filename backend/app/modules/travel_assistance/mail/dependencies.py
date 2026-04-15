from typing import Annotated
from uuid import UUID

import psycopg
from fastapi import Depends, Header, HTTPException

from app.modules.travel_assistance.mail.db import get_connection


def get_db_conn(conn: Annotated[psycopg.Connection, Depends(get_connection)]) -> psycopg.Connection:
    return conn


def get_dev_user_id(
    x_dev_user_id: Annotated[str | None, Header(alias="X-Dev-User-Id")] = None,
    x_user_id: Annotated[str | None, Header(alias="X-User-Id")] = None,
) -> UUID:
    raw = x_dev_user_id or x_user_id
    if not raw:
        raise HTTPException(
            status_code=401,
            detail="Missing X-Dev-User-Id or X-User-Id header (until module 1 auth is wired).",
        )
    try:
        return UUID(raw.strip())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid user id UUID") from exc
