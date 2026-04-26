from uuid import UUID

from app.modules.travel_buddies.errors import ValidationError
from app.modules.travel_buddies.models import MemberRole
from app.modules.travel_buddies.repositories.protocols import GroupMemberRepository


class MemberRoleService:
    def __init__(self, members: GroupMemberRepository) -> None:
        self.members = members

    def can_manage_members(self, group_id: UUID, user_id: UUID) -> bool:
        return self.members.role_at_least(group_id, user_id, MemberRole.ADMIN)

    def can_edit_group(self, group_id: UUID, user_id: UUID) -> bool:
        return self.members.role_at_least(group_id, user_id, MemberRole.ADMIN)

    def can_create_polls(self, group_id: UUID, user_id: UUID) -> bool:
        return self.members.is_member(group_id, user_id)

    def can_create_tasks(self, group_id: UUID, user_id: UUID) -> bool:
        return self.members.is_member(group_id, user_id)

    def validate_role_change(self, new_role: str) -> MemberRole:
        try:
            role = MemberRole(new_role)
        except ValueError:
            raise ValidationError(f"Invalid role: {new_role}")
        if role == MemberRole.OWNER:
            raise ValidationError("Cannot set role to owner")
        return role