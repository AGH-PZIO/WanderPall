from dataclasses import dataclass
from datetime import date, datetime
from enum import Enum
from uuid import UUID


class MemberRole(str, Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"


class PollStatus(str, Enum):
    OPEN = "open"
    CLOSED = "closed"


class TaskStatus(str, Enum):
    PENDING = "pending"
    DONE = "done"


@dataclass(frozen=True)
class Group:
    id: UUID
    name: str
    description: str | None
    created_by: UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass(frozen=True)
class GroupMember:
    id: UUID
    group_id: UUID
    user_id: UUID
    role: MemberRole
    joined_at: datetime | None = None


@dataclass(frozen=True)
class Poll:
    id: UUID
    group_id: UUID
    question: str
    status: PollStatus
    created_by: UUID
    created_at: datetime | None = None
    closed_at: datetime | None = None


@dataclass(frozen=True)
class PollOption:
    id: UUID
    poll_id: UUID
    text: str
    order_index: int = 0


@dataclass(frozen=True)
class PollVote:
    id: UUID
    poll_id: UUID
    option_id: UUID
    user_id: UUID
    created_at: datetime | None = None


@dataclass(frozen=True)
class Message:
    id: UUID
    group_id: UUID
    user_id: UUID
    content: str
    created_at: datetime | None = None


@dataclass(frozen=True)
class Attachment:
    id: UUID
    group_id: UUID
    user_id: UUID
    filename: str
    content_type: str
    size: int
    original_filename: str | None = None
    created_at: datetime | None = None


@dataclass(frozen=True)
class Task:
    id: UUID
    group_id: UUID
    title: str
    description: str | None
    status: TaskStatus
    assigned_to: UUID | None
    due_date: date | None
    created_by: UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass(frozen=True)
class PackingItem:
    id: UUID
    group_id: UUID
    name: str
    category: str | None
    added_by: UUID
    quantity: int = 1
    is_packed: bool = False
    created_at: datetime | None = None