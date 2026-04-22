from uuid import UUID
from typing import Any

from psycopg import Connection

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
from app.modules.travel_buddies.repositories.mappers import (
    group_from_row,
    group_member_from_row,
    poll_from_row,
    poll_option_from_row,
    poll_vote_from_row,
    message_from_row,
    task_from_row,
    packing_item_from_row,
    attachment_from_row,
)


class PsycopgGroupRepository:
    def __init__(self, connection: Connection) -> None:
        self.connection = connection

    def get_by_id(self, group_id: UUID) -> Group | None:
        row = self.connection.execute(
            "SELECT * FROM travel_buddies.groups WHERE id = %s",
            (group_id,),
        ).fetchone()
        return group_from_row(row) if row else None

    def get_by_name(self, name: str) -> Group | None:
        row = self.connection.execute(
            "SELECT * FROM travel_buddies.groups WHERE name = %s",
            (name,),
        ).fetchone()
        return group_from_row(row) if row else None

    def create(self, group: Group) -> Group:
        row = self.connection.execute(
            """
            INSERT INTO travel_buddies.groups (id, name, description, created_by)
            VALUES (%s, %s, %s, %s)
            RETURNING *
            """,
            (group.id, group.name, group.description, group.created_by),
        ).fetchone()
        return group_from_row(row)

    def update(self, group: Group) -> Group:
        row = self.connection.execute(
            """
            UPDATE travel_buddies.groups
            SET name = %s, description = %s, updated_at = now()
            WHERE id = %s
            RETURNING *
            """,
            (group.name, group.description, group.id),
        ).fetchone()
        return group_from_row(row)

    def delete(self, group_id: UUID) -> None:
        self.connection.execute(
            "DELETE FROM travel_buddies.groups WHERE id = %s",
            (group_id,),
        )

    def list_for_user(self, user_id: UUID, limit: int, offset: int) -> list[Group]:
        rows = self.connection.execute(
            """
            SELECT g.* FROM travel_buddies.groups g
            INNER JOIN travel_buddies.group_members gm ON g.id = gm.group_id
            WHERE gm.user_id = %s
            ORDER BY g.created_at DESC
            LIMIT %s OFFSET %s
            """,
            (user_id, limit, offset),
        ).fetchall()
        return [group_from_row(row) for row in rows]

    def count_for_user(self, user_id: UUID) -> int:
        row = self.connection.execute(
            """
            SELECT COUNT(*) FROM travel_buddies.groups g
            INNER JOIN travel_buddies.group_members gm ON g.id = gm.group_id
            WHERE gm.user_id = %s
            """,
            (user_id,),
        ).fetchone()
        return row["count"] if row else 0

    def search(self, query: str, limit: int, offset: int) -> list[Group]:
        rows = self.connection.execute(
            """
            SELECT * FROM travel_buddies.groups
            WHERE name ILIKE %s OR description ILIKE %s
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
            """,
            (f"%{query}%", f"%{query}%", limit, offset),
        ).fetchall()
        return [group_from_row(row) for row in rows]

    def count_search(self, query: str) -> int:
        row = self.connection.execute(
            """
            SELECT COUNT(*) FROM travel_buddies.groups
            WHERE name ILIKE %s OR description ILIKE %s
            """,
            (f"%{query}%", f"%{query}%"),
        ).fetchone()
        return row["count"] if row else 0

    def is_member(self, group_id: UUID, user_id: UUID) -> bool:
        row = self.connection.execute(
            "SELECT 1 FROM travel_buddies.group_members WHERE group_id = %s AND user_id = %s",
            (group_id, user_id),
        ).fetchone()
        return row is not None

    def is_owner(self, group_id: UUID, user_id: UUID) -> bool:
        row = self.connection.execute(
            "SELECT 1 FROM travel_buddies.group_members WHERE group_id = %s AND user_id = %s AND role = %s",
            (group_id, user_id, MemberRole.OWNER.value),
        ).fetchone()
        return row is not None

    def name_exists(self, name: str, exclude_group_id: UUID | None = None) -> bool:
        if exclude_group_id is None:
            row = self.connection.execute(
                "SELECT 1 FROM travel_buddies.groups WHERE name = %s",
                (name,),
            ).fetchone()
        else:
            row = self.connection.execute(
                "SELECT 1 FROM travel_buddies.groups WHERE name = %s AND id <> %s",
                (name, exclude_group_id),
            ).fetchone()
        return row is not None

    def get_member_count(self, group_id: UUID) -> int:
        row = self.connection.execute(
            "SELECT COUNT(*) FROM travel_buddies.group_members WHERE group_id = %s",
            (group_id,),
        ).fetchone()
        return row["count"] if row else 0


