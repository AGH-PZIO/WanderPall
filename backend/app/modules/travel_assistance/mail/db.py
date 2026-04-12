from collections.abc import Generator

import psycopg
from psycopg.rows import dict_row

from app.core.config import settings


def get_connection() -> Generator[psycopg.Connection, None, None]:
    with psycopg.connect(settings.postgres_dsn, row_factory=dict_row, autocommit=False) as conn:
        try:
            yield conn
        except Exception:
            conn.rollback()
            raise
        else:
            conn.commit()
