from typing import Annotated

import psycopg
from fastapi import Depends

from app.modules.travel_assistance.mail.db import get_connection


def get_db_conn(conn: Annotated[psycopg.Connection, Depends(get_connection)]) -> psycopg.Connection:
    return conn
