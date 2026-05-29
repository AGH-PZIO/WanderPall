from __future__ import annotations

from typing import Any
from uuid import UUID

from psycopg import Connection


def list_explorer_journals(
    connection: Connection,
    *,
    current_user_id: UUID,
    limit: int,
    offset: int,
) -> tuple[list[dict[str, Any]], int]:
    # Note: friends_only journals are not listed yet (friends system not implemented).
    rows = list(
        connection.execute(
            """
            SELECT j.id, j.user_id, j.title, j.visibility, j.created_at, j.updated_at,
                   u.first_name, u.last_name,
                   COALESCE(r.reaction_count, 0) AS reaction_count,
                   COALESCE(c.comment_count, 0) AS comment_count,
                   ur.emoji AS my_reaction
            FROM journal.journals j
            JOIN account.users u ON u.id = j.user_id
            LEFT JOIN (
              SELECT journal_id, count(*) AS reaction_count
              FROM journal.journal_reactions
              GROUP BY journal_id
            ) r ON r.journal_id = j.id
            LEFT JOIN (
              SELECT journal_id, count(*) AS comment_count
              FROM journal.journal_comments
              WHERE deleted_at IS NULL
              GROUP BY journal_id
            ) c ON c.journal_id = j.id
            LEFT JOIN journal.journal_reactions ur
              ON ur.journal_id = j.id AND ur.user_id = %s
            WHERE j.user_id <> %s
              AND j.visibility = 'public'
            ORDER BY j.updated_at DESC
            LIMIT %s OFFSET %s
            """,
            (current_user_id, current_user_id, limit, offset),
        ).fetchall()
    )
    total_row = connection.execute(
        """
        SELECT count(*) AS total
        FROM journal.journals j
        WHERE j.user_id <> %s
          AND j.visibility = 'public'
        """,
        (current_user_id,),
    ).fetchone()
    total = int(total_row["total"]) if total_row else 0
    return rows, total


def list_my_public_journals(
    connection: Connection,
    *,
    current_user_id: UUID,
    limit: int,
    offset: int,
) -> tuple[list[dict[str, Any]], int]:
    """List the current user's own public journals with reaction/comment counts."""
    rows = list(
        connection.execute(
            """
            SELECT j.id, j.user_id, j.title, j.visibility, j.created_at, j.updated_at,
                   u.first_name, u.last_name,
                   COALESCE(r.reaction_count, 0) AS reaction_count,
                   COALESCE(c.comment_count, 0) AS comment_count,
                   ur.emoji AS my_reaction
            FROM journal.journals j
            JOIN account.users u ON u.id = j.user_id
            LEFT JOIN (
              SELECT journal_id, count(*) AS reaction_count
              FROM journal.journal_reactions
              GROUP BY journal_id
            ) r ON r.journal_id = j.id
            LEFT JOIN (
              SELECT journal_id, count(*) AS comment_count
              FROM journal.journal_comments
              WHERE deleted_at IS NULL
              GROUP BY journal_id
            ) c ON c.journal_id = j.id
            LEFT JOIN journal.journal_reactions ur
              ON ur.journal_id = j.id AND ur.user_id = %s
            WHERE j.user_id = %s
              AND j.visibility = 'public'
            ORDER BY j.updated_at DESC
            LIMIT %s OFFSET %s
            """,
            (current_user_id, current_user_id, limit, offset),
        ).fetchall()
    )
    total_row = connection.execute(
        """
        SELECT count(*) AS total
        FROM journal.journals j
        WHERE j.user_id = %s
          AND j.visibility = 'public'
        """,
        (current_user_id,),
    ).fetchone()
    total = int(total_row["total"]) if total_row else 0
    return rows, total


def get_explorer_journal(
    connection: Connection,
    *,
    current_user_id: UUID,
    journal_id: UUID,
) -> dict[str, Any] | None:
    row = connection.execute(
        """
        SELECT j.id, j.user_id, j.title, j.visibility, j.created_at, j.updated_at,
               u.first_name, u.last_name,
               COALESCE(r.reaction_count, 0) AS reaction_count,
               COALESCE(c.comment_count, 0) AS comment_count,
               ur.emoji AS my_reaction
        FROM journal.journals j
        JOIN account.users u ON u.id = j.user_id
        LEFT JOIN (
          SELECT journal_id, count(*) AS reaction_count
          FROM journal.journal_reactions
          GROUP BY journal_id
        ) r ON r.journal_id = j.id
        LEFT JOIN (
          SELECT journal_id, count(*) AS comment_count
          FROM journal.journal_comments
          WHERE deleted_at IS NULL
          GROUP BY journal_id
        ) c ON c.journal_id = j.id
        LEFT JOIN journal.journal_reactions ur
          ON ur.journal_id = j.id AND ur.user_id = %s
        WHERE j.id = %s
          AND j.user_id <> %s
          AND j.visibility = 'public'
        """,
        (current_user_id, journal_id, current_user_id),
    ).fetchone()
    return row


