from typing import Annotated

from fastapi import Depends
from psycopg import Connection

from app.core.database import get_connection
from app.modules.account.dependencies import get_current_user
from app.modules.account.models import User
from app.modules.travel_buddies.errors import ForbiddenError
from app.modules.travel_buddies.models import GroupMember, MemberRole
from app.modules.travel_buddies.repositories import PsycopgGroupMemberRepository


def get_current_group_member(
    user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
    group_id: str,
    required_role: MemberRole = MemberRole.MEMBER,
) -> GroupMember:
    from uuid import UUID

    group_uuid = UUID(group_id)
    members = PsycopgGroupMemberRepository(connection)
    member = members.get_by_group_and_user(group_uuid, user.id)
    if member is None:
        raise ForbiddenError("You are not a member of this group")
    if not members.role_at_least(group_uuid, user.id, required_role):
        raise ForbiddenError(f"Role {required_role.value} or higher is required")
    return member