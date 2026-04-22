from uuid import UUID, uuid4

from app.modules.travel_buddies.errors import ForbiddenError, NotFoundError, ValidationError
from app.modules.travel_buddies.models import Group, GroupMember, MemberRole
from app.modules.travel_buddies.repositories.protocols import GroupRepository, GroupMemberRepository
from app.modules.travel_buddies.schemas import CreateGroupRequest, GroupResponse, GroupDetailResponse, UpdateGroupRequest


def _group_to_response(group: Group, member_count: int = 0) -> GroupResponse:
    return GroupResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        member_count=member_count,
        created_at=group.created_at.isoformat() if group.created_at else None,
    )


def _group_to_detail(group: Group, is_member: bool, is_admin: bool, is_owner: bool) -> GroupDetailResponse:
    return GroupDetailResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        created_by=group.created_by,
        created_at=group.created_at.isoformat() if group.created_at else None,
        updated_at=group.updated_at.isoformat() if group.updated_at else None,
        is_member=is_member,
        is_admin=is_admin,
        is_owner=is_owner,
    )


class GroupService:
    def __init__(self, groups: GroupRepository, members: GroupMemberRepository) -> None:
        self.groups = groups
        self.members = members

    def create(self, request: CreateGroupRequest, user_id: UUID) -> GroupResponse:
        name = request.name.strip()
        if not name:
            raise ValidationError("Group name cannot be empty")
        if self.groups.name_exists(name):
            raise ValidationError("Group with this name already exists")

        group = Group(
            id=uuid4(),
            name=name,
            description=request.description,
            created_by=user_id,
        )
        created = self.groups.create(group)

        member = GroupMember(
            id=uuid4(),
            group_id=created.id,
            user_id=user_id,
            role=MemberRole.OWNER,
        )
        self.members.create(member)

        return _group_to_response(created, member_count=1)

    def get_detail(self, group_id: UUID, user_id: UUID) -> GroupDetailResponse:
        group = self._get_group(group_id)
        is_member = self.members.is_member(group_id, user_id)
        is_admin = self.members.is_admin(group_id, user_id)
        is_owner = self.members.is_owner(group_id, user_id)
        return _group_to_detail(group, is_member, is_admin, is_owner)

    def update(self, group_id: UUID, user_id: UUID, request: UpdateGroupRequest) -> GroupResponse:
        if not self.members.is_admin(group_id, user_id):
            raise ForbiddenError("Admin role or higher required")
        group = self._get_group(group_id)

        if request.name is not None:
            name = request.name.strip()
            if not name:
                raise ValidationError("Group name cannot be empty")
            if self.groups.name_exists(name, exclude_group_id=group_id):
                raise ValidationError("Group with this name already exists")

        updated = self.groups.update(
            Group(
                id=group.id,
                name=request.name if request.name is not None else group.name,
                description=request.description if request.description is not None else group.description,
                created_by=group.created_by,
                created_at=group.created_at,
            )
        )
        return _group_to_response(updated)

    def delete(self, group_id: UUID, user_id: UUID) -> None:
        if not self.members.is_owner(group_id, user_id):
            raise ForbiddenError("Only group owner can delete the group")
        if not self.groups.get_by_id(group_id):
            raise NotFoundError("Group not found")
        self.groups.delete(group_id)

    def list_groups(self, user_id: UUID, limit: int, offset: int) -> list[GroupResponse]:
        groups = self.groups.list_for_user(user_id, limit, offset)
        return [_group_to_response(g) for g in groups]

    def search_groups(self, query: str, limit: int, offset: int) -> list[GroupResponse]:
        groups = self.groups.search(query, limit, offset)
        return [_group_to_response(g) for g in groups]

    def _get_group(self, group_id: UUID) -> Group:
        group = self.groups.get_by_id(group_id)
        if group is None:
            raise NotFoundError("Group not found")
        return group