from typing import Annotated
from uuid import UUID

import psycopg
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse, StreamingResponse

from app.core.config import settings
from app.modules.travel_assistance.mail import repository
from app.modules.travel_assistance.mail.dependencies import get_db_conn, get_dev_user_id
from app.modules.travel_assistance.mail.gmail_api import (
    build_gmail_service,
    get_attachment_body,
)
from app.modules.travel_assistance.google_api import (
    CALENDAR_READONLY_SCOPE,
    GMAIL_READONLY_SCOPE,
    build_authorization_url,
    credentials_from_refresh_token,
    ensure_fresh_credentials,
    exchange_code_for_credentials,
)
from app.modules.travel_assistance.mail.oauth_state import verify_oauth_state
from app.modules.travel_assistance.mail.schemas import (
    AuthorizeUrlResponse,
    GmailStatusResponse,
    SyncResponse,
    TravelDocumentListResponse,
    TravelDocumentResponse,
)
from app.modules.travel_assistance.mail.sync_service import run_gmail_sync
from app.modules.travel_assistance.mail.token_crypto import decrypt_refresh_token, encrypt_refresh_token
from app.modules.travel_assistance.calendar.schemas import CalendarEventsResponse
from app.modules.travel_assistance.calendar import service as calendar_service
from app.modules.travel_assistance.translator.schemas import (
    SupportedLanguagesResponse,
    SupportedLanguage,
    TranslateRequest,
    TranslateResponse,
)
from app.modules.travel_assistance.translator import service as translator_service

router = APIRouter(prefix="/travel-assistance", tags=["module-2-travel-assistance"])


def _require_oauth_config() -> None:
    if not settings.google_oauth_client_id or not settings.google_oauth_client_secret:
        raise HTTPException(
            status_code=503,
            detail="Google OAuth is not configured (GOOGLE_OAUTH_CLIENT_ID / SECRET).",
        )
    if not settings.gmail_token_encryption_key.strip():
        raise HTTPException(
            status_code=503,
            detail="GMAIL_TOKEN_ENCRYPTION_KEY is not set.",
        )


@router.get("/status")
def travel_assistance_status() -> dict[str, str]:
    return {"module": "travel_assistance", "status": "ok"}


