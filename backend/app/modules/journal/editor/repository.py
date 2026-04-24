from __future__ import annotations

from typing import Any
from uuid import UUID

from psycopg import Connection


def create_journal(
    connection: Connection,
    *,
    user_id: UUID,
    title: str,
    visibility: str,
) -> dict[str, Any]:
    row = connection.execute(
        """
        INSERT INTO journal.journals (user_id, title, visibility)
        VALUES (%s, %s, %s)
        RETURNING id, user_id, title, visibility, created_at, updated_at
        """,
        (user_id, title, visibility),
    ).fetchone()
    assert row is not None
    return row


def list_journals(
    connection: Connection,
    *,
    user_id: UUID,
    limit: int,
    offset: int,
) -> tuple[list[dict[str, Any]], int]:
    rows = list(
        connection.execute(
            """
            SELECT id, user_id, title, visibility, created_at, updated_at
            FROM journal.journals
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
            """,
            (user_id, limit, offset),
        ).fetchall()
    )
    total_row = connection.execute(
        "SELECT count(*) AS total FROM journal.journals WHERE user_id = %s",
        (user_id,),
    ).fetchone()
    total = int(total_row["total"]) if total_row else 0
    return rows, total


def get_journal(
    connection: Connection,
    *,
    user_id: UUID,
    journal_id: UUID,
) -> dict[str, Any] | None:
    row = connection.execute(
        """
        SELECT id, user_id, title, visibility, created_at, updated_at
        FROM journal.journals
        WHERE id = %s AND user_id = %s
        """,
        (journal_id, user_id),
    ).fetchone()
    return row


def update_journal_title(
    connection: Connection,
    *,
    user_id: UUID,
    journal_id: UUID,
    title: str,
) -> dict[str, Any] | None:
    row = connection.execute(
        """
        UPDATE journal.journals
        SET title = %s, updated_at = now()
        WHERE id = %s AND user_id = %s
        RETURNING id, user_id, title, visibility, created_at, updated_at
        """,
        (title, journal_id, user_id),
    ).fetchone()
    return row


def update_journal_visibility(
    connection: Connection,
    *,
    user_id: UUID,
    journal_id: UUID,
    visibility: str,
) -> dict[str, Any] | None:
    row = connection.execute(
        """
        UPDATE journal.journals
        SET visibility = %s, updated_at = now()
        WHERE id = %s AND user_id = %s
        RETURNING id, user_id, title, visibility, created_at, updated_at
        """,
        (visibility, journal_id, user_id),
    ).fetchone()
    return row


def delete_journal(connection: Connection, *, user_id: UUID, journal_id: UUID) -> int:
    cur = connection.execute(
        "DELETE FROM journal.journals WHERE id = %s AND user_id = %s",
        (journal_id, user_id),
    )
    return cur.rowcount or 0


def create_entry(
    connection: Connection,
    *,
    journal_id: UUID,
    lat: float,
    lng: float,
    text: str,
) -> dict[str, Any]:
    row = connection.execute(
        """
        INSERT INTO journal.entries (journal_id, lat, lng, text)
        VALUES (%s, %s, %s, %s)
        RETURNING id, journal_id, lat, lng, text, created_at, updated_at
        """,
        (journal_id, lat, lng, text),
    ).fetchone()
    assert row is not None
    return row


def list_entries(
    connection: Connection,
    *,
    user_id: UUID,
    journal_id: UUID,
    limit: int,
    offset: int,
) -> tuple[list[dict[str, Any]], int]:
    rows = list(
        connection.execute(
            """
            SELECT e.id, e.journal_id, e.lat, e.lng, e.text, e.created_at, e.updated_at
            FROM journal.entries e
            JOIN journal.journals j ON j.id = e.journal_id
            WHERE e.journal_id = %s AND j.user_id = %s
            ORDER BY e.created_at DESC
            LIMIT %s OFFSET %s
            """,
            (journal_id, user_id, limit, offset),
        ).fetchall()
    )
    total_row = connection.execute(
        """
        SELECT count(*) AS total
        FROM journal.entries e
        JOIN journal.journals j ON j.id = e.journal_id
        WHERE e.journal_id = %s AND j.user_id = %s
        """,
        (journal_id, user_id),
    ).fetchone()
    total = int(total_row["total"]) if total_row else 0
    return rows, total


def get_entry(
    connection: Connection,
    *,
    user_id: UUID,
    journal_id: UUID,
    entry_id: UUID,
) -> dict[str, Any] | None:
    row = connection.execute(
        """
        SELECT e.id, e.journal_id, e.lat, e.lng, e.text, e.created_at, e.updated_at
        FROM journal.entries e
        JOIN journal.journals j ON j.id = e.journal_id
        WHERE e.id = %s AND e.journal_id = %s AND j.user_id = %s
        """,
        (entry_id, journal_id, user_id),
    ).fetchone()
    return row


