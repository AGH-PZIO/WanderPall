from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from psycopg import Connection

from app.core.config import settings
from app.core.database import get_connection
from app.modules.account.dependencies import get_current_user
from app.modules.account.models import User
from app.modules.journal.explorer import repository
from app.modules.journal.explorer.schemas import (
    CommentCreateRequest,
    CommentListResponse,
    CommentResponse,
    ExplorerEntryImageResponse,
    ExplorerEntryResponse,
    ExplorerJournalDetailResponse,
    ExplorerJournalListResponse,
    ExplorerJournalPreviewResponse,
    PublicAuthorResponse,
    ReactionResponse,
    ReactionUpsertRequest,
)
from app.modules.journal.explorer.service import JournalExplorerService
from app.modules.journal.storage.local import LocalStorageBackend

router = APIRouter(prefix="/journals/explorer")


def _svc(connection: Connection) -> JournalExplorerService:
    return JournalExplorerService(connection=connection)


def _explorer_image_url(*, journal_id: UUID, entry_id: UUID, image_id: UUID, storage_key: str) -> str:
    # Extract extension from storage_key (e.g., "journals/.../image_id.jpg" -> ".jpg")
    ext = storage_key.split('.')[-1] if '.' in storage_key else ''
    # Return full backend URL from config
    if ext:
        return f"{settings.backend_url}/journals/explorer/{journal_id}/entries/{entry_id}/images/{image_id}.{ext}"
    return f"{settings.backend_url}/journals/explorer/{journal_id}/entries/{entry_id}/images/{image_id}"


def _entry_response(*, journal_id: UUID, row: dict, images: list[dict]) -> ExplorerEntryResponse:
    return ExplorerEntryResponse(
        id=row["id"],
        lat=row["lat"],
        lng=row["lng"],
        text=row["text"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        images=[
            ExplorerEntryImageResponse(
                id=i["id"],
                url=_explorer_image_url(journal_id=journal_id, entry_id=row["id"], image_id=i["id"], storage_key=i["storage_key"]),
                mime_type=i["mime_type"],
                byte_size=i["byte_size"],
                created_at=i["created_at"],
            )
            for i in images
        ],
    )


# More specific routes must come before generic /{journal_id} route

@router.get("/my-public", response_model=ExplorerJournalListResponse)
def list_my_public_journals(
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ExplorerJournalListResponse:
    """List the current user's own public journals with reactions and comments."""
    rows, total = _svc(connection).list_my_public_journals(current_user_id=current_user.id, limit=limit, offset=offset)
    items: list[ExplorerJournalPreviewResponse] = []
    for r in rows:
        first_entry = repository.get_first_entry_for_journal(connection, journal_id=r["id"])
        first_entry_resp = None
        if first_entry is not None:
            imgs = repository.list_images_for_entry(connection, entry_id=first_entry["id"])
            first_entry_resp = _entry_response(journal_id=r["id"], row=first_entry, images=imgs)

        reactions = repository.get_reaction_breakdown(connection, journal_id=r["id"])
        
        items.append(
            ExplorerJournalPreviewResponse(
                id=r["id"],
                title=r["title"],
                visibility=r["visibility"],
                author=PublicAuthorResponse(id=r["user_id"], first_name=r["first_name"], last_name=r["last_name"]),
                created_at=r["created_at"],
                updated_at=r["updated_at"],
                reaction_count=int(r["reaction_count"]),
                reactions=reactions,
                comment_count=int(r["comment_count"]),
                my_reaction=r.get("my_reaction"),
                first_entry=first_entry_resp,
            )
        )
    return ExplorerJournalListResponse(items=items, total=total)


@router.get("", response_model=ExplorerJournalListResponse)
def list_explorer_feed(
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ExplorerJournalListResponse:
    rows, total = _svc(connection).list_feed(current_user_id=current_user.id, limit=limit, offset=offset)
    items: list[ExplorerJournalPreviewResponse] = []
    for r in rows:
        first_entry = repository.get_first_entry_for_journal(connection, journal_id=r["id"])
        first_entry_resp = None
        if first_entry is not None:
            imgs = repository.list_images_for_entry(connection, entry_id=first_entry["id"])
            first_entry_resp = _entry_response(journal_id=r["id"], row=first_entry, images=imgs)

        reactions = repository.get_reaction_breakdown(connection, journal_id=r["id"])
        
        items.append(
            ExplorerJournalPreviewResponse(
                id=r["id"],
                title=r["title"],
                visibility=r["visibility"],
                author=PublicAuthorResponse(id=r["user_id"], first_name=r["first_name"], last_name=r["last_name"]),
                created_at=r["created_at"],
                updated_at=r["updated_at"],
                reaction_count=int(r["reaction_count"]),
                reactions=reactions,
                comment_count=int(r["comment_count"]),
                my_reaction=r.get("my_reaction"),
                first_entry=first_entry_resp,
            )
        )
    return ExplorerJournalListResponse(items=items, total=total)


@router.get("/{journal_id}", response_model=ExplorerJournalDetailResponse)
def get_explorer_journal(
    journal_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> ExplorerJournalDetailResponse:
    j = _svc(connection).require_accessible_journal(current_user_id=current_user.id, journal_id=journal_id)
    entries = repository.list_entries_for_journal(connection, journal_id=journal_id)
    entry_responses: list[ExplorerEntryResponse] = []
    for e in entries:
        imgs = repository.list_images_for_entry(connection, entry_id=e["id"])
        entry_responses.append(_entry_response(journal_id=journal_id, row=e, images=imgs))

    reactions = repository.get_reaction_breakdown(connection, journal_id=journal_id)
    
    return ExplorerJournalDetailResponse(
        id=j["id"],
        title=j["title"],
        visibility=j["visibility"],
        author=PublicAuthorResponse(id=j["user_id"], first_name=j["first_name"], last_name=j["last_name"]),
        created_at=j["created_at"],
        updated_at=j["updated_at"],
        reaction_count=int(j["reaction_count"]),
        reactions=reactions,
        comment_count=int(j["comment_count"]),
        my_reaction=j.get("my_reaction"),
        entries=entry_responses,
    )


@router.put("/{journal_id}/reactions", response_model=ReactionResponse)
def upsert_reaction(
    journal_id: UUID,
    request: ReactionUpsertRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> ReactionResponse:
    _svc(connection).upsert_reaction(current_user_id=current_user.id, journal_id=journal_id, emoji=request.emoji, include_own=True)
    return ReactionResponse(emoji=request.emoji)


@router.delete("/{journal_id}/reactions", status_code=204)
def delete_reaction(
    journal_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> Response:
    _svc(connection).delete_reaction(current_user_id=current_user.id, journal_id=journal_id, include_own=True)
    return Response(status_code=204)


@router.post("/{journal_id}/comments", response_model=CommentResponse, status_code=201)
def create_comment(
    journal_id: UUID,
    request: CommentCreateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> CommentResponse:
    row = _svc(connection).create_comment(
        current_user_id=current_user.id,
        journal_id=journal_id,
        body=request.body,
        parent_comment_id=request.parent_comment_id,
        include_own=True,
    )
    return CommentResponse(
        id=row["id"],
        journal_id=row["journal_id"],
        user=PublicAuthorResponse(id=current_user.id, first_name=current_user.first_name, last_name=current_user.last_name),
        parent_comment_id=row["parent_comment_id"],
        body=row["body"] if row["deleted_at"] is None else None,
        is_deleted=row["deleted_at"] is not None,
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


@router.get("/{journal_id}/comments", response_model=CommentListResponse)
def list_comments(
    journal_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> CommentListResponse:
    _svc(connection).require_accessible_journal(current_user_id=current_user.id, journal_id=journal_id, include_own=True)
    rows, total = repository.list_comments(connection, journal_id=journal_id, limit=limit, offset=offset)
    items = [
        CommentResponse(
            id=r["id"],
            journal_id=r["journal_id"],
            user=PublicAuthorResponse(id=r["user_id"], first_name=r["first_name"], last_name=r["last_name"]),
            parent_comment_id=r["parent_comment_id"],
            body=r["body"] if r["deleted_at"] is None else None,
            is_deleted=r["deleted_at"] is not None,
            created_at=r["created_at"],
            updated_at=r["updated_at"],
        )
        for r in rows
    ]
    return CommentListResponse(items=items, total=total)


@router.delete("/{journal_id}/comments/{comment_id}", status_code=204)
def delete_comment(
    journal_id: UUID,
    comment_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> Response:
    _svc(connection).delete_comment(current_user_id=current_user.id, journal_id=journal_id, comment_id=comment_id, include_own=True)
    return Response(status_code=204)


@router.get("/{journal_id}/entries/{entry_id}/images/{image_id:path}", response_model=None)
def get_public_image(
    journal_id: UUID,
    entry_id: UUID,
    image_id: str,
    connection: Annotated[Connection, Depends(get_connection)],
) -> Response:
    """
    Public endpoint for explorer images - no authentication required.
    Only serves images from public journals.
    """
    # Verify the journal is public before serving the image
    journal_row = connection.execute(
        "SELECT visibility FROM journal.journals WHERE id = %s",
        (journal_id,),
    ).fetchone()
    
    if journal_row is None or journal_row["visibility"] != "public":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")

    # Extract UUID from image_id (remove extension if present)
    # e.g., "uuid.jpg" -> "uuid"
    image_uuid_str = image_id.split('.')[0] if '.' in image_id else image_id
    try:
        image_uuid = UUID(image_uuid_str)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid image ID")

    row = connection.execute(
        """
        SELECT i.storage_key, i.mime_type
        FROM journal.entry_images i
        JOIN journal.entries e ON e.id = i.entry_id
        WHERE i.id = %s AND e.id = %s AND e.journal_id = %s
        """,
        (image_uuid, entry_id, journal_id),
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")

    storage = LocalStorageBackend(settings.journal_media_dir)
    data = storage.open_bytes(key=row["storage_key"])
    if data is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    return Response(content=data, media_type=row["mime_type"])
