from dataclasses import replace
from datetime import date
from uuid import UUID, uuid4

import pytest

from app.modules.travel_buddies.errors import ConflictError, ForbiddenError, NotFoundError, ValidationError
from app.modules.travel_buddies.models import (
    Group,
    GroupMember,
    MemberRole,
    Message,
    PackingItem,
    Poll,
    PollOption,
    PollStatus,
    PollVote,
    Task,
    TaskStatus,
)
from app.modules.travel_buddies.schemas import (
    AddMemberRequest,
    CreateGroupRequest,
    CreateMessageRequest,
    CreatePackingItemRequest,
    CreatePollRequest,
    CreateTaskRequest,
    InviteMemberRequest,
    TransferOwnershipRequest,
    UpdateGroupRequest,
    UpdateMemberRoleRequest,
    UpdateTaskRequest,
)
from app.modules.travel_buddies.services.group_management.group import GroupService
from app.modules.travel_buddies.services.group_management.members import GroupMembersService
from app.modules.travel_buddies.services.chat.polls import PollManagementService
from app.modules.travel_buddies.services.chat.messages import MessageService
from app.modules.travel_buddies.services.notes.todo_list import ToDoListService
from app.modules.travel_buddies.services.notes.packing_list import PackingListService


class FakeGroups:
    def __init__(self) -> None:
        self.groups: dict[UUID, Group] = {}

    def get_by_id(self, group_id: UUID) -> Group | None:
        return self.groups.get(group_id)

    def get_by_name(self, name: str) -> Group | None:
        for g in self.groups.values():
            if g.name == name:
                return g
        return None

    def create(self, group: Group) -> Group:
        self.groups[group.id] = group
        return group

    def update(self, group: Group) -> Group:
        self.groups[group.id] = group
        return group

    def delete(self, group_id: UUID) -> None:
        if group_id in self.groups:
            del self.groups[group_id]

    def list_for_user(self, user_id: UUID, limit: int, offset: int) -> list[Group]:
        return list(self.groups.values())[offset : offset + limit]

    def count_for_user(self, user_id: UUID) -> int:
        return len(self.groups)

    def search(self, query: str, limit: int, offset: int) -> list[Group]:
        return list(self.groups.values())[offset : offset + limit]

    def count_search(self, query: str) -> int:
        return len(self.groups)

    def is_member(self, group_id: UUID, user_id: UUID) -> bool:
        return True

    def is_owner(self, group_id: UUID, user_id: UUID) -> bool:
        return True

    def name_exists(self, name: str, exclude_group_id: UUID | None = None) -> bool:
        existing = self.get_by_name(name)
        if existing and exclude_group_id and existing.id == exclude_group_id:
            return False
        return existing is not None

    def get_member_count(self, group_id: UUID) -> int:
        return 1


class FakeMembers:
    def __init__(self) -> None:
        self.members: dict[tuple[UUID, UUID], GroupMember] = {}

    def get_by_id(self, member_id: UUID) -> GroupMember | None:
        for m in self.members.values():
            if m.id == member_id:
                return m
        return None

    def get_by_group_and_user(self, group_id: UUID, user_id: UUID) -> GroupMember | None:
        return self.members.get((group_id, user_id))

    def list_by_group(self, group_id: UUID, limit: int, offset: int) -> list[GroupMember]:
        return [m for m in self.members.values() if m.group_id == group_id][offset : offset + limit]

    def count_by_group(self, group_id: UUID) -> int:
        return sum(1 for m in self.members.values() if m.group_id == group_id)

    def create(self, member: GroupMember) -> GroupMember:
        self.members[(member.group_id, member.user_id)] = member
        return member

    def update(self, member: GroupMember) -> GroupMember:
        self.members[(member.group_id, member.user_id)] = member
        return member

    def delete(self, member_id: UUID) -> None:
        key = None
        for k, m in self.members.items():
            if m.id == member_id:
                key = k
                break
        if key:
            del self.members[key]

    def delete_by_group_and_user(self, group_id: UUID, user_id: UUID) -> None:
        self.members.pop((group_id, user_id), None)

    def list_by_user(self, user_id: UUID) -> list[GroupMember]:
        return [m for m in self.members.values() if m.user_id == user_id]

    def count_admins(self, group_id: UUID) -> int:
        return sum(
            1
            for m in self.members.values()
            if m.group_id == group_id and m.role in (MemberRole.ADMIN, MemberRole.OWNER)
        )

    def role_at_least(self, group_id: UUID, user_id: UUID, required_role: MemberRole) -> bool:
        return True

    def is_owner(self, group_id: UUID, user_id: UUID) -> bool:
        member = self.get_by_group_and_user(group_id, user_id)
        return member is not None and member.role == MemberRole.OWNER

    def is_admin(self, group_id: UUID, user_id: UUID) -> bool:
        member = self.get_by_group_and_user(group_id, user_id)
        return member is not None and member.role in (MemberRole.OWNER, MemberRole.ADMIN)

    def is_member(self, group_id: UUID, user_id: UUID) -> bool:
        return self.get_by_group_and_user(group_id, user_id) is not None