class PsycopgGroupMemberRepository:
    def __init__(self, connection: Connection) -> None:
        self.connection = connection

    def get_by_id(self, member_id: UUID) -> GroupMember | None:
        row = self.connection.execute(
            "SELECT * FROM travel_buddies.group_members WHERE id = %s",
            (member_id,),
        ).fetchone()
        return group_member_from_row(row) if row else None

    def get_by_group_and_user(self, group_id: UUID, user_id: UUID) -> GroupMember | None:
        row = self.connection.execute(
            "SELECT * FROM travel_buddies.group_members WHERE group_id = %s AND user_id = %s",
            (group_id, user_id),
        ).fetchone()
        return group_member_from_row(row) if row else None

    def list_by_group(self, group_id: UUID, limit: int, offset: int) -> list[GroupMember]:
        rows = self.connection.execute(
            """
            SELECT * FROM travel_buddies.group_members
            WHERE group_id = %s
            ORDER BY joined_at ASC
            LIMIT %s OFFSET %s
            """,
            (group_id, limit, offset),
        ).fetchall()
        return [group_member_from_row(row) for row in rows]

    def count_by_group(self, group_id: UUID) -> int:
        row = self.connection.execute(
            "SELECT COUNT(*) FROM travel_buddies.group_members WHERE group_id = %s",
            (group_id,),
        ).fetchone()
        return row["count"] if row else 0

    def create(self, member: GroupMember) -> GroupMember:
        row = self.connection.execute(
            """
            INSERT INTO travel_buddies.group_members (id, group_id, user_id, role)
            VALUES (%s, %s, %s, %s)
            RETURNING *
            """,
            (member.id, member.group_id, member.user_id, member.role.value),
        ).fetchone()
        return group_member_from_row(row)

    def update(self, member: GroupMember) -> GroupMember:
        row = self.connection.execute(
            """
            UPDATE travel_buddies.group_members
            SET role = %s
            WHERE id = %s
            RETURNING *
            """,
            (member.role.value, member.id),
        ).fetchone()
        return group_member_from_row(row)

    def delete(self, member_id: UUID) -> None:
        self.connection.execute(
            "DELETE FROM travel_buddies.group_members WHERE id = %s",
            (member_id,),
        )

    def delete_by_group_and_user(self, group_id: UUID, user_id: UUID) -> None:
        self.connection.execute(
            "DELETE FROM travel_buddies.group_members WHERE group_id = %s AND user_id = %s",
            (group_id, user_id),
        )

    def list_by_user(self, user_id: UUID) -> list[GroupMember]:
        rows = self.connection.execute(
            "SELECT * FROM travel_buddies.group_members WHERE user_id = %s",
            (user_id,),
        ).fetchall()
        return [group_member_from_row(row) for row in rows]

    def count_admins(self, group_id: UUID) -> int:
        row = self.connection.execute(
            """
            SELECT COUNT(*) FROM travel_buddies.group_members
            WHERE group_id = %s AND role IN (%s, %s)
            """,
            (group_id, MemberRole.ADMIN.value, MemberRole.OWNER.value),
        ).fetchone()
        return row["count"] if row else 0

    def role_at_least(self, group_id: UUID, user_id: UUID, required_role: MemberRole) -> bool:
        role_order = {"owner": 3, "admin": 2, "member": 1}
        member = self.get_by_group_and_user(group_id, user_id)
        if member is None:
            return False
        return role_order.get(member.role.value, 0) >= role_order.get(required_role.value, 0)

    def is_owner(self, group_id: UUID, user_id: UUID) -> bool:
        member = self.get_by_group_and_user(group_id, user_id)
        return member is not None and member.role == MemberRole.OWNER

    def is_admin(self, group_id: UUID, user_id: UUID) -> bool:
        member = self.get_by_group_and_user(group_id, user_id)
        if member is None:
            return False
        return member.role in (MemberRole.OWNER, MemberRole.ADMIN)

    def is_member(self, group_id: UUID, user_id: UUID) -> bool:
        return self.get_by_group_and_user(group_id, user_id) is not None


