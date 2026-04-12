from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class AuthorizeUrlResponse(BaseModel):
    url: str


class GmailStatusResponse(BaseModel):
    connected: bool
    google_email: str | None = None
    last_sync_at: datetime | None = None


class SyncResponse(BaseModel):
    scanned: int = Field(description="Messages fetched from Gmail in this run")
    imported: int = Field(description="New travel-related rows inserted")
    updated: int = Field(description="Existing rows updated")


class AttachmentInfo(BaseModel):
    attachment_id: str
    filename: str | None = None
    mime_type: str | None = None
    size: int | None = None


class TravelDocumentResponse(BaseModel):
    id: UUID
    gmail_message_id: str
    gmail_thread_id: str | None
    subject: str | None
    snippet: str | None
    from_addr: str | None
    received_at: datetime | None
    category: str
    confidence: str
    is_travel_related: bool
    synced_at: datetime
    attachments: list[AttachmentInfo] = Field(default_factory=list)


class TravelDocumentListResponse(BaseModel):
    items: list[TravelDocumentResponse]
    total: int