class FakePolls:
    def __init__(self) -> None:
        self.polls: dict[UUID, Poll] = {}

    def get_by_id(self, poll_id: UUID) -> Poll | None:
        return self.polls.get(poll_id)

    def list_by_group(self, group_id: UUID, limit: int, offset: int) -> list[Poll]:
        return [p for p in self.polls.values() if p.group_id == group_id][offset : offset + limit]

    def count_by_group(self, group_id: UUID) -> int:
        return sum(1 for p in self.polls.values() if p.group_id == group_id)

    def create(self, poll: Poll) -> Poll:
        self.polls[poll.id] = poll
        return poll

    def update(self, poll: Poll) -> Poll:
        self.polls[poll.id] = poll
        return poll

    def delete(self, poll_id: UUID) -> None:
        self.polls.pop(poll_id, None)

    def close(self, poll_id: UUID) -> Poll:
        poll = self.polls[poll_id]
        return replace(poll, status=PollStatus.CLOSED)

    def list_open(self, group_id: UUID) -> list[Poll]:
        return [p for p in self.polls.values() if p.group_id == group_id and p.status == PollStatus.OPEN]


class FakePollOptions:
    def __init__(self) -> None:
        self.options: dict[UUID, PollOption] = {}

    def get_by_id(self, option_id: UUID) -> PollOption | None:
        return self.options.get(option_id)

    def list_by_poll(self, poll_id: UUID) -> list[PollOption]:
        return [o for o in self.options.values() if o.poll_id == poll_id]

    def create(self, option: PollOption) -> PollOption:
        self.options[option.id] = option
        return option

    def update(self, option: PollOption) -> PollOption:
        self.options[option.id] = option
        return option

    def delete(self, option_id: UUID) -> None:
        self.options.pop(option_id, None)

    def count_votes(self, option_id: UUID) -> int:
        return 0

    def bulk_create(self, options: list[PollOption]) -> list[PollOption]:
        for opt in options:
            self.options[opt.id] = opt
        return options

    def get_top_option(self, poll_id: UUID) -> PollOption | None:
        return None

    def reorder(self, poll_id: UUID, option_ids: list[UUID]) -> None:
        pass