def update_entry(
    connection: Connection,
    *,
    user_id: UUID,
    journal_id: UUID,
    entry_id: UUID,
    lat: float | None,
    lng: float | None,
    text: str | None,
) -> dict[str, Any] | None:
    row = connection.execute(
        """
        UPDATE journal.entries e
        SET lat = COALESCE(%s, e.lat),
            lng = COALESCE(%s, e.lng),
            text = COALESCE(%s, e.text),
            updated_at = now()
        FROM journal.journals j
        WHERE e.id = %s AND e.journal_id = %s AND j.id = e.journal_id AND j.user_id = %s
        RETURNING e.id, e.journal_id, e.lat, e.lng, e.text, e.created_at, e.updated_at
        """,
        (lat, lng, text, entry_id, journal_id, user_id),
    ).fetchone()
    return row


def delete_entry(
    connection: Connection,
    *,
    user_id: UUID,
    journal_id: UUID,
    entry_id: UUID,
) -> int:
    cur = connection.execute(
        """
        DELETE FROM journal.entries e
        USING journal.journals j
        WHERE e.id = %s AND e.journal_id = %s AND j.id = e.journal_id AND j.user_id = %s
        """,
        (entry_id, journal_id, user_id),
    )
    return cur.rowcount or 0


def create_entry_image(
    connection: Connection,
    *,
    image_id: UUID,
    entry_id: UUID,
    storage_key: str,
    mime_type: str,
    byte_size: int,
) -> dict[str, Any]:
    row = connection.execute(
        """
        INSERT INTO journal.entry_images (id, entry_id, storage_key, mime_type, byte_size)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id, entry_id, storage_key, mime_type, byte_size, created_at
        """,
        (image_id, entry_id, storage_key, mime_type, byte_size),
    ).fetchone()
    assert row is not None
    return row


def list_entry_images(connection: Connection, *, entry_id: UUID) -> list[dict[str, Any]]:
    return list(
        connection.execute(
            """
            SELECT id, entry_id, storage_key, mime_type, byte_size, created_at
            FROM journal.entry_images
            WHERE entry_id = %s
            ORDER BY created_at DESC
            """,
            (entry_id,),
        ).fetchall()
    )


def get_entry_image(
    connection: Connection,
    *,
    user_id: UUID,
    journal_id: UUID,
    entry_id: UUID,
    image_id: UUID,
) -> dict[str, Any] | None:
    row = connection.execute(
        """
        SELECT i.id, i.entry_id, i.storage_key, i.mime_type, i.byte_size, i.created_at
        FROM journal.entry_images i
        JOIN journal.entries e ON e.id = i.entry_id
        JOIN journal.journals j ON j.id = e.journal_id
        WHERE i.id = %s AND i.entry_id = %s AND e.id = %s AND e.journal_id = %s AND j.user_id = %s
        """,
        (image_id, entry_id, entry_id, journal_id, user_id),
    ).fetchone()
    return row


def delete_entry_image(
    connection: Connection,
    *,
    user_id: UUID,
    journal_id: UUID,
    entry_id: UUID,
    image_id: UUID,
) -> dict[str, Any] | None:
    row = connection.execute(
        """
        DELETE FROM journal.entry_images i
        USING journal.entries e, journal.journals j
        WHERE i.id = %s AND i.entry_id = %s
          AND e.id = i.entry_id AND e.id = %s AND e.journal_id = %s
          AND j.id = e.journal_id AND j.user_id = %s
        RETURNING i.id, i.entry_id, i.storage_key, i.mime_type, i.byte_size, i.created_at
        """,
        (image_id, entry_id, entry_id, journal_id, user_id),
    ).fetchone()
    return row


def list_image_keys_for_entry(
    connection: Connection,
    *,
    user_id: UUID,
    journal_id: UUID,
    entry_id: UUID,
) -> list[str]:
    rows = connection.execute(
        """
        SELECT i.storage_key
        FROM journal.entry_images i
        JOIN journal.entries e ON e.id = i.entry_id
        JOIN journal.journals j ON j.id = e.journal_id
        WHERE e.id = %s AND e.journal_id = %s AND j.user_id = %s
        """,
        (entry_id, journal_id, user_id),
    ).fetchall()
    return [r["storage_key"] for r in rows]


def list_image_keys_for_journal(
    connection: Connection,
    *,
    user_id: UUID,
    journal_id: UUID,
) -> list[str]:
    rows = connection.execute(
        """
        SELECT i.storage_key
        FROM journal.entry_images i
        JOIN journal.entries e ON e.id = i.entry_id
        JOIN journal.journals j ON j.id = e.journal_id
        WHERE j.id = %s AND j.user_id = %s
        """,
        (journal_id, user_id),
    ).fetchall()
    return [r["storage_key"] for r in rows]