@router.get("/gmail/oauth/authorize-url", response_model=AuthorizeUrlResponse)
def gmail_authorize_url(
    user_id: Annotated[UUID, Depends(get_dev_user_id)],
) -> AuthorizeUrlResponse:
    _require_oauth_config()
    try:
        url = build_authorization_url(user_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return AuthorizeUrlResponse(url=url)


@router.get("/gmail/oauth/callback", response_model=None)
def gmail_oauth_callback(
    conn: Annotated[psycopg.Connection, Depends(get_db_conn)],
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
) -> RedirectResponse | dict[str, str]:
    _require_oauth_config()
    if error:
        raise HTTPException(status_code=400, detail=f"OAuth error: {error}")
    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing code or state")

    try:
        user_id = verify_oauth_state(state)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state") from exc

    try:
        creds, google_email = exchange_code_for_credentials(code)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Token exchange failed: {exc}") from exc

    refresh = creds.refresh_token
    if not refresh:
        existing = repository.get_gmail_connection(conn, user_id)
        if existing:
            ciphertext = existing["refresh_token_ciphertext"]
        else:
            raise HTTPException(
                status_code=400,
                detail="Google did not return a refresh token; revoke app access in Google and reconnect with prompt=consent.",
            )
    else:
        try:
            ciphertext = encrypt_refresh_token(refresh)
        except RuntimeError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    email = google_email or "unknown@gmail.invalid"
    scopes_str = " ".join(creds.scopes) if creds.scopes else GMAIL_READONLY_SCOPE
    repository.upsert_gmail_connection(
        conn,
        user_id=user_id,
        google_email=email,
        refresh_token_ciphertext=ciphertext,
        scopes=scopes_str,
    )

    if settings.frontend_oauth_redirect_url.strip():
        return RedirectResponse(url=settings.frontend_oauth_redirect_url.strip(), status_code=302)
    return {"status": "connected", "google_email": email}


@router.get("/gmail/status", response_model=GmailStatusResponse)
def gmail_status(
    conn: Annotated[psycopg.Connection, Depends(get_db_conn)],
    user_id: Annotated[UUID, Depends(get_dev_user_id)],
) -> GmailStatusResponse:
    row = repository.get_gmail_connection(conn, user_id)
    if not row:
        return GmailStatusResponse(connected=False)
    return GmailStatusResponse(
        connected=True,
        google_email=row["google_email"],
        last_sync_at=row.get("last_sync_at"),
    )


@router.delete("/gmail/connection")
def gmail_disconnect(
    conn: Annotated[psycopg.Connection, Depends(get_db_conn)],
    user_id: Annotated[UUID, Depends(get_dev_user_id)],
) -> dict[str, str]:
    n = repository.delete_gmail_connection(conn, user_id)
    if n == 0:
        raise HTTPException(status_code=404, detail="No Gmail connection for this user")
    return {"status": "disconnected"}


@router.post("/gmail/sync", response_model=SyncResponse)
def gmail_sync(
    conn: Annotated[psycopg.Connection, Depends(get_db_conn)],
    user_id: Annotated[UUID, Depends(get_dev_user_id)],
) -> SyncResponse:
    _require_oauth_config()
    try:
        scanned, imported, updated = run_gmail_sync(conn, user_id=user_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gmail sync failed: {exc}") from exc
    return SyncResponse(scanned=scanned, imported=imported, updated=updated)


@router.get("/travel-documents", response_model=TravelDocumentListResponse)
def list_travel_documents(
    conn: Annotated[psycopg.Connection, Depends(get_db_conn)],
    user_id: Annotated[UUID, Depends(get_dev_user_id)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> TravelDocumentListResponse:
    rows, total = repository.list_travel_documents(conn, user_id=user_id, limit=limit, offset=offset)
    items = [TravelDocumentResponse(**repository.row_to_response(r)) for r in rows]
    return TravelDocumentListResponse(items=items, total=total)


@router.delete("/travel-documents/{document_id}")
def remove_travel_document(
    conn: Annotated[psycopg.Connection, Depends(get_db_conn)],
    user_id: Annotated[UUID, Depends(get_dev_user_id)],
    document_id: UUID,
) -> dict[str, str]:
    n = repository.soft_remove_document(conn, user_id=user_id, document_id=document_id)
    if n == 0:
        raise HTTPException(status_code=404, detail="Document not found or already removed")
    return {"status": "removed"}


@router.get("/travel-documents/{document_id}/attachments/{attachment_id}", response_model=None)
def download_attachment(
    conn: Annotated[psycopg.Connection, Depends(get_db_conn)],
    user_id: Annotated[UUID, Depends(get_dev_user_id)],
    document_id: UUID,
    attachment_id: str,
):
    _require_oauth_config()
    row = repository.get_travel_document(conn, user_id=user_id, document_id=document_id)
    if not row or row.get("user_removed_at"):
        raise HTTPException(status_code=404, detail="Document not found")

    parsed = repository.row_to_response(row)
    atts = parsed["attachments"] or []
    allowed = {a.attachment_id for a in atts}
    if attachment_id not in allowed:
        raise HTTPException(status_code=404, detail="Attachment not part of this document")

    gmail_row = repository.get_gmail_connection(conn, user_id)
    if not gmail_row:
        raise HTTPException(status_code=400, detail="Gmail not connected")

    scopes_str = (gmail_row.get("scopes") or "").strip()
    scopes = [s for s in scopes_str.split() if s] or [GMAIL_READONLY_SCOPE]

    refresh_plain = decrypt_refresh_token(gmail_row["refresh_token_ciphertext"])
    creds = credentials_from_refresh_token(
        refresh_plain,
        settings.google_oauth_client_id,
        settings.google_oauth_client_secret,
        scopes=scopes,
    )
    creds = ensure_fresh_credentials(creds)
    service = build_gmail_service(creds)

    try:
        data = get_attachment_body(service, row["gmail_message_id"], attachment_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to fetch attachment: {exc}") from exc

    mime = next((a.mime_type for a in atts if a.attachment_id == attachment_id), "application/octet-stream")
    return StreamingResponse(iter([data]), media_type=mime or "application/octet-stream")


# Translator endpoints
@router.get("/translator/supported-languages", response_model=SupportedLanguagesResponse)
def get_supported_languages() -> SupportedLanguagesResponse:
    """Get list of supported languages for translation."""
    languages_dict = translator_service.get_supported_languages()
    languages = [SupportedLanguage(code=code, name=name) for code, name in languages_dict.items()]
    return SupportedLanguagesResponse(languages=languages)


@router.post("/translator/translate", response_model=TranslateResponse)
async def translate(
    request: TranslateRequest,
) -> TranslateResponse:
    """Translate text from source language to target language."""
    try:
        translated_text = await translator_service.translate_text(
            request.text,
            request.source_language,
            request.target_language,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Translation failed: {exc}") from exc

    return TranslateResponse(
        original_text=request.text,
        translated_text=translated_text,
        source_language=request.source_language,
        target_language=request.target_language,
    )


@router.get("/calendar/events", response_model=CalendarEventsResponse)
def list_calendar_events(
    conn: Annotated[psycopg.Connection, Depends(get_db_conn)],
    user_id: Annotated[UUID, Depends(get_dev_user_id)],
    calendar_id: str = "primary",
    max_results: Annotated[int, Query(ge=1, le=250)] = 50,
    time_min: str | None = None,
    time_max: str | None = None,
) -> CalendarEventsResponse:
    """
    List upcoming events from Google Calendar.
    Uses the same stored Google refresh token as the Gmail integration.
    """
    _require_oauth_config()

    gmail_row = repository.get_gmail_connection(conn, user_id)
    if not gmail_row:
        raise HTTPException(status_code=400, detail="Google is not connected (connect via Gmail OAuth first).")

    scopes_str = (gmail_row.get("scopes") or "").strip()
    scopes = [s for s in scopes_str.split() if s]
    if CALENDAR_READONLY_SCOPE not in scopes:
        raise HTTPException(
            status_code=400,
            detail="Google Calendar scope not granted. Disconnect Gmail and connect again to approve Calendar access.",
        )

    refresh_plain = decrypt_refresh_token(gmail_row["refresh_token_ciphertext"])
    creds = credentials_from_refresh_token(
        refresh_plain,
        settings.google_oauth_client_id,
        settings.google_oauth_client_secret,
        scopes=scopes,
    )
    creds = ensure_fresh_credentials(creds)
    service = calendar_service.build_calendar_service(creds)

    from datetime import datetime, timedelta, timezone

    now = datetime.now(timezone.utc)
    parsed_time_min = now if not time_min else datetime.fromisoformat(time_min.replace("Z", "+00:00"))
    parsed_time_max = (
        None if not time_max else datetime.fromisoformat(time_max.replace("Z", "+00:00"))
    )
    if parsed_time_max is None:
        parsed_time_max = parsed_time_min + timedelta(days=30)

    try:
        items = calendar_service.list_events(
            service,
            calendar_id=calendar_id,
            time_min=parsed_time_min,
            time_max=parsed_time_max,
            max_results=max_results,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Calendar fetch failed: {exc}") from exc

    return CalendarEventsResponse(
        calendar_id=calendar_id,
        time_min=parsed_time_min,
        time_max=parsed_time_max,
        items=items,
    )
