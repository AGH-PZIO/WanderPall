from __future__ import annotations

from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import Response
from psycopg import Connection

from app.core.config import settings
from app.core.database import get_connection
from app.modules.account.dependencies import get_current_user
from app.modules.account.models import User
from app.modules.journal.editor import repository
from app.modules.journal.editor.schemas import (
    EntryCreateRequest,
    EntryImageResponse,
    EntryListResponse,
    EntryResponse,
    EntryUpdateRequest,
    JournalCreateRequest,
    JournalListResponse,
    JournalResponse,
    JournalUpdateRequest,
    JournalVisibilityUpdateRequest,
)
from app.modules.journal.editor.service import JournalEditorService
from app.modules.journal.storage.local import LocalStorageBackend
from app.modules.journal.storage.paths import entry_image_key

router = APIRouter(prefix="/journals")


def _service(connection: Connection) -> JournalEditorService:
    storage = LocalStorageBackend(settings.journal_media_dir)
    return JournalEditorService(connection=connection, storage=storage)


def _journal_response(row: dict) -> JournalResponse:
    return JournalResponse(
        id=row["id"],
        title=row["title"],
        visibility=row["visibility"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _image_url(*, journal_id: UUID, entry_id: UUID, image_id: UUID, storage_key: str) -> str:
    # Extract extension from storage_key (e.g., "journals/.../image_id.jpg" -> ".jpg")
    ext = storage_key.split('.')[-1] if '.' in storage_key else ''
    # Return full backend URL from config
    if ext:
        return f"{settings.backend_url}/journals/{journal_id}/entries/{entry_id}/images/{image_id}.{ext}"
    return f"{settings.backend_url}/journals/{journal_id}/entries/{entry_id}/images/{image_id}"


def _entry_response(*, row: dict, images: list[dict]) -> EntryResponse:
    return EntryResponse(
        id=row["id"],
        journal_id=row["journal_id"],
        lat=row["lat"],
        lng=row["lng"],
        text=row["text"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        images=[
            {
                "id": img["id"],
                "mime_type": img["mime_type"],
                "byte_size": img["byte_size"],
                "url": _image_url(
                    journal_id=row["journal_id"],
                    entry_id=row["id"],
                    image_id=img["id"],
                    storage_key=img["storage_key"],
                ),
                "created_at": img["created_at"],
            }
            for img in images
        ],
    )


@router.post("", response_model=JournalResponse, status_code=201)
def create_journal(
    request: JournalCreateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> JournalResponse:
    row = _service(connection).create_journal(user_id=current_user.id, title=request.title)
    return _journal_response(row)


@router.get("", response_model=JournalListResponse)
def list_my_journals(
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> JournalListResponse:
    rows, total = repository.list_journals(connection, user_id=current_user.id, limit=limit, offset=offset)
    return JournalListResponse(items=[_journal_response(r) for r in rows], total=total)


@router.get("/{journal_id}", response_model=JournalResponse)
def get_journal(
    journal_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> JournalResponse:
    row = repository.get_journal(connection, user_id=current_user.id, journal_id=journal_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal not found")
    return _journal_response(row)


@router.patch("/{journal_id}", response_model=JournalResponse)
def update_journal(
    journal_id: UUID,
    request: JournalUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> JournalResponse:
    if request.title is None:
        row = repository.get_journal(connection, user_id=current_user.id, journal_id=journal_id)
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal not found")
        return _journal_response(row)
    row = _service(connection).update_journal_title(user_id=current_user.id, journal_id=journal_id, title=request.title)
    return _journal_response(row)


@router.patch("/{journal_id}/visibility", response_model=JournalResponse)
def update_visibility(
    journal_id: UUID,
    request: JournalVisibilityUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> JournalResponse:
    row = _service(connection).update_journal_visibility(
        user_id=current_user.id,
        journal_id=journal_id,
        visibility=request.visibility,
    )
    return _journal_response(row)


@router.delete("/{journal_id}", status_code=204)
def delete_journal(
    journal_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> Response:
    _service(connection).delete_journal(user_id=current_user.id, journal_id=journal_id)
    return Response(status_code=204)


@router.post("/{journal_id}/entries", response_model=EntryResponse, status_code=201)
def create_entry(
    journal_id: UUID,
    request: EntryCreateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> EntryResponse:
    row = _service(connection).create_entry(
        user_id=current_user.id,
        journal_id=journal_id,
        lat=request.lat,
        lng=request.lng,
        text=request.text,
    )
    images = repository.list_entry_images(connection, entry_id=row["id"])
    return _entry_response(row=row, images=images)


@router.get("/{journal_id}/entries", response_model=EntryListResponse)
def list_entries(
    journal_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
    limit: Annotated[int, Query(ge=1, le=200)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> EntryListResponse:
    rows, total = repository.list_entries(
        connection,
        user_id=current_user.id,
        journal_id=journal_id,
        limit=limit,
        offset=offset,
    )
    items: list[EntryResponse] = []
    for r in rows:
        images = repository.list_entry_images(connection, entry_id=r["id"])
        items.append(_entry_response(row=r, images=images))
    return EntryListResponse(items=items, total=total)


@router.patch("/{journal_id}/entries/{entry_id}", response_model=EntryResponse)
def update_entry(
    journal_id: UUID,
    entry_id: UUID,
    request: EntryUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> EntryResponse:
    row = _service(connection).update_entry(
        user_id=current_user.id,
        journal_id=journal_id,
        entry_id=entry_id,
        lat=request.lat,
        lng=request.lng,
        text=request.text,
    )
    images = repository.list_entry_images(connection, entry_id=row["id"])
    return _entry_response(row=row, images=images)


@router.delete("/{journal_id}/entries/{entry_id}", status_code=204)
def delete_entry(
    journal_id: UUID,
    entry_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> Response:
    _service(connection).delete_entry(user_id=current_user.id, journal_id=journal_id, entry_id=entry_id)
    return Response(status_code=204)


@router.post("/{journal_id}/entries/{entry_id}/images", response_model=list[EntryImageResponse], status_code=201)
async def upload_images(
    journal_id: UUID,
    entry_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
    files: Annotated[list[UploadFile], File()],
):
    svc = _service(connection)
    svc.require_entry_for_images(user_id=current_user.id, journal_id=journal_id, entry_id=entry_id)

    created = []
    for f in files:
        content_type = (f.content_type or "application/octet-stream").strip()
        data = await f.read()
        image_id = uuid4()
        key = entry_image_key(journal_id=journal_id, entry_id=entry_id, image_id=image_id, filename=f.filename)
        svc.storage.save_bytes(key=key, data=data)

        row = repository.create_entry_image(
            connection,
            image_id=image_id,
            entry_id=entry_id,
            storage_key=key,
            mime_type=content_type,
            byte_size=len(data),
        )
        created.append(
            EntryImageResponse(
                id=row["id"],
                mime_type=row["mime_type"],
                byte_size=row["byte_size"],
                url=_image_url(journal_id=journal_id, entry_id=entry_id, image_id=row["id"], storage_key=row["storage_key"]),
                created_at=row["created_at"],
            )
        )
    return created


@router.get("/{journal_id}/entries/{entry_id}/images/{image_id}", response_model=None)
def get_image(
    journal_id: UUID,
    entry_id: UUID,
    image_id: UUID,
    connection: Annotated[Connection, Depends(get_connection)],
) -> Response:
    """
    Public endpoint for journal images - no authentication required.
    Images are accessible to journal owners without auth for browser loading.
    """
    # Verify the image exists and belongs to the specified journal/entry
    row = connection.execute(
        """
        SELECT i.storage_key, i.mime_type
        FROM journal.entry_images i
        JOIN journal.entries e ON e.id = i.entry_id
        WHERE i.id = %s AND e.id = %s AND e.journal_id = %s
        """,
        (image_id, entry_id, journal_id),
    ).fetchone()
    
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    
    storage = LocalStorageBackend(settings.journal_media_dir)
    data = storage.open_bytes(key=row["storage_key"])
    if data is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    return Response(content=data, media_type=row["mime_type"])


@router.delete("/{journal_id}/entries/{entry_id}/images/{image_id}", status_code=204)
def delete_image(
    journal_id: UUID,
    entry_id: UUID,
    image_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> Response:
    _service(connection).delete_entry_image(
        user_id=current_user.id,
        journal_id=journal_id,
        entry_id=entry_id,
        image_id=image_id,
    )
    return Response(status_code=204)