class FakePollVotes:
    def __init__(self) -> None:
        self.votes: dict[UUID, PollVote] = {}

    def get_by_id(self, vote_id: UUID) -> PollVote | None:
        return self.votes.get(vote_id)

    def get_by_poll_and_user(self, poll_id: UUID, user_id: UUID) -> PollVote | None:
        for v in self.votes.values():
            if v.poll_id == poll_id and v.user_id == user_id:
                return v
        return None

    def list_by_poll(self, poll_id: UUID) -> list[PollVote]:
        return [v for v in self.votes.values() if v.poll_id == poll_id]

    def create(self, vote: PollVote) -> PollVote:
        self.votes[vote.id] = vote
        return vote

    def delete(self, vote_id: UUID) -> None:
        self.votes.pop(vote_id, None)

    def delete_by_poll_and_user(self, poll_id: UUID, user_id: UUID) -> None:
        key = None
        for k, v in self.votes.items():
            if v.poll_id == poll_id and v.user_id == user_id:
                key = k
                break
        if key:
            del self.votes[key]

    def has_voted(self, poll_id: UUID, user_id: UUID) -> bool:
        return self.get_by_poll_and_user(poll_id, user_id) is not None

    def vote_count(self, poll_id: UUID) -> int:
        return sum(1 for v in self.votes.values() if v.poll_id == poll_id)

    def get_results(self, poll_id: UUID) -> dict[UUID, int]:
        results: dict[UUID, int] = {}
        for v in self.votes.values():
            if v.poll_id == poll_id:
                results[v.option_id] = results.get(v.option_id, 0) + 1
        return results


class FakeMessages:
    def __init__(self) -> None:
        self.messages: dict[UUID, Message] = {}
        self.reactions: dict[tuple[UUID, UUID, str], bool] = {}

    def get_by_id(self, message_id: UUID) -> Message | None:
        return self.messages.get(message_id)

    def list_by_group(self, group_id: UUID, limit: int, offset: int) -> list[Message]:
        return [m for m in self.messages.values() if m.group_id == group_id][offset : offset + limit]

    def count_by_group(self, group_id: UUID) -> int:
        return sum(1 for m in self.messages.values() if m.group_id == group_id)

    def create(self, message: Message) -> Message:
        self.messages[message.id] = message
        return message

    def delete(self, message_id: UUID) -> None:
        self.messages.pop(message_id, None)

    def add_reaction(self, message_id: UUID, user_id: UUID, emoji: str) -> None:
        self.reactions[(message_id, user_id, emoji)] = True

    def remove_reaction(self, message_id: UUID, user_id: UUID, emoji: str) -> None:
        self.reactions.pop((message_id, user_id, emoji), None)

    def get_reactions(self, message_id: UUID) -> dict[str, list[UUID]]:
        result: dict[str, list[UUID]] = {}
        for (mid, uid, emoji), _ in self.reactions.items():
            if mid == message_id:
                if emoji not in result:
                    result[emoji] = []
                result[emoji].append(uid)
        return result


class FakeTasks:
    def __init__(self) -> None:
        self.tasks: dict[UUID, Task] = {}

    def get_by_id(self, task_id: UUID) -> Task | None:
        return self.tasks.get(task_id)

    def list_by_group(self, group_id: UUID, limit: int, offset: int) -> list[Task]:
        return [t for t in self.tasks.values() if t.group_id == group_id][offset : offset + limit]

    def count_by_group(self, group_id: UUID) -> int:
        return sum(1 for t in self.tasks.values() if t.group_id == group_id)

    def list_by_status(self, group_id: UUID, status: TaskStatus, limit: int, offset: int) -> list[Task]:
        return [t for t in self.tasks.values() if t.group_id == group_id and t.status == status][
            offset : offset + limit
        ]

    def count_by_status(self, group_id: UUID, status: TaskStatus) -> int:
        return sum(1 for t in self.tasks.values() if t.group_id == group_id and t.status == status)

    def create(self, task: Task) -> Task:
        self.tasks[task.id] = task
        return task

    def update(self, task: Task) -> Task:
        self.tasks[task.id] = task
        return task

    def delete(self, task_id: UUID) -> None:
        self.tasks.pop(task_id, None)

    def assign(self, task_id: UUID, user_id: UUID | None) -> Task:
        task = self.tasks[task_id]
        return replace(task, assigned_to=user_id)

    def mark_done(self, task_id: UUID) -> Task:
        task = self.tasks[task_id]
        return replace(task, status=TaskStatus.DONE)

    def mark_pending(self, task_id: UUID) -> Task:
        task = self.tasks[task_id]
        return replace(task, status=TaskStatus.PENDING)

    def count_pending(self, group_id: UUID) -> int:
        return sum(1 for t in self.tasks.values() if t.group_id == group_id and t.status == TaskStatus.PENDING)

    def count_done(self, group_id: UUID) -> int:
        return sum(1 for t in self.tasks.values() if t.group_id == group_id and t.status == TaskStatus.DONE)


