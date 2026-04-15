import json
from datetime import datetime
from typing import Any
from uuid import UUID

import psycopg

from app.modules.travel_assistance.mail.schemas import AttachmentInfo


def get_gmail_connection(conn: psycopg.Connection, user_id: UUID) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, user_id, google_email, refresh_token_ciphertext, scopes,
                   created_at, updated_at, last_sync_at
            FROM travel_assistance.gmail_connection
            WHERE user_id = %s
            """,
            (str(user_id),),
        )
        return cur.fetchone()


def upsert_gmail_connection(
    conn: psycopg.Connection,
    *,
    user_id: UUID,
    google_email: str,
    refresh_token_ciphertext: bytes,
    scopes: str,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO travel_assistance.gmail_connection
                (user_id, google_email, refresh_token_ciphertext, scopes, updated_at)
            VALUES (%s, %s, %s, %s, now())
            ON CONFLICT (user_id) DO UPDATE SET
                google_email = EXCLUDED.google_email,
                refresh_token_ciphertext = EXCLUDED.refresh_token_ciphertext,
                scopes = EXCLUDED.scopes,
                updated_at = now()
            """,
            (str(user_id), google_email, refresh_token_ciphertext, scopes),
        )


def delete_gmail_connection(conn: psycopg.Connection, user_id: UUID) -> int:
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM travel_assistance.gmail_connection WHERE user_id = %s",
            (str(user_id),),
        )
        return cur.rowcount


def touch_last_sync(conn: psycopg.Connection, user_id: UUID) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE travel_assistance.gmail_connection
            SET last_sync_at = now(), updated_at = now()
            WHERE user_id = %s
            """,
            (str(user_id),),
        )


def travel_document_exists(
    conn: psycopg.Connection, *, user_id: UUID, gmail_message_id: str
) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT 1 FROM travel_assistance.travel_mail_document
            WHERE user_id = %s AND gmail_message_id = %s
            """,
            (str(user_id), gmail_message_id),
        )
        return cur.fetchone() is not None


def upsert_travel_document(
    conn: psycopg.Connection,
    *,
    user_id: UUID,
    gmail_message_id: str,
    gmail_thread_id: str | None,
    subject: str | None,
    snippet: str | None,
    from_addr: str | None,
    received_at: datetime | None,
    category: str,
    confidence: str,
    is_travel_related: bool,
    attachment_summary: list[AttachmentInfo],
) -> None:
    att_json = json.dumps([a.model_dump() for a in attachment_summary])
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO travel_assistance.travel_mail_document (
                user_id, gmail_message_id, gmail_thread_id, subject, snippet, from_addr,
                received_at, category, confidence, is_travel_related, synced_at, attachment_summary
            )
            VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now(), %s::jsonb
            )
            ON CONFLICT (user_id, gmail_message_id) DO UPDATE SET
                gmail_thread_id = EXCLUDED.gmail_thread_id,
                subject = EXCLUDED.subject,
                snippet = EXCLUDED.snippet,
                from_addr = EXCLUDED.from_addr,
                received_at = EXCLUDED.received_at,
                category = EXCLUDED.category,
                confidence = EXCLUDED.confidence,
                is_travel_related = EXCLUDED.is_travel_related,
                synced_at = now(),
                attachment_summary = EXCLUDED.attachment_summary
            """,
            (
                str(user_id),
                gmail_message_id,
                gmail_thread_id,
                subject,
                snippet,
                from_addr,
                received_at,
                category,
                confidence,
                is_travel_related,
                att_json,
            ),
        )


def list_travel_documents(
    conn: psycopg.Connection,
    *,
    user_id: UUID,
    limit: int,
    offset: int,
) -> tuple[list[dict[str, Any]], int]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT COUNT(*) AS c
            FROM travel_assistance.travel_mail_document
            WHERE user_id = %s
              AND user_removed_at IS NULL
              AND is_travel_related
            """,
            (str(user_id),),
        )
        total = int(cur.fetchone()["c"])

        cur.execute(
            """
            SELECT id, gmail_message_id, gmail_thread_id, subject, snippet, from_addr,
                   received_at, category, confidence, is_travel_related, synced_at, attachment_summary
            FROM travel_assistance.travel_mail_document
            WHERE user_id = %s
              AND user_removed_at IS NULL
              AND is_travel_related
            ORDER BY received_at DESC NULLS LAST, synced_at DESC
            LIMIT %s OFFSET %s
            """,
            (str(user_id), limit, offset),
        )
        rows = cur.fetchall()
    return rows, total


def get_travel_document(
    conn: psycopg.Connection, *, user_id: UUID, document_id: UUID
) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, user_id, gmail_message_id, gmail_thread_id, subject, snippet, from_addr,
                   received_at, category, confidence, is_travel_related, synced_at, attachment_summary,
                   user_removed_at
            FROM travel_assistance.travel_mail_document
            WHERE id = %s AND user_id = %s
            """,
            (str(document_id), str(user_id)),
        )
        return cur.fetchone()


def soft_remove_document(conn: psycopg.Connection, *, user_id: UUID, document_id: UUID) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE travel_assistance.travel_mail_document
            SET user_removed_at = now()
            WHERE id = %s AND user_id = %s AND user_removed_at IS NULL
            """,
            (str(document_id), str(user_id)),
        )
        return cur.rowcount


def row_to_response(row: dict[str, Any]) -> dict[str, Any]:
    raw_att = row.get("attachment_summary") or []
    if isinstance(raw_att, str):
        raw_att = json.loads(raw_att)
    attachments = [AttachmentInfo(**a) for a in raw_att] if raw_att else []
    return {
        "id": row["id"],
        "gmail_message_id": row["gmail_message_id"],
        "gmail_thread_id": row.get("gmail_thread_id"),
        "subject": row.get("subject"),
        "snippet": row.get("snippet"),
        "from_addr": row.get("from_addr"),
        "received_at": row.get("received_at"),
        "category": row["category"],
        "confidence": row["confidence"],
        "is_travel_related": row["is_travel_related"],
        "synced_at": row["synced_at"],
        "attachments": attachments,
    }