def get_explorer_journal_including_own(
    connection: Connection,
    *,
    current_user_id: UUID,
    journal_id: UUID,
) -> dict[str, Any] | None:
    """Get journal for explorer, including user's own public journals."""
    row = connection.execute(
        """
        SELECT j.id, j.user_id, j.title, j.visibility, j.created_at, j.updated_at,
               u.first_name, u.last_name,
               COALESCE(r.reaction_count, 0) AS reaction_count,
               COALESCE(c.comment_count, 0) AS comment_count,
               ur.emoji AS my_reaction
        FROM journal.journals j
        JOIN account.users u ON u.id = j.user_id
        LEFT JOIN (
          SELECT journal_id, count(*) AS reaction_count
          FROM journal.journal_reactions
          GROUP BY journal_id
        ) r ON r.journal_id = j.id
        LEFT JOIN (
          SELECT journal_id, count(*) AS comment_count
          FROM journal.journal_comments
          WHERE deleted_at IS NULL
          GROUP BY journal_id
        ) c ON c.journal_id = j.id
        LEFT JOIN journal.journal_reactions ur
          ON ur.journal_id = j.id AND ur.user_id = %s
        WHERE j.id = %s
          AND j.visibility = 'public'
        """,
        (current_user_id, journal_id),
    ).fetchone()
    return row


def get_reaction_breakdown(connection: Connection, *, journal_id: UUID) -> dict[str, int]:
    """Get count of each reaction type for a journal."""
    rows = connection.execute(
        """
        SELECT emoji, count(*) as count
        FROM journal.journal_reactions
        WHERE journal_id = %s
        GROUP BY emoji
        """,
        (journal_id,),
    ).fetchall()
    return {row["emoji"]: int(row["count"]) for row in rows}


def list_entries_for_journal(connection: Connection, *, journal_id: UUID) -> list[dict[str, Any]]:
    return list(
        connection.execute(
            """
            SELECT id, journal_id, lat, lng, text, created_at, updated_at
            FROM journal.entries
            WHERE journal_id = %s
            ORDER BY created_at ASC
            """,
            (journal_id,),
        ).fetchall()
    )


def get_first_entry_for_journal(connection: Connection, *, journal_id: UUID) -> dict[str, Any] | None:
    return connection.execute(
        """
        SELECT id, journal_id, lat, lng, text, created_at, updated_at
        FROM journal.entries
        WHERE journal_id = %s
        ORDER BY created_at ASC
        LIMIT 1
        """,
        (journal_id,),
    ).fetchone()


def list_images_for_entry(connection: Connection, *, entry_id: UUID) -> list[dict[str, Any]]:
    return list(
        connection.execute(
            """
            SELECT id, entry_id, storage_key, mime_type, byte_size, created_at
            FROM journal.entry_images
            WHERE entry_id = %s
            ORDER BY created_at ASC
            """,
            (entry_id,),
        ).fetchall()
    )


def upsert_reaction(
    connection: Connection,
    *,
    journal_id: UUID,
    user_id: UUID,
    emoji: str,
) -> None:
    connection.execute(
        """
        INSERT INTO journal.journal_reactions (journal_id, user_id, emoji, updated_at)
        VALUES (%s, %s, %s, now())
        ON CONFLICT (journal_id, user_id) DO UPDATE
        SET emoji = EXCLUDED.emoji,
            updated_at = now()
        """,
        (journal_id, user_id, emoji),
    )


def delete_reaction(connection: Connection, *, journal_id: UUID, user_id: UUID) -> int:
    cur = connection.execute(
        "DELETE FROM journal.journal_reactions WHERE journal_id = %s AND user_id = %s",
        (journal_id, user_id),
    )
    return cur.rowcount or 0


def create_comment(
    connection: Connection,
    *,
    journal_id: UUID,
    user_id: UUID,
    body: str,
    parent_comment_id: UUID | None,
) -> dict[str, Any]:
    row = connection.execute(
        """
        INSERT INTO journal.journal_comments (journal_id, user_id, body, parent_comment_id)
        VALUES (%s, %s, %s, %s)
        RETURNING id, journal_id, user_id, parent_comment_id, body, created_at, updated_at, deleted_at
        """,
        (journal_id, user_id, body, parent_comment_id),
    ).fetchone()
    assert row is not None
    return row


def list_comments(
    connection: Connection,
    *,
    journal_id: UUID,
    limit: int,
    offset: int,
) -> tuple[list[dict[str, Any]], int]:
    rows = list(
        connection.execute(
            """
            SELECT c.id, c.journal_id, c.user_id, c.parent_comment_id, c.body,
                   c.created_at, c.updated_at, c.deleted_at,
                   u.first_name, u.last_name
            FROM journal.journal_comments c
            JOIN account.users u ON u.id = c.user_id
            WHERE c.journal_id = %s
            ORDER BY c.created_at ASC
            LIMIT %s OFFSET %s
            """,
            (journal_id, limit, offset),
        ).fetchall()
    )
    total_row = connection.execute(
        "SELECT count(*) AS total FROM journal.journal_comments WHERE journal_id = %s",
        (journal_id,),
    ).fetchone()
    total = int(total_row["total"]) if total_row else 0
    return rows, total


def soft_delete_comment(
    connection: Connection,
    *,
    journal_id: UUID,
    comment_id: UUID,
    user_id: UUID,
) -> int:
    cur = connection.execute(
        """
        UPDATE journal.journal_comments
        SET body = '',
            deleted_at = now(),
            updated_at = now()
        WHERE id = %s AND journal_id = %s AND user_id = %s AND deleted_at IS NULL
        """,
        (comment_id, journal_id, user_id),
    )
    return cur.rowcount or 0


def comment_exists(connection: Connection, *, journal_id: UUID, comment_id: UUID) -> bool:
    row = connection.execute(
        "SELECT 1 FROM journal.journal_comments WHERE id = %s AND journal_id = %s",
        (comment_id, journal_id),
    ).fetchone()
    return row is not None