class PsycopgPollRepository:
    def __init__(self, connection: Connection) -> None:
        self.connection = connection

    def get_by_id(self, poll_id: UUID) -> Poll | None:
        row = self.connection.execute(
            "SELECT * FROM travel_buddies.polls WHERE id = %s",
            (poll_id,),
        ).fetchone()
        return poll_from_row(row) if row else None

    def list_by_group(self, group_id: UUID, limit: int, offset: int) -> list[Poll]:
        rows = self.connection.execute(
            """
            SELECT * FROM travel_buddies.polls
            WHERE group_id = %s
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
            """,
            (group_id, limit, offset),
        ).fetchall()
        return [poll_from_row(row) for row in rows]

    def count_by_group(self, group_id: UUID) -> int:
        row = self.connection.execute(
            "SELECT COUNT(*) FROM travel_buddies.polls WHERE group_id = %s",
            (group_id,),
        ).fetchone()
        return row["count"] if row else 0

    def create(self, poll: Poll) -> Poll:
        row = self.connection.execute(
            """
            INSERT INTO travel_buddies.polls (id, group_id, question, status, created_by)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING *
            """,
            (poll.id, poll.group_id, poll.question, poll.status.value, poll.created_by),
        ).fetchone()
        return poll_from_row(row)

    def update(self, poll: Poll) -> Poll:
        row = self.connection.execute(
            """
            UPDATE travel_buddies.polls
            SET question = %s, status = %s
            WHERE id = %s
            RETURNING *
            """,
            (poll.question, poll.status.value, poll.id),
        ).fetchone()
        return poll_from_row(row)

    def delete(self, poll_id: UUID) -> None:
        self.connection.execute(
            "DELETE FROM travel_buddies.polls WHERE id = %s",
            (poll_id,),
        )

    def close(self, poll_id: UUID) -> Poll:
        row = self.connection.execute(
            """
            UPDATE travel_buddies.polls
            SET status = %s, closed_at = now()
            WHERE id = %s
            RETURNING *
            """,
            (PollStatus.CLOSED.value, poll_id),
        ).fetchone()
        return poll_from_row(row)

    def list_open(self, group_id: UUID) -> list[Poll]:
        rows = self.connection.execute(
            """
            SELECT * FROM travel_buddies.polls
            WHERE group_id = %s AND status = %s
            ORDER BY created_at DESC
            """,
            (group_id, PollStatus.OPEN.value),
        ).fetchall()
        return [poll_from_row(row) for row in rows]


class PsycopgPollOptionRepository:
    def __init__(self, connection: Connection) -> None:
        self.connection = connection

    def get_by_id(self, option_id: UUID) -> PollOption | None:
        row = self.connection.execute(
            "SELECT * FROM travel_buddies.poll_options WHERE id = %s",
            (option_id,),
        ).fetchone()
        return poll_option_from_row(row) if row else None

    def list_by_poll(self, poll_id: UUID) -> list[PollOption]:
        rows = self.connection.execute(
            """
            SELECT * FROM travel_buddies.poll_options
            WHERE poll_id = %s
            ORDER BY order_index ASC
            """,
            (poll_id,),
        ).fetchall()
        return [poll_option_from_row(row) for row in rows]

    def create(self, option: PollOption) -> PollOption:
        row = self.connection.execute(
            """
            INSERT INTO travel_buddies.poll_options (id, poll_id, text, order_index)
            VALUES (%s, %s, %s, %s)
            RETURNING *
            """,
            (option.id, option.poll_id, option.text, option.order_index),
        ).fetchone()
        return poll_option_from_row(row)

    def update(self, option: PollOption) -> PollOption:
        row = self.connection.execute(
            """
            UPDATE travel_buddies.poll_options
            SET text = %s, order_index = %s
            WHERE id = %s
            RETURNING *
            """,
            (option.text, option.order_index, option.id),
        ).fetchone()
        return poll_option_from_row(row)

    def delete(self, option_id: UUID) -> None:
        self.connection.execute(
            "DELETE FROM travel_buddies.poll_options WHERE id = %s",
            (option_id,),
        )

    def count_votes(self, option_id: UUID) -> int:
        row = self.connection.execute(
            "SELECT COUNT(*) FROM travel_buddies.poll_votes WHERE option_id = %s",
            (option_id,),
        ).fetchone()
        return row["count"] if row else 0

    def bulk_create(self, options: list[PollOption]) -> list[PollOption]:
        created = []
        for option in options:
            row = self.connection.execute(
                """
                INSERT INTO travel_buddies.poll_options (id, poll_id, text, order_index)
                VALUES (%s, %s, %s, %s)
                RETURNING *
                """,
                (option.id, option.poll_id, option.text, option.order_index),
            ).fetchone()
            created.append(poll_option_from_row(row))
        return created

    def get_top_option(self, poll_id: UUID) -> PollOption | None:
        row = self.connection.execute(
            """
            SELECT po.*, COUNT(pv.id) as vote_count
            FROM travel_buddies.poll_options po
            LEFT JOIN travel_buddies.poll_votes pv ON po.id = pv.option_id
            WHERE po.poll_id = %s
            GROUP BY po.id
            ORDER BY vote_count DESC
            LIMIT 1
            """,
            (poll_id,),
        ).fetchone()
        return poll_option_from_row(row) if row else None

    def reorder(self, poll_id: UUID, option_ids: list[UUID]) -> None:
        for i, option_id in enumerate(option_ids):
            self.connection.execute(
                "UPDATE travel_buddies.poll_options SET order_index = %s WHERE id = %s AND poll_id = %s",
                (i, option_id, poll_id),
            )