class FakePackingItems:
    def __init__(self) -> None:
        self.items: dict[UUID, PackingItem] = {}

    def get_by_id(self, item_id: UUID) -> PackingItem | None:
        return self.items.get(item_id)

    def list_by_group(self, group_id: UUID, limit: int, offset: int) -> list[PackingItem]:
        return [i for i in self.items.values() if i.group_id == group_id][offset : offset + limit]

    def count_by_group(self, group_id: UUID) -> int:
        return sum(1 for i in self.items.values() if i.group_id == group_id)

    def list_by_category(self, group_id: UUID, category: str | None) -> list[PackingItem]:
        return [i for i in self.items.values() if i.group_id == group_id and i.category == category]

    def list_packed(self, group_id: UUID) -> list[PackingItem]:
        return [i for i in self.items.values() if i.group_id == group_id and i.is_packed]

    def list_unpacked(self, group_id: UUID) -> list[PackingItem]:
        return [i for i in self.items.values() if i.group_id == group_id and not i.is_packed]

    def create(self, item: PackingItem) -> PackingItem:
        self.items[item.id] = item
        return item

    def update(self, item: PackingItem) -> PackingItem:
        self.items[item.id] = item
        return item

    def delete(self, item_id: UUID) -> None:
        self.items.pop(item_id, None)

    def mark_packed(self, item_id: UUID) -> PackingItem:
        item = self.items[item_id]
        return replace(item, is_packed=True)

    def mark_unpacked(self, item_id: UUID) -> PackingItem:
        item = self.items[item_id]
        return replace(item, is_packed=False)

    def categories(self, group_id: UUID) -> list[str]:
        return list({i.category for i in self.items.values() if i.group_id == group_id and i.category})

    def packing_progress(self, group_id: UUID) -> tuple[int, int]:
        items = [i for i in self.items.values() if i.group_id == group_id]
        total = len(items)
        packed = sum(1 for i in items if i.is_packed)
        return total, packed


class FakeUsers:
    def __init__(self) -> None:
        self.users: dict[UUID, FakeUser] = {}

    def get_by_id(self, user_id: UUID) -> "FakeUser | None":
        return self.users.get(user_id)

    def get_by_email(self, email: str) -> "FakeUser | None":
        for u in self.users.values():
            if u.email.lower() == email.lower():
                return u
        return None

    def create(self, user: "FakeUser") -> "FakeUser":
        self.users[user.id] = user
        return user


class FakeUser:
    def __init__(self, id: UUID, email: str) -> None:
        self.id = id
        self.email = email


def _make_group(
    name: str = "Test Group",
    created_by: UUID | None = None,
    description: str | None = None,
) -> Group:
    return Group(
        id=uuid4(),
        name=name,
        description=description,
        created_by=created_by or uuid4(),
    )


def _make_member(
    group_id: UUID,
    user_id: UUID | None = None,
    role: MemberRole = MemberRole.MEMBER,
) -> GroupMember:
    return GroupMember(
        id=uuid4(),
        group_id=group_id,
        user_id=user_id or uuid4(),
        role=role,
    )


def test_group_service_creates_group_and_adds_owner_as_member() -> None:
    groups = FakeGroups()
    members = FakeMembers()
    service = GroupService(groups, members)

    user_id = uuid4()
    group = service.create(CreateGroupRequest(name="My Trip Group", description="Summer trip 2025"), user_id)

    assert group.name == "My Trip Group"
    assert group.member_count == 1
    assert members.get_by_group_and_user(group.id, user_id) is not None


def test_group_service_rejects_duplicate_name() -> None:
    groups = FakeGroups()
    members = FakeMembers()
    groups.create(_make_group("Duplicate Name"))
    service = GroupService(groups, members)

    with pytest.raises(ValidationError):
        service.create(CreateGroupRequest(name="Duplicate Name"), uuid4())


