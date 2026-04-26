from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field


def _dt(v: datetime | None) -> str | None:
    return v.isoformat() if v else None


class GroupResponse(BaseModel):
    id: UUID
    name: str
    description: str | None = None
    member_count: int = 0
    created_at: str | None = None


def group_to_response(g: "Group") -> GroupResponse:
    from dataclasses import asdict

    data = asdict(g)
    data.pop("created_by", None)
    data.pop("updated_at", None)
    data["created_at"] = _dt(data.get("created_at"))
    return GroupResponse.model_validate(data)


class GroupDetailResponse(BaseModel):
    id: UUID
    name: str
    description: str | None = None
    created_by: UUID
    created_at: str | None = None
    updated_at: str | None = None
    is_member: bool = False
    is_admin: bool = False
    is_owner: bool = False


class GroupListResponse(BaseModel):
    items: list[GroupResponse]
    total: int


class CreateGroupRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    description: str | None = Field(default=None, max_length=500)


class UpdateGroupRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    description: str | None = Field(default=None, max_length=500)


class GroupMemberResponse(BaseModel):
    id: UUID
    group_id: UUID
    user_id: UUID
    role: str
    nickname: str | None = None
    joined_at: str | None = None
    first_name: str | None = None
    last_name: str | None = None


class GroupMemberDetailResponse(BaseModel):
    id: UUID
    group_id: UUID
    user_id: UUID
    role: str
    nickname: str | None = None
    joined_at: str | None = None
    first_name: str | None = None
    last_name: str | None = None


class MemberListResponse(BaseModel):
    items: list[GroupMemberResponse]
    total: int


class AddMemberRequest(BaseModel):
    user_id: UUID


class InviteMemberRequest(BaseModel):
    email: str


class UpdateMemberRoleRequest(BaseModel):
    role: str = Field(min_length=1)


class RemoveMemberRequest(BaseModel):
    user_id: UUID


class TransferOwnershipRequest(BaseModel):
    new_owner_id: UUID


class PollResponse(BaseModel):
    id: UUID
    group_id: UUID
    question: str
    status: str
    created_by: UUID
    option_count: int = 0
    vote_count: int = 0
    created_at: str | None = None
    closed_at: str | None = None


class PollOptionResponse(BaseModel):
    id: UUID
    poll_id: UUID
    text: str
    order_index: int = 0
    vote_count: int = 0


class PollDetailResponse(BaseModel):
    id: UUID
    group_id: UUID
    question: str
    status: str
    created_by: UUID
    created_at: str | None = None
    closed_at: str | None = None
    options: list[PollOptionResponse]
    user_vote_option_id: UUID | None = None
    is_closed: bool = False
    winning_option: PollOptionResponse | None = None


class PollListResponse(BaseModel):
    items: list[PollResponse]
    total: int


class CreatePollRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)
    options: list[str] = Field(min_length=2, max_length=20)


class AddPollOptionRequest(BaseModel):
    text: str = Field(min_length=1, max_length=200)


class VoteRequest(BaseModel):
    option_id: UUID


class MessageResponse(BaseModel):
    id: UUID
    group_id: UUID
    user_id: UUID
    content: str
    reactions: dict[str, int] = {}
    created_at: str | None = None


class MessageDetailResponse(BaseModel):
    id: UUID
    group_id: UUID
    user_id: UUID
    content: str
    reactions: dict[str, list[str]] = {}
    created_at: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    nickname: str | None = None


class AttachmentResponse(BaseModel):
    id: UUID
    filename: str
    content_type: str
    url: str
    size: int


class MessageDetailWithCountsResponse(BaseModel):
    id: UUID
    group_id: UUID
    user_id: UUID
    content: str
    reactions: dict[str, int] = {}
    attachments: list[AttachmentResponse] = []
    created_at: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    nickname: str | None = None


class MessageListResponse(BaseModel):
    items: list[MessageDetailWithCountsResponse]
    total: int


class CreateMessageRequest(BaseModel):
    content: str = Field(default="", max_length=5000)
    attachment_ids: list[UUID] = []


class TaskResponse(BaseModel):
    id: UUID
    group_id: UUID
    title: str
    description: str | None = None
    status: str
    assigned_to: UUID | None = None
    due_date: date | None = None
    created_by: UUID
    created_at: str | None = None


class TaskListResponse(BaseModel):
    items: list[TaskResponse]
    total: int


class CreateTaskRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=1000)
    assigned_to: UUID | None = None
    due_date: date | None = None


class UpdateTaskRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=1000)
    assigned_to: UUID | None = None
    due_date: date | None = None


class PackingItemResponse(BaseModel):
    id: UUID
    group_id: UUID
    name: str
    category: str | None = None
    quantity: int = 1
    is_packed: bool = False
    added_by: UUID
    created_at: str | None = None


class PackingItemListResponse(BaseModel):
    items: list[PackingItemResponse]
    total: int
    packed_count: int = 0


class PackingProgressResponse(BaseModel):
    total: int
    packed: int
    unpacked: int
    progress_percent: float


class CreatePackingItemRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    category: str | None = Field(default=None, max_length=100)
    quantity: int = Field(default=1, ge=1, le=999)


class UpdatePackingItemRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    category: str | None = Field(default=None, max_length=100)
    quantity: int | None = Field(default=None, ge=1, le=999)