from __future__ import annotations

from uuid import UUID

import psycopg
import json

from app.core.config import settings
from app.modules.travel_assistance.mail import repository
from app.modules.travel_assistance.mail.classifier import classify_travel_message
from app.modules.travel_assistance.mail.gmail_api import (
    build_gmail_service,
    collect_attachments,
    credentials_from_refresh_token,
    ensure_fresh_credentials,
    get_message_metadata,
    header_map,
    list_message_ids,
    parse_email_address,
    clean_header_value,
)
from app.modules.travel_assistance.mail.schemas import AttachmentInfo
from app.modules.travel_assistance.mail.token_crypto import decrypt_refresh_token


def _parse_internal_date_ms(msg: dict) -> object | None:
    raw = msg.get("internalDate")
    if not raw:
        return None
    try:
        from datetime import datetime, timezone

        ms = int(raw)
        return datetime.fromtimestamp(ms / 1000.0, tz=timezone.utc)
    except (TypeError, ValueError):
        return None


def run_gmail_sync(conn: psycopg.Connection, *, user_id: UUID) -> tuple[int, int, int]:
    row = repository.get_gmail_connection(conn, user_id)
    if not row:
        raise RuntimeError("Gmail is not connected for this user")

    refresh_plain = decrypt_refresh_token(row["refresh_token_ciphertext"])
    creds = credentials_from_refresh_token(
        refresh_plain,
        settings.google_oauth_client_id,
        settings.google_oauth_client_secret,
    )
    creds = ensure_fresh_credentials(creds)
    service = build_gmail_service(creds)

    scanned = 0
    imported = 0
    updated = 0
    page_token: str | None = None
    query = "newer_than:30d"

    while True:
        batch = list_message_ids(
            service,
            query=query,
            max_results=settings.gmail_sync_max_results_per_page,
            page_token=page_token,
        )
        messages = batch.get("messages") or []
        page_token = batch.get("nextPageToken")

        for ref in messages:
            mid = ref["id"]
            scanned += 1
            try:
                msg = get_message_metadata(service, mid)
            except Exception:
                continue

            payload = msg.get("payload") or {}
            headers = header_map(payload)
            from_raw = headers.get("from", "")
            from_name, from_email = parse_email_address(from_raw)
            from_addr = from_email or from_raw
            subject = clean_header_value(headers.get("subject", ""))
            snippet = clean_header_value(msg.get("snippet", ""))
            received_at = _parse_internal_date_ms(msg)
            thread_id = msg.get("threadId")

            raw_atts = collect_attachments(payload)
            attachments = [
                AttachmentInfo(
                    attachment_id=a["attachment_id"],
                    filename=a.get("filename"),
                    mime_type=a.get("mime_type"),
                    size=int(a["size"]) if a.get("size") is not None else None,
                )
                for a in raw_atts
            ]

            classification = classify_travel_message(
                from_addr=from_addr,
                subject=subject,
                snippet=snippet,
                attachments=attachments,
            )
            if not classification.is_travel_related:
                continue

            existed = repository.travel_document_exists(conn, user_id=user_id, gmail_message_id=mid)
            repository.upsert_travel_document(
                conn,
                user_id=user_id,
                gmail_message_id=mid,
                gmail_thread_id=thread_id,
                subject=subject,
                snippet=snippet,
                from_addr=from_addr,
                received_at=received_at,
                category=classification.category,
                confidence=classification.confidence,
                is_travel_related=True,
                attachment_summary=attachments,
            )
            if existed:
                updated += 1
            else:
                imported += 1

        if not page_token:
            break

    repository.touch_last_sync(conn, user_id)
    return scanned, imported, updated
