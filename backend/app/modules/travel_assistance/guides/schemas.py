from datetime import datetime
from uuid import UUID
from pydantic import BaseModel
from typing import List
from typing import Literal, Optional

class GuideBlock(BaseModel):
    type: Literal["heading", "paragraph", "image", "audio", "video"]
    text: Optional[str] = None
    url: Optional[str] = None

class GuideBase(BaseModel):
    title: str
    content: List[GuideBlock]
    published: bool

class GuideCreate(GuideBase):
    pass

class GuideResponse(GuideBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime | None