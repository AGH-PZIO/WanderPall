from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, Field


class JournalVisibility(StrEnum):
    private = "private"
    friends_only = "friends_only"
    public = "public"


class JournalCreateRequest(BaseModel):
    title: Annotated[str, Field(min_length=1, max_length=200)]


class JournalUpdateRequest(BaseModel):
    title: Annotated[str | None, Field(min_length=1, max_length=200)] = None


class JournalVisibilityUpdateRequest(BaseModel):
    visibility: JournalVisibility


class JournalResponse(BaseModel):
    id: UUID
    title: str
    visibility: JournalVisibility
    created_at: datetime
    updated_at: datetime


class JournalListResponse(BaseModel):
    items: list[JournalResponse]
    total: int


class EntryCreateRequest(BaseModel):
    lat: float
    lng: float
    text: str = ""


class EntryUpdateRequest(BaseModel):
    lat: float | None = None
    lng: float | None = None
    text: str | None = None


class EntryImageResponse(BaseModel):
    id: UUID
    mime_type: str
    byte_size: int
    url: str
    created_at: datetime


class EntryResponse(BaseModel):
    id: UUID
    journal_id: UUID
    lat: float
    lng: float
    text: str
    created_at: datetime
    updated_at: datetime
    images: list[EntryImageResponse] = []


class EntryListResponse(BaseModel):
    items: list[EntryResponse]
    total: int
