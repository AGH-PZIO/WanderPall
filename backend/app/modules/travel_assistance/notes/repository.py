from uuid import UUID
import psycopg
from . import schemas

def get_notes(conn: psycopg.Connection, user_id: UUID) -> list[tuple]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, user_id, title, content, created_at, modified_at
            FROM travel_assistance.notes
            WHERE user_id = %s
            """,
            (str(user_id),),
        )
        return cur.fetchall()

def get_note(conn: psycopg.Connection, note_id: UUID) -> schemas.NotesResponse | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, user_id, title, content, created_at, modified_at
            FROM travel_assistance.notes
            WHERE id = %s
            """,
            (str(note_id),),
        )
        return cur.fetchone()

def create_note(conn: psycopg.Connection, user_id: UUID, title: str, content: str) -> UUID:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO travel_assistance.notes (user_id, title, content, created_at)
            VALUES (%s, %s, %s, now())
            RETURNING id;
            """,
            (str(user_id), title, content),
        )
        row = cur.fetchone()        
        if row is None:
            return None
        return row['id']

def delete_note(conn: psycopg.Connection, note_id: UUID, user_id: UUID) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            DELETE FROM travel_assistance.notes
            WHERE id = %s AND user_id = %s
            """,
            (str(note_id), str(user_id),),
        )
        return cur.rowcount

def update_note(conn: psycopg.Connection, note_id: UUID, title: str, content: str, user_id: UUID) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE travel_assistance.notes
            SET 
                title = %s,
                content = %s,
                modified_at = now()
            WHERE id = %s AND user_id = %s
            """,
            (title, content, str(note_id), str(user_id),),
        )