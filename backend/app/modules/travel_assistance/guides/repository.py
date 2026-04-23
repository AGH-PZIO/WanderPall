from uuid import UUID
import psycopg
from  . import schemas
from typing import Any
from . import mapper
import json
from fastapi.encoders import jsonable_encoder

def get_guides(conn: psycopg.Connection, user_id: UUID) -> list[schemas.GuideResponse]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, user_id, title, content, created_at, updated_at, published
            FROM travel_assistance.guides
            WHERE user_id = %s
            """,
            (str(user_id),),
        )
        rows = cur.fetchall()
        return mapper.map_guides(rows)

def get_guide(conn: psycopg.Connection, guide_id: UUID) -> schemas.GuideResponse:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, user_id, title, content, created_at, updated_at, published
            FROM travel_assistance.guides
            WHERE id = %s
            """,
            (str(guide_id),),
        )
        row = cur.fetchone()
        return mapper.map_guide(row)

def get_published_guides(conn: psycopg.Connection) -> list[schemas.GuideResponse]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, user_id, title, content, created_at, updated_at, published
            FROM travel_assistance.guides
            WHERE published = TRUE
            """
        )
        rows = cur.fetchall()
        return mapper.map_guides(rows)

def create_guide(conn: psycopg.Connection, user_id: UUID, title: str, content: Any) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO travel_assistance.guides
                (user_id, title, content, created_at)
            VALUES (%s, %s, %s, now())
            RETURNING id
            """,
            (str(user_id), title, json.dumps(jsonable_encoder(content))),
        )
        row = cur.fetchone()        
        if row is None:
            return None
        return row['id']

def delete_guide(conn: psycopg.Connection, guide_id: UUID) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            DELETE FROM travel_assistance.guides
            WHERE id = %s
            """,
            (str(guide_id),),
        )
        return cur.rowcount

def publish_guide(conn: psycopg.Connection, guide_id: UUID, user_id: UUID) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE travel_assistance.guides
            SET published = TRUE, updated_at = now()
            WHERE id = %s AND user_id = %s
            """,
            (str(guide_id), str(user_id),),
        )

def unpublish_guide(conn: psycopg.Connection, guide_id: UUID, user_id: UUID) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE travel_assistance.guides
            SET published = FALSE, updated_at = now()
            WHERE id = %s AND user_id = %s
            """,
            (str(guide_id), str(user_id),),
        )

def update_guide(conn: psycopg.Connection, guide_id: UUID, title: str, content: Any, user_id: UUID) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE travel_assistance.guides
            SET title = %s, content = %s, updated_at = now()
            WHERE id = %s AND user_id = %s
            """,
            (title, json.dumps(jsonable_encoder(content)), str(guide_id), str(user_id)),
        )