from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class GroupCreate(BaseModel):
    name: str
    description: str | None = None


class GroupResponse(BaseModel):
    id: UUID
    owner_id: UUID
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime


class AddMemberRequest(BaseModel):
    user_id: UUID


class GroupMemberResponse(BaseModel):
    id: UUID
    group_id: UUID
    user_id: UUID
    role: str
    joined_at: datetime


class GroupWithMembersResponse(BaseModel):
    id: UUID
    owner_id: UUID
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime
    members: list[GroupMemberResponse]
