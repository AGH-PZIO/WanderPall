from typing import Annotated, List
from uuid import UUID
import os
import shutil

import psycopg
from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile
from fastapi.responses import RedirectResponse, StreamingResponse

from app.core.config import settings
from app.modules.travel_assistance.mail import repository
from app.modules.travel_assistance.mail.dependencies import get_db_conn, get_dev_user_id
from app.modules.travel_assistance.mail.gmail_api import (
    build_gmail_service,
    credentials_from_refresh_token,
    ensure_fresh_credentials,
    get_attachment_body,
)
from app.modules.travel_assistance.mail.gmail_oauth import GMAIL_READONLY_SCOPE, build_authorization_url, exchange_code_for_credentials
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

from app.modules.account.dependencies import get_current_user
from app.modules.travel_assistance.guides.services import GuideService
from app.modules.travel_assistance.guides.schemas import GuideCreate, GuideResponse

from app.modules.travel_assistance.notes.services import NotesService
from app.modules.travel_assistance.notes.schemas import NotesCreate, NotesResponse

from app.modules.travel_assistance.calculator.services import CalculationService
from app.modules.travel_assistance.calculator.schemas import CalculationCreate, CalculationWithExpenses

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

    refresh_plain = decrypt_refresh_token(gmail_row["refresh_token_ciphertext"])
    creds = credentials_from_refresh_token(
        refresh_plain,
        settings.google_oauth_client_id,
        settings.google_oauth_client_secret,
    )
    creds = ensure_fresh_credentials(creds)
    service = build_gmail_service(creds)

    try:
        data = get_attachment_body(service, row["gmail_message_id"], attachment_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to fetch attachment: {exc}") from exc

    mime = next((a.mime_type for a in atts if a.attachment_id == attachment_id), "application/octet-stream")
    return StreamingResponse(iter([data]), media_type=mime or "application/octet-stream")

# === TRAVEL GUIDES ===

def get_guide_service(conn=Depends(get_db_conn)):
    return GuideService(conn)

@router.get("/guides", response_model=List[GuideResponse])
def get_user_guides(
    service: GuideService = Depends(get_guide_service),
    user=Depends(get_current_user),
):
    return service.get_user_guides(user.id)

@router.get("/guides/public", response_model=List[GuideResponse])
def get_published_guides(
    service: GuideService = Depends(get_guide_service),
):
    return service.get_published_guides()

@router.get("/guides/{guide_id}", response_model=GuideResponse)
def get_guide(
    guide_id: UUID,
    service: GuideService = Depends(get_guide_service),
    user=Depends(get_current_user),
):
    try:
        guide = service.get_guide(guide_id, user.id)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    if not guide:
        raise HTTPException(status_code=404, detail="Guide not found")
    return guide

@router.post("/guides", response_model=UUID)
def create_guide(
    data: GuideCreate,
    service: GuideService = Depends(get_guide_service),
    user=Depends(get_current_user),
):
    try:
        return service.create_guide(user.id, data.title, data.content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/guides/{guide_id}")
def update_guide(
    guide_id: UUID,
    data: GuideCreate,
    service: GuideService = Depends(get_guide_service),
    user=Depends(get_current_user),
):
    try:
        return service.update_guide(user.id, guide_id, data.title, data.content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError:
        raise HTTPException(status_code=403, detail="Forbidden")
    
@router.post("/guides/{guide_id}/publish")
def publish_guide(
    guide_id: UUID,
    service: GuideService = Depends(get_guide_service),
    user=Depends(get_current_user),
):
    try:
        service.publish_guide(user.id, guide_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Guide not found")
    except PermissionError:
        raise HTTPException(status_code=403, detail="Forbidden")

@router.post("/guides/{guide_id}/unpublish")
def unpublish_guide(
    guide_id: UUID,
    service: GuideService = Depends(get_guide_service),
    user=Depends(get_current_user),
):
    try:
        service.unpublish_guide(user.id, guide_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Guide not found")
    except PermissionError:
        raise HTTPException(status_code=403, detail="Forbidden")

@router.delete("/guides/{guide_id}")
def delete_guide(
    guide_id: UUID,
    service: GuideService = Depends(get_guide_service),
    user=Depends(get_current_user),
):
    try:
        service.delete_guide(user.id, guide_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Guide not found")
    except PermissionError:
        raise HTTPException(status_code=403, detail="Forbidden")


UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/guides/upload")
async def upload_file(file: UploadFile = File(...)):
    file_location = f"{UPLOAD_DIR}/{file.filename}"
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {"url": f"/{file_location}"}

# === NOTES ===

def get_notes_service(conn=Depends(get_db_conn)):
    return NotesService(conn)

@router.get("/notes", response_model=List[NotesResponse])
def get_user_notes(
    service: NotesService = Depends(get_notes_service),
    user: UUID = Depends(get_current_user),
):
    return service.get_user_notes(user.id)

@router.get("/notes/{note_id}", response_model=NotesResponse)
def get_notes(
    note_id: UUID,
    service: NotesService = Depends(get_notes_service),
    user: UUID = Depends(get_current_user),
):
    try:
        return service.get_note(user.id, note_id)
    except PermissionError:
        raise HTTPException(status_code=403, detail="Forbidden")

@router.post("/notes", response_model=UUID)
def create_note(
    data: NotesCreate,
    service: NotesService = Depends(get_notes_service),
    user: UUID = Depends(get_current_user),
):
    try:
        return service.create_note(user.id, data.title, data.content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/notes/{note_id}")
def update_note(
    note_id: UUID,
    data: NotesCreate,
    service: NotesService = Depends(get_notes_service),
    user: UUID = Depends(get_current_user),
):
    try:
        return service.update_note(user.id, note_id, data.title, data.content)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError:
        raise HTTPException(status_code=403, detail="Forbidden")
    
@router.delete("/notes/{note_id}")
def delete_note(
    note_id: UUID,
    service: NotesService = Depends(get_notes_service),
    user: UUID = Depends(get_current_user),
):
    try:
        service.delete_note(user.id, note_id)
        return {"status": "deleted"}
    except PermissionError:
        raise HTTPException(status_code=403, detail="Forbidden")
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

# === CALCULATIONS ===

def get_calculation_service(conn=Depends(get_db_conn)):
    return CalculationService(conn)

@router.get("/calculator", response_model=List[CalculationWithExpenses])
def get_calculations(
    service: CalculationService = Depends(get_calculation_service),
    user = Depends(get_current_user),
):
    return service.get_calculations(user.id)

@router.get("/calculator/{calculation_id}", response_model=CalculationWithExpenses)
def get_calculation(
    calculation_id: UUID,
    service: CalculationService = Depends(get_calculation_service),
    user = Depends(get_current_user),
):
    try:
        return service.get_calculation(calculation_id, user.id)
    except PermissionError:
        raise HTTPException(status_code=403, detail="Forbidden")
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/calculator", response_model=UUID)
def create_calculation(
    data: CalculationCreate,
    service: CalculationService = Depends(get_calculation_service),
    user = Depends(get_current_user),
):
    try:
        expenses_data = [e.model_dump() for e in data.expenses]
        return service.create_calculation(user.id, data.title, expenses_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/calculator/{calculation_id}")
def delete_calculation(
    calculation_id: UUID,
    service: CalculationService = Depends(get_calculation_service),
    user = Depends(get_current_user),
):
    try:
        service.delete_calculation(user.id, calculation_id)
        return {"status": "deleted"}
    except PermissionError:
        raise HTTPException(status_code=403, detail="Forbidden")
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))