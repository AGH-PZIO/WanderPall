from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, Field

from app.modules.journal.editor.schemas import JournalVisibility


class ReactionEmoji(StrEnum):
    like = "like"
    heart = "heart"
    haha = "haha"
    sad = "sad"


class PublicAuthorResponse(BaseModel):
    id: UUID
    first_name: str
    last_name: str


class ExplorerEntryImageResponse(BaseModel):
    id: UUID
    url: str
    mime_type: str
    byte_size: int
    created_at: datetime


class ExplorerEntryResponse(BaseModel):
    id: UUID
    lat: float
    lng: float
    text: str
    created_at: datetime
    updated_at: datetime
    images: list[ExplorerEntryImageResponse] = []


class ExplorerJournalPreviewResponse(BaseModel):
    id: UUID
    title: str
    visibility: JournalVisibility
    author: PublicAuthorResponse
    created_at: datetime
    updated_at: datetime
    reaction_count: int
    reactions: dict[str, int] = Field(default_factory=dict)  # emoji -> count
    comment_count: int
    my_reaction: ReactionEmoji | None = None
    first_entry: ExplorerEntryResponse | None = None


class ExplorerJournalListResponse(BaseModel):
    items: list[ExplorerJournalPreviewResponse]
    total: int


class ExplorerJournalDetailResponse(BaseModel):
    id: UUID
    title: str
    visibility: JournalVisibility
    author: PublicAuthorResponse
    created_at: datetime
    updated_at: datetime
    reaction_count: int
    reactions: dict[str, int] = Field(default_factory=dict)  # emoji -> count
    comment_count: int
    my_reaction: ReactionEmoji | None = None
    entries: list[ExplorerEntryResponse] = []


class ReactionUpsertRequest(BaseModel):
    emoji: ReactionEmoji


class ReactionResponse(BaseModel):
    emoji: ReactionEmoji


class CommentCreateRequest(BaseModel):
    body: str = Field(min_length=1, max_length=5000)
    parent_comment_id: UUID | None = None


class CommentResponse(BaseModel):
    id: UUID
    journal_id: UUID
    user: PublicAuthorResponse
    parent_comment_id: UUID | None = None
    body: str | None = None
    is_deleted: bool
    created_at: datetime
    updated_at: datetime


class CommentListResponse(BaseModel):
    items: list[CommentResponse]
    total: int