class PsycopgPollVoteRepository:
    def __init__(self, connection: Connection) -> None:
        self.connection = connection

    def get_by_id(self, vote_id: UUID) -> PollVote | None:
        row = self.connection.execute(
            "SELECT * FROM travel_buddies.poll_votes WHERE id = %s",
            (vote_id,),
        ).fetchone()
        return poll_vote_from_row(row) if row else None

    def get_by_poll_and_user(self, poll_id: UUID, user_id: UUID) -> PollVote | None:
        row = self.connection.execute(
            "SELECT * FROM travel_buddies.poll_votes WHERE poll_id = %s AND user_id = %s",
            (poll_id, user_id),
        ).fetchone()
        return poll_vote_from_row(row) if row else None

    def list_by_poll(self, poll_id: UUID) -> list[PollVote]:
        rows = self.connection.execute(
            "SELECT * FROM travel_buddies.poll_votes WHERE poll_id = %s",
            (poll_id,),
        ).fetchall()
        return [poll_vote_from_row(row) for row in rows]

    def create(self, vote: PollVote) -> PollVote:
        row = self.connection.execute(
            """
            INSERT INTO travel_buddies.poll_votes (id, poll_id, option_id, user_id)
            VALUES (%s, %s, %s, %s)
            RETURNING *
            """,
            (vote.id, vote.poll_id, vote.option_id, vote.user_id),
        ).fetchone()
        return poll_vote_from_row(row)

    def delete(self, vote_id: UUID) -> None:
        self.connection.execute(
            "DELETE FROM travel_buddies.poll_votes WHERE id = %s",
            (vote_id,),
        )

    def delete_by_poll_and_user(self, poll_id: UUID, user_id: UUID) -> None:
        self.connection.execute(
            "DELETE FROM travel_buddies.poll_votes WHERE poll_id = %s AND user_id = %s",
            (poll_id, user_id),
        )

    def has_voted(self, poll_id: UUID, user_id: UUID) -> bool:
        row = self.connection.execute(
            "SELECT 1 FROM travel_buddies.poll_votes WHERE poll_id = %s AND user_id = %s",
            (poll_id, user_id),
        ).fetchone()
        return row is not None

    def vote_count(self, poll_id: UUID) -> int:
        row = self.connection.execute(
            "SELECT COUNT(*) FROM travel_buddies.poll_votes WHERE poll_id = %s",
            (poll_id,),
        ).fetchone()
        return row["count"] if row else 0

    def get_results(self, poll_id: UUID) -> dict[UUID, int]:
        rows = self.connection.execute(
            """
            SELECT option_id, COUNT(*) as count
            FROM travel_buddies.poll_votes
            WHERE poll_id = %s
            GROUP BY option_id
            """,
            (poll_id,),
        ).fetchall()
        return {row["option_id"]: row["count"] for row in rows}


class PsycopgMessageRepository:
    def __init__(self, connection: Connection) -> None:
        self.connection = connection

    def get_by_id(self, message_id: UUID) -> Message | None:
        row = self.connection.execute(
            "SELECT * FROM travel_buddies.messages WHERE id = %s",
            (message_id,),
        ).fetchone()
        return message_from_row(row) if row else None

    def list_by_group(self, group_id: UUID, limit: int, offset: int) -> list[Message]:
        rows = self.connection.execute(
            """
            SELECT * FROM travel_buddies.messages
            WHERE group_id = %s
            ORDER BY created_at ASC
            LIMIT %s OFFSET %s
            """,
            (group_id, limit, offset),
        ).fetchall()
        return [message_from_row(row) for row in rows]

    def count_by_group(self, group_id: UUID) -> int:
        row = self.connection.execute(
            "SELECT COUNT(*) FROM travel_buddies.messages WHERE group_id = %s",
            (group_id,),
        ).fetchone()
        return row["count"] if row else 0

    def create(self, message: Message) -> Message:
        row = self.connection.execute(
            """
            INSERT INTO travel_buddies.messages (id, group_id, user_id, content)
            VALUES (%s, %s, %s, %s)
            RETURNING *
            """,
            (message.id, message.group_id, message.user_id, message.content),
        ).fetchone()
        return message_from_row(row)

    def delete(self, message_id: UUID) -> None:
        self.connection.execute(
            "DELETE FROM travel_buddies.messages WHERE id = %s",
            (message_id,),
        )

    def add_reaction(self, message_id: UUID, user_id: UUID, emoji: str) -> None:
        self.connection.execute(
            """
            INSERT INTO travel_buddies.message_reactions (message_id, user_id, emoji)
            VALUES (%s, %s, %s)
            ON CONFLICT (message_id, user_id, emoji) DO NOTHING
            """,
            (message_id, user_id, emoji),
        )

    def remove_reaction(self, message_id: UUID, user_id: UUID, emoji: str) -> None:
        self.connection.execute(
            "DELETE FROM travel_buddies.message_reactions WHERE message_id = %s AND user_id = %s AND emoji = %s",
            (message_id, user_id, emoji),
        )

    def get_reactions(self, message_id: UUID) -> dict[str, list[UUID]]:
        rows = self.connection.execute(
            "SELECT emoji, user_id FROM travel_buddies.message_reactions WHERE message_id = %s",
            (message_id,),
        ).fetchall()
        reactions: dict[str, list[UUID]] = {}
        for row in rows:
            emoji = row["emoji"]
            if emoji not in reactions:
                reactions[emoji] = []
            reactions[emoji].append(row["user_id"])
        return reactions


class PsycopgAttachmentRepository:
    def __init__(self, connection: Connection) -> None:
        self.connection = connection

    def get_by_id(self, attachment_id: UUID) -> Attachment | None:
        row = self.connection.execute(
            "SELECT * FROM travel_buddies.attachments WHERE id = %s",
            (attachment_id,),
        ).fetchone()
        return attachment_from_row(row) if row else None

    def create(self, attachment: Attachment) -> Attachment:
        row = self.connection.execute(
            """
            INSERT INTO travel_buddies.attachments (id, group_id, user_id, filename, content_type, size)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (attachment.id, attachment.group_id, attachment.user_id, attachment.filename, attachment.content_type, attachment.size),
        ).fetchone()
        return attachment_from_row(row)

    def delete(self, attachment_id: UUID) -> None:
        self.connection.execute(
            "DELETE FROM travel_buddies.attachments WHERE id = %s",
            (attachment_id,),
        )

    def list_by_group(self, group_id: UUID) -> list[Attachment]:
        rows = self.connection.execute(
            "SELECT * FROM travel_buddies.attachments WHERE group_id = %s ORDER BY created_at DESC",
            (group_id,),
        ).fetchall()
        return [attachment_from_row(row) for row in rows]


def attachment_from_row(row: Any) -> Attachment:
    return Attachment(
        id=row["id"],
        group_id=row["group_id"],
        user_id=row["user_id"],
        filename=row["filename"],
        content_type=row["content_type"],
        size=row["size"],
        created_at=row.get("created_at"),
    )


class PsycopgTaskRepository:
    def __init__(self, connection: Connection) -> None:
        self.connection = connection

    def get_by_id(self, task_id: UUID) -> Task | None:
        row = self.connection.execute(
            "SELECT * FROM travel_buddies.tasks WHERE id = %s",
            (task_id,),
        ).fetchone()
        return task_from_row(row) if row else None

    def list_by_group(self, group_id: UUID, limit: int, offset: int) -> list[Task]:
        rows = self.connection.execute(
            """
            SELECT * FROM travel_buddies.tasks
            WHERE group_id = %s
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
            """,
            (group_id, limit, offset),
        ).fetchall()
        return [task_from_row(row) for row in rows]

    def count_by_group(self, group_id: UUID) -> int:
        row = self.connection.execute(
            "SELECT COUNT(*) FROM travel_buddies.tasks WHERE group_id = %s",
            (group_id,),
        ).fetchone()
        return row["count"] if row else 0

    def list_by_status(self, group_id: UUID, status: TaskStatus, limit: int, offset: int) -> list[Task]:
        rows = self.connection.execute(
            """
            SELECT * FROM travel_buddies.tasks
            WHERE group_id = %s AND status = %s
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
            """,
            (group_id, status.value, limit, offset),
        ).fetchall()
        return [task_from_row(row) for row in rows]

    def count_by_status(self, group_id: UUID, status: TaskStatus) -> int:
        row = self.connection.execute(
            "SELECT COUNT(*) FROM travel_buddies.tasks WHERE group_id = %s AND status = %s",
            (group_id, status.value),
        ).fetchone()
        return row["count"] if row else 0

    def create(self, task: Task) -> Task:
        row = self.connection.execute(
            """
            INSERT INTO travel_buddies.tasks (id, group_id, title, description, status, assigned_to, due_date, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                task.id,
                task.group_id,
                task.title,
                task.description,
                task.status.value,
                task.assigned_to,
                task.due_date,
                task.created_by,
            ),
        ).fetchone()
        return task_from_row(row)

    def update(self, task: Task) -> Task:
        row = self.connection.execute(
            """
            UPDATE travel_buddies.tasks
            SET title = %s, description = %s, status = %s, assigned_to = %s, due_date = %s, updated_at = now()
            WHERE id = %s
            RETURNING *
            """,
            (task.title, task.description, task.status.value, task.assigned_to, task.due_date, task.id),
        ).fetchone()
        return task_from_row(row)

    def delete(self, task_id: UUID) -> None:
        self.connection.execute(
            "DELETE FROM travel_buddies.tasks WHERE id = %s",
            (task_id,),
        )

    def assign(self, task_id: UUID, user_id: UUID | None) -> Task:
        row = self.connection.execute(
            """
            UPDATE travel_buddies.tasks
            SET assigned_to = %s, updated_at = now()
            WHERE id = %s
            RETURNING *
            """,
            (user_id, task_id),
        ).fetchone()
        return task_from_row(row)

    def mark_done(self, task_id: UUID) -> Task:
        row = self.connection.execute(
            """
            UPDATE travel_buddies.tasks
            SET status = %s, updated_at = now()
            WHERE id = %s
            RETURNING *
            """,
            (TaskStatus.DONE.value, task_id),
        ).fetchone()
        return task_from_row(row)

    def mark_pending(self, task_id: UUID) -> Task:
        row = self.connection.execute(
            """
            UPDATE travel_buddies.tasks
            SET status = %s, updated_at = now()
            WHERE id = %s
            RETURNING *
            """,
            (TaskStatus.PENDING.value, task_id),
        ).fetchone()
        return task_from_row(row)

    def count_pending(self, group_id: UUID) -> int:
        row = self.connection.execute(
            "SELECT COUNT(*) FROM travel_buddies.tasks WHERE group_id = %s AND status = %s",
            (group_id, TaskStatus.PENDING.value),
        ).fetchone()
        return row["count"] if row else 0

    def count_done(self, group_id: UUID) -> int:
        row = self.connection.execute(
            "SELECT COUNT(*) FROM travel_buddies.tasks WHERE group_id = %s AND status = %s",
            (group_id, TaskStatus.DONE.value),
        ).fetchone()
        return row["count"] if row else 0


class PsycopgPackingItemRepository:
    def __init__(self, connection: Connection) -> None:
        self.connection = connection

    def get_by_id(self, item_id: UUID) -> PackingItem | None:
        row = self.connection.execute(
            "SELECT * FROM travel_buddies.packing_items WHERE id = %s",
            (item_id,),
        ).fetchone()
        return packing_item_from_row(row) if row else None

    def list_by_group(self, group_id: UUID, limit: int, offset: int) -> list[PackingItem]:
        rows = self.connection.execute(
            """
            SELECT * FROM travel_buddies.packing_items
            WHERE group_id = %s
            ORDER BY created_at ASC
            LIMIT %s OFFSET %s
            """,
            (group_id, limit, offset),
        ).fetchall()
        return [packing_item_from_row(row) for row in rows]

    def count_by_group(self, group_id: UUID) -> int:
        row = self.connection.execute(
            "SELECT COUNT(*) FROM travel_buddies.packing_items WHERE group_id = %s",
            (group_id,),
        ).fetchone()
        return row["count"] if row else 0

    def list_by_category(self, group_id: UUID, category: str | None) -> list[PackingItem]:
        if category is None:
            rows = self.connection.execute(
                """
                SELECT * FROM travel_buddies.packing_items
                WHERE group_id = %s AND category IS NULL
                ORDER BY created_at ASC
                """,
                (group_id,),
            ).fetchall()
        else:
            rows = self.connection.execute(
                """
                SELECT * FROM travel_buddies.packing_items
                WHERE group_id = %s AND category = %s
                ORDER BY created_at ASC
                """,
                (group_id, category),
            ).fetchall()
        return [packing_item_from_row(row) for row in rows]

    def list_packed(self, group_id: UUID) -> list[PackingItem]:
        rows = self.connection.execute(
            """
            SELECT * FROM travel_buddies.packing_items
            WHERE group_id = %s AND is_packed = true
            ORDER BY created_at ASC
            """,
            (group_id,),
        ).fetchall()
        return [packing_item_from_row(row) for row in rows]

    def list_unpacked(self, group_id: UUID) -> list[PackingItem]:
        rows = self.connection.execute(
            """
            SELECT * FROM travel_buddies.packing_items
            WHERE group_id = %s AND is_packed = false
            ORDER BY created_at ASC
            """,
            (group_id,),
        ).fetchall()
        return [packing_item_from_row(row) for row in rows]

    def create(self, item: PackingItem) -> PackingItem:
        row = self.connection.execute(
            """
            INSERT INTO travel_buddies.packing_items (id, group_id, name, category, quantity, is_packed, added_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (item.id, item.group_id, item.name, item.category, item.quantity, item.is_packed, item.added_by),
        ).fetchone()
        return packing_item_from_row(row)

    def update(self, item: PackingItem) -> PackingItem:
        row = self.connection.execute(
            """
            UPDATE travel_buddies.packing_items
            SET name = %s, category = %s, quantity = %s
            WHERE id = %s
            RETURNING *
            """,
            (item.name, item.category, item.quantity, item.id),
        ).fetchone()
        return packing_item_from_row(row)

    def delete(self, item_id: UUID) -> None:
        self.connection.execute(
            "DELETE FROM travel_buddies.packing_items WHERE id = %s",
            (item_id,),
        )

    def mark_packed(self, item_id: UUID) -> PackingItem:
        row = self.connection.execute(
            """
            UPDATE travel_buddies.packing_items
            SET is_packed = true
            WHERE id = %s
            RETURNING *
            """,
            (item_id,),
        ).fetchone()
        return packing_item_from_row(row)

    def mark_unpacked(self, item_id: UUID) -> PackingItem:
        row = self.connection.execute(
            """
            UPDATE travel_buddies.packing_items
            SET is_packed = false
            WHERE id = %s
            RETURNING *
            """,
            (item_id,),
        ).fetchone()
        return packing_item_from_row(row)

    def categories(self, group_id: UUID) -> list[str]:
        rows = self.connection.execute(
            """
            SELECT DISTINCT category FROM travel_buddies.packing_items
            WHERE group_id = %s AND category IS NOT NULL
            ORDER BY category
            """,
            (group_id,),
        ).fetchall()
        return [row["category"] for row in rows]

    def packing_progress(self, group_id: UUID) -> tuple[int, int]:
        total_row = self.connection.execute(
            "SELECT COUNT(*) FROM travel_buddies.packing_items WHERE group_id = %s",
            (group_id,),
        ).fetchone()
        packed_row = self.connection.execute(
            "SELECT COUNT(*) FROM travel_buddies.packing_items WHERE group_id = %s AND is_packed = true",
            (group_id,),
        ).fetchone()
        total = total_row["count"] if total_row else 0
        packed = packed_row["count"] if packed_row else 0
        return total, packed