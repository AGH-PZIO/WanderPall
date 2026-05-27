from __future__ import annotations
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from app.modules.travel_buddies.errors import ConflictError, ForbiddenError, NotFoundError, ValidationError
from app.modules.travel_buddies.models import GroupMember, MemberRole
from app.modules.travel_buddies.repositories.protocols import GroupMemberRepository
from app.modules.travel_buddies.schemas import AddMemberRequest, GroupMemberResponse, UpdateMemberRoleRequest, MemberListResponse

if TYPE_CHECKING:
    from app.modules.account.repositories.protocols import UserRepository


ALLOWED_ROLES = {MemberRole.OWNER.value, MemberRole.ADMIN.value, MemberRole.MEMBER.value}


def _member_to_response(member: GroupMember, nickname: str | None = None, first_name: str | None = None, last_name: str | None = None) -> GroupMemberResponse:
    return GroupMemberResponse(
        id=member.id,
        group_id=member.group_id,
        user_id=member.user_id,
        role=member.role.value,
        nickname=nickname,
        joined_at=member.joined_at.isoformat() if member.joined_at else None,
        first_name=first_name,
        last_name=last_name,
    )


class GroupMembersService:
    def __init__(self, members: GroupMemberRepository) -> None:
        self.members = members

    def list_members(self, group_id: UUID, limit: int, offset: int) -> MemberListResponse:
        group_members = self.members.list_by_group(group_id, limit, offset)
        total = self.members.count_by_group(group_id)
        return MemberListResponse(
            items=[_member_to_response(m) for m in group_members],
            total=total,
        )

    def list_members_with_users(self, group_id: UUID, limit: int, offset: int, user_repo: "UserRepository") -> MemberListResponse:
        group_members = self.members.list_by_group(group_id, limit, offset)
        total = self.members.count_by_group(group_id)
        items = []
        for m in group_members:
            user = user_repo.get_by_id(m.user_id)
            items.append(_member_to_response(m, first_name=user.first_name if user else None, last_name=user.last_name if user else None))
        return MemberListResponse(items=items, total=total)

    def add_member(self, group_id: UUID, requester_id: UUID, request: AddMemberRequest) -> GroupMemberResponse:
        if not self.members.is_admin(group_id, requester_id):
            raise ForbiddenError("Wymagana rola administratora lub wyższa")
        if self.members.get_by_group_and_user(group_id, request.user_id):
            raise ConflictError("Użytkownik jest już członkiem tej grupy")

        member = GroupMember(
            id=uuid4(),
            group_id=group_id,
            user_id=request.user_id,
            role=MemberRole.MEMBER,
        )
        created = self.members.create(member)
        return _member_to_response(created)

    def add_member_by_email(
        self,
        group_id: UUID,
        requester_id: UUID,
        email: str,
        user_repo: "UserRepository | None" = None,
    ) -> GroupMemberResponse:
        if not self.members.is_admin(group_id, requester_id):
            raise ForbiddenError("Wymagana rola administratora lub wyższa")
        if user_repo is None:
            raise ValidationError("Repozytorium użytkowników niedostępne")
        user = user_repo.get_by_email(email)
        if user is None:
            raise NotFoundError(f"Użytkownik z adresem e-mail '{email}' nie istnieje")
        if self.members.get_by_group_and_user(group_id, user.id):
            raise ConflictError("Użytkownik jest już członkiem tej grupy")
        member = GroupMember(
            id=uuid4(),
            group_id=group_id,
            user_id=user.id,
            role=MemberRole.MEMBER,
        )
        created = self.members.create(member)
        return _member_to_response(created)

    def update_role(self, group_id: UUID, user_id: UUID, requester_id: UUID, request: UpdateMemberRoleRequest) -> GroupMemberResponse:
        if not self.members.is_admin(group_id, requester_id):
            raise ForbiddenError("Wymagana rola administratora lub wyższa")
        target = self._get_member(group_id, user_id)
        if target.role == MemberRole.OWNER:
            raise ValidationError("Nie można zmienić roli właściciela grupy")

        try:
            new_role = MemberRole(request.role)
        except ValueError:
            raise ValidationError(f"Nieprawidłowa rola: {request.role!r}")
        if new_role == MemberRole.OWNER:
            raise ValidationError("Nie można awansować na właściciela")
        updated = self.members.update(
            GroupMember(
                id=target.id,
                group_id=target.group_id,
                user_id=target.user_id,
                role=new_role,
                joined_at=target.joined_at,
            )
        )
        return _member_to_response(updated)

    def remove_member(self, group_id: UUID, user_id: UUID, requester_id: UUID) -> None:
        target = self._get_member(group_id, user_id)
        if target.role == MemberRole.OWNER:
            raise ValidationError("Nie można usunąć właściciela grupy")
        if target.user_id != requester_id and not self.members.is_admin(group_id, requester_id):
            raise ForbiddenError("Wymagana rola administratora lub wyższa")
        self.members.delete_by_group_and_user(group_id, user_id)

    def leave(self, group_id: UUID, user_id: UUID) -> None:
        member = self._get_member(group_id, user_id)
        if member.role == MemberRole.OWNER:
            raise ValidationError("Właściciel grupy nie może jej opuścić. Przekaż własność lub usuń grupę.")
        self.members.delete_by_group_and_user(group_id, user_id)

    def transfer_ownership(self, group_id: UUID, new_owner_id: UUID, current_owner_id: UUID) -> GroupMemberResponse:
        current = self._get_member(group_id, current_owner_id)
        if current.role != MemberRole.OWNER:
            raise ForbiddenError("Tylko aktualny właściciel może przekazać własność grupy")

        new_member = self._get_member(group_id, new_owner_id)
        if new_member.role == MemberRole.OWNER:
            raise ValidationError("Użytkownik jest już właścicielem grupy")

        old_updated = self.members.update(
            GroupMember(
                id=current.id,
                group_id=current.group_id,
                user_id=current.user_id,
                role=MemberRole.ADMIN,
                joined_at=current.joined_at,
            )
        )
        new_updated = self.members.update(
            GroupMember(
                id=new_member.id,
                group_id=new_member.group_id,
                user_id=new_member.user_id,
                role=MemberRole.OWNER,
                joined_at=new_member.joined_at,
            )
        )
        return _member_to_response(new_updated)

    def _get_member(self, group_id: UUID, user_id: UUID) -> GroupMember:
        member = self.members.get_by_group_and_user(group_id, user_id)
        if member is None:
            raise NotFoundError("Członek nie został znaleziony w tej grupie")
        return member