def test_group_service_rejects_empty_name() -> None:
    groups = FakeGroups()
    members = FakeMembers()
    service = GroupService(groups, members)

    with pytest.raises(ValidationError):
        service.create(CreateGroupRequest(name="   "), uuid4())


def test_group_members_service_adds_member() -> None:
    groups = FakeGroups()
    members = FakeMembers()
    group = _make_group()
    groups.create(group)
    admin_user_id = uuid4()
    members.create(_make_member(group.id, admin_user_id, MemberRole.ADMIN))
    service = GroupMembersService(members)

    new_user = uuid4()
    result = service.add_member(
        group.id,
        admin_user_id,
        AddMemberRequest(user_id=new_user),
    )

    assert result.role == MemberRole.MEMBER.value


def test_group_members_service_prevents_removing_owner() -> None:
    groups = FakeGroups()
    members = FakeMembers()
    group = _make_group()
    owner_id = uuid4()
    groups.create(group)
    owner = _make_member(group.id, owner_id, MemberRole.OWNER)
    members.create(owner)
    service = GroupMembersService(members)

    with pytest.raises(ValidationError):
        service.remove_member(group.id, owner_id, uuid4())


def test_group_members_service_transfer_ownership() -> None:
    groups = FakeGroups()
    members = FakeMembers()
    group = _make_group()
    current_owner_id = uuid4()
    new_owner_id = uuid4()
    groups.create(group)
    current_owner = _make_member(group.id, current_owner_id, MemberRole.OWNER)
    new_owner = _make_member(group.id, new_owner_id, MemberRole.MEMBER)
    members.create(current_owner)
    members.create(new_owner)
    service = GroupMembersService(members)

    result = service.transfer_ownership(group.id, new_owner_id, current_owner_id)

    assert result.role == MemberRole.OWNER.value
    updated_current = members.get_by_group_and_user(group.id, current_owner_id)
    assert updated_current is not None and updated_current.role == MemberRole.ADMIN


def test_group_members_service_only_owner_can_transfer() -> None:
    groups = FakeGroups()
    members = FakeMembers()
    group = _make_group()
    owner_id = uuid4()
    member_id = uuid4()
    groups.create(group)
    members.create(_make_member(group.id, owner_id, MemberRole.OWNER))
    members.create(_make_member(group.id, member_id, MemberRole.MEMBER))
    service = GroupMembersService(members)

    with pytest.raises(ForbiddenError):
        service.transfer_ownership(group.id, owner_id, member_id)


def test_group_members_service_add_member_by_email() -> None:
    groups = FakeGroups()
    members = FakeMembers()
    users_repo = FakeUsers()
    group = _make_group()
    requester_id = uuid4()
    new_user_id = uuid4()
    users_repo.create(FakeUser(id=new_user_id, email="newuser@example.com"))
    groups.create(group)
    members.create(_make_member(group.id, requester_id, MemberRole.ADMIN))
    service = GroupMembersService(members)

    result = service.add_member_by_email(
        group.id, requester_id, "newuser@example.com", users_repo
    )

    assert result.role == MemberRole.MEMBER.value


def test_poll_service_creates_poll_with_options() -> None:
    polls = FakePolls()
    poll_options = FakePollOptions()
    service = PollManagementService(polls, poll_options)

    group_id = uuid4()
    user_id = uuid4()
    poll = service.create_poll(
        group_id,
        user_id,
        CreatePollRequest(question="Where to go?", options=["Paris", "Berlin"]),
    )

    assert poll.question == "Where to go?"
    assert poll.status == PollStatus.OPEN.value


def test_poll_service_rejects_single_option() -> None:
    polls = FakePolls()
    poll_options = FakePollOptions()
    service = PollManagementService(polls, poll_options)

    try:
        service.create_poll(uuid4(), uuid4(), CreatePollRequest(question="Pick one", options=["Only"]))
        assert False, "Should have raised ValidationError"
    except (ValidationError, Exception) as e:
        assert "options" in str(e).lower() or "too_short" in str(e).lower()


def test_message_service_sends_message() -> None:
    messages = FakeMessages()
    service = MessageService(messages)

    group_id = uuid4()
    user_id = uuid4()
    result = service.send_message(group_id, user_id, CreateMessageRequest(content="Hello, group!"))

    assert result.content == "Hello, group!"
    assert result.group_id == group_id


def test_message_service_rejects_empty_message() -> None:
    messages = FakeMessages()
    service = MessageService(messages)

    with pytest.raises(ValidationError):
        service.send_message(uuid4(), uuid4(), CreateMessageRequest(content="   "))


def test_message_service_adds_reaction() -> None:
    messages = FakeMessages()
    service = MessageService(messages)

    group_id = uuid4()
    user_id = uuid4()
    msg = service.send_message(group_id, user_id, CreateMessageRequest(content="Test"))

    service.add_reaction(msg.id, user_id, "👍")

    reactions = messages.get_reactions(msg.id)
    assert "👍" in reactions


def test_todo_list_service_creates_task() -> None:
    tasks = FakeTasks()
    service = ToDoListService(tasks)

    group_id = uuid4()
    user_id = uuid4()
    task = service.create_task(
        group_id,
        user_id,
        CreateTaskRequest(title="Book hotel", due_date=date(2025, 6, 1)),
    )

    assert task.title == "Book hotel"
    assert task.status == TaskStatus.PENDING.value


def test_todo_list_service_marks_task_done() -> None:
    tasks = FakeTasks()
    task_id = uuid4()
    task = Task(
        id=task_id,
        group_id=uuid4(),
        title="Book hotel",
        description=None,
        status=TaskStatus.PENDING,
        assigned_to=None,
        due_date=None,
        created_by=uuid4(),
    )
    tasks.create(task)
    service = ToDoListService(tasks)

    result = service.mark_done(task_id, uuid4())
    assert result.status == TaskStatus.DONE.value


def test_todo_list_service_rejects_empty_title() -> None:
    tasks = FakeTasks()
    service = ToDoListService(tasks)

    with pytest.raises(ValidationError):
        service.create_task(uuid4(), uuid4(), CreateTaskRequest(title="   "))


def test_packing_list_service_creates_item() -> None:
    packing = FakePackingItems()
    service = PackingListService(packing)

    group_id = uuid4()
    user_id = uuid4()
    item = service.add_item(
        group_id,
        user_id,
        CreatePackingItemRequest(name="Passport", category="Documents", quantity=1),
    )

    assert item.name == "Passport"
    assert item.category == "Documents"
    assert item.is_packed is False


def test_packing_list_service_calculates_progress() -> None:
    packing = FakePackingItems()
    group_id = uuid4()
    user_id = uuid4()
    item1 = PackingItem(
        id=uuid4(), group_id=group_id, name="Passport", category="Documents",
        quantity=1, is_packed=False, added_by=user_id,
    )
    item2 = PackingItem(
        id=uuid4(), group_id=group_id, name="Sunglasses", category="Accessories",
        quantity=1, is_packed=True, added_by=user_id,
    )
    packing.items[item1.id] = item1
    packing.items[item2.id] = item2
    service = PackingListService(packing)

    progress = service.get_progress(group_id)
    assert progress.total == 2
    assert progress.packed == 1
    assert progress.unpacked == 1


def test_packing_list_service_marks_item_packed() -> None:
    packing = FakePackingItems()
    item_id = uuid4()
    item = PackingItem(
        id=item_id,
        group_id=uuid4(),
        name="Passport",
        category="Documents",
        quantity=1,
        is_packed=False,
        added_by=uuid4(),
    )
    packing.items[item_id] = item
    service = PackingListService(packing)

    result = service.mark_packed(item_id, uuid4())
    assert result.is_packed is True


def test_packing_list_service_rejects_empty_name() -> None:
    packing = FakePackingItems()
    service = PackingListService(packing)

    with pytest.raises(ValidationError):
        service.add_item(uuid4(), uuid4(), CreatePackingItemRequest(name="   "))