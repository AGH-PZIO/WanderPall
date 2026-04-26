from collections.abc import Mapping

from app.modules.travel_buddies.models import (
    Group,
    GroupMember,
    MemberRole,
    Poll,
    PollOption,
    PollStatus,
    PollVote,
    Message,
    Attachment,
    Task,
    TaskStatus,
    PackingItem,
)


def group_from_row(row: Mapping) -> Group:
    return Group(
        id=row["id"],
        name=row["name"],
        description=row["description"],
        created_by=row["created_by"],
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
    )


def group_member_from_row(row: Mapping) -> GroupMember:
    role_str = row["role"]
    role = MemberRole(role_str)
    return GroupMember(
        id=row["id"],
        group_id=row["group_id"],
        user_id=row["user_id"],
        role=role,
        joined_at=row.get("joined_at"),
    )


def poll_from_row(row: Mapping) -> Poll:
    status_str = row["status"]
    status = PollStatus(status_str)
    return Poll(
        id=row["id"],
        group_id=row["group_id"],
        question=row["question"],
        status=status,
        created_by=row["created_by"],
        created_at=row.get("created_at"),
        closed_at=row.get("closed_at"),
    )


def poll_option_from_row(row: Mapping) -> PollOption:
    return PollOption(
        id=row["id"],
        poll_id=row["poll_id"],
        text=row["text"],
        order_index=row.get("order_index", 0),
    )


def poll_vote_from_row(row: Mapping) -> PollVote:
    return PollVote(
        id=row["id"],
        poll_id=row["poll_id"],
        option_id=row["option_id"],
        user_id=row["user_id"],
        created_at=row.get("created_at"),
    )


def message_from_row(row: Mapping) -> Message:
    return Message(
        id=row["id"],
        group_id=row["group_id"],
        user_id=row["user_id"],
        content=row["content"],
        created_at=row.get("created_at"),
    )


def attachment_from_row(row: Mapping) -> Attachment:
    return Attachment(
        id=row["id"],
        group_id=row["group_id"],
        user_id=row["user_id"],
        filename=row["filename"],
        content_type=row["content_type"],
        size=row["size"],
        created_at=row.get("created_at"),
    )


def task_from_row(row: Mapping) -> Task:
    status_str = row["status"]
    status = TaskStatus(status_str)
    return Task(
        id=row["id"],
        group_id=row["group_id"],
        title=row["title"],
        description=row["description"],
        status=status,
        assigned_to=row["assigned_to"],
        due_date=row["due_date"],
        created_by=row["created_by"],
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
    )


def packing_item_from_row(row: Mapping) -> PackingItem:
    return PackingItem(
        id=row["id"],
        group_id=row["group_id"],
        name=row["name"],
        category=row["category"],
        quantity=row.get("quantity", 1),
        is_packed=row.get("is_packed", False),
        added_by=row["added_by"],
        created_at=row.get("created_at"),
    )