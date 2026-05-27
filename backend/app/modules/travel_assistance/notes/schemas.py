from datetime import datetime
from uuid import UUID
from pydantic import BaseModel

class NotesBase(BaseModel):
    title: str
    content: str

class NotesCreate(NotesBase):
    pass

class NotesResponse(NotesBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    modified_at: datetime | None