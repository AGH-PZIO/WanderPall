from datetime import date, datetime
from typing import Annotated, Protocol
from uuid import UUID

from fastapi import APIRouter, Depends, File, Response, UploadFile, status
from fastapi.responses import FileResponse
from psycopg import Connection

from app.core.database import get_connection
from app.utils.file_storage.storage import save_file_with_uuid
from app.modules.travel_buddies.errors import ValidationError
from app.modules.account.dependencies import get_current_user
from app.modules.account.models import User
from app.modules.travel_buddies.dependencies import get_current_group_member
from app.modules.travel_buddies.models import GroupMember, MemberRole
from app.modules.travel_buddies.repositories import (
    PsycopgGroupRepository,
    PsycopgGroupMemberRepository,
    PsycopgPollRepository,
    PsycopgPollOptionRepository,
    PsycopgPollVoteRepository,
    PsycopgMessageRepository,
    PsycopgAttachmentRepository,
    PsycopgTaskRepository,
    PsycopgPackingItemRepository,
)
from app.modules.travel_buddies.schemas import (
    CreateGroupRequest,
    UpdateGroupRequest,
    GroupResponse,
    GroupDetailResponse,
    GroupMemberResponse,
    AddMemberRequest,
    InviteMemberRequest,
    UpdateMemberRoleRequest,
    RemoveMemberRequest,
    TransferOwnershipRequest,
    CreatePollRequest,
    AddPollOptionRequest,
    PollResponse,
    PollDetailResponse,
    PollOptionResponse,
    VoteRequest,
CreateMessageRequest,
    MessageResponse,
    MessageDetailResponse,
    MessageDetailWithCountsResponse,
    AttachmentResponse,
    MessageListResponse,
    CreateTaskRequest,
    UpdateTaskRequest,
    TaskResponse,
    CreatePackingItemRequest,
    UpdatePackingItemRequest,
    PackingItemResponse,
    PackingProgressResponse,
    GroupListResponse,
    MemberListResponse,
    PollListResponse,
    MessageListResponse,
    TaskListResponse,
    PackingItemListResponse,
    group_to_response,
)

router = APIRouter(prefix="/travel-buddies", tags=["module-3-travel-buddies"])


def _repositories(connection: Connection):
    groups = PsycopgGroupRepository(connection)
    members = PsycopgGroupMemberRepository(connection)
    polls = PsycopgPollRepository(connection)
    poll_options = PsycopgPollOptionRepository(connection)
    poll_votes = PsycopgPollVoteRepository(connection)
    messages = PsycopgMessageRepository(connection)
    attachments = PsycopgAttachmentRepository(connection)
    tasks = PsycopgTaskRepository(connection)
    packing_items = PsycopgPackingItemRepository(connection)
    return groups, members, polls, poll_options, poll_votes, messages, attachments, tasks, packing_items


@router.get("/status")
def travel_buddies_status() -> dict[str, str]:
    return {"module": "travel_buddies", "status": "ok"}


@router.get("/groups", response_model=GroupListResponse)
def list_groups(
    limit: int = 20,
    offset: int = 0,
    search: str | None = None,
    current_user: Annotated[User, Depends(get_current_user)] = None,
    connection: Annotated[Connection, Depends(get_connection)] = None,
) -> GroupListResponse:
    groups_repo, members_repo = _repositories(connection)[:2]
    if search:
        items = groups_repo.search(search, limit, offset)
        total = groups_repo.count_search(search)
    else:
        items = groups_repo.list_for_user(current_user.id, limit, offset)
        total = groups_repo.count_for_user(current_user.id)
    return GroupListResponse(
        items=[group_to_response(g) for g in items],
        total=total,
    )


@router.post("/groups", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
def create_group(
    request: CreateGroupRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> GroupResponse:
    from app.modules.travel_buddies.services.group_management import GroupService

    groups, members = _repositories(connection)[:2]
    service = GroupService(groups, members)
    return service.create(request, current_user.id)


@router.get("/groups/{group_id}", response_model=GroupDetailResponse)
def get_group(
    group_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> GroupDetailResponse:
    from app.modules.travel_buddies.services.group_management import GroupService

    groups, members = _repositories(connection)[:2]
    service = GroupService(groups, members)
    return service.get_detail(group_id, current_user.id)


@router.patch("/groups/{group_id}", response_model=GroupResponse)
def update_group(
    group_id: UUID,
    request: UpdateGroupRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> GroupResponse:
    from app.modules.travel_buddies.services.group_management import GroupService

    groups, members = _repositories(connection)[:2]
    service = GroupService(groups, members)
    return service.update(group_id, current_user.id, request)


@router.delete("/groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(
    group_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> Response:
    from app.modules.travel_buddies.services.group_management import GroupService

    groups, members = _repositories(connection)[:2]
    service = GroupService(groups, members)
    service.delete(group_id, current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/groups/{group_id}/members", response_model=MemberListResponse)
def list_group_members(
    group_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
    limit: int = 50,
    offset: int = 0,
) -> MemberListResponse:
    from app.modules.travel_buddies.services.group_management import GroupMembersService
    from app.modules.account.repositories import PsycopgUserRepository

    members = _repositories(connection)[1]
    user_repo = PsycopgUserRepository(connection)
    service = GroupMembersService(members)
    return service.list_members_with_users(group_id, limit, offset, user_repo)


@router.post("/groups/{group_id}/members", response_model=GroupMemberResponse, status_code=status.HTTP_201_CREATED)
def add_member(
    group_id: UUID,
    request: AddMemberRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> GroupMemberResponse:
    from app.modules.travel_buddies.services.group_management import GroupMembersService

    members = _repositories(connection)[1]
    service = GroupMembersService(members)
    return service.add_member(group_id, current_user.id, request)


@router.patch("/groups/{group_id}/members/{user_id}", response_model=GroupMemberResponse)
def update_member_role(
    group_id: UUID,
    user_id: UUID,
    request: UpdateMemberRoleRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> GroupMemberResponse:
    from app.modules.travel_buddies.services.group_management import GroupMembersService

    members = _repositories(connection)[1]
    service = GroupMembersService(members)
    return service.update_role(group_id, user_id, current_user.id, request)


@router.delete("/groups/{group_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    group_id: UUID,
    user_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> Response:
    from app.modules.travel_buddies.services.group_management import GroupMembersService

    members = _repositories(connection)[1]
    service = GroupMembersService(members)
    service.remove_member(group_id, user_id, current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/groups/{group_id}/invite",
    response_model=GroupMemberResponse,
    status_code=status.HTTP_201_CREATED,
)
def invite_member_by_email(
    group_id: UUID,
    request: InviteMemberRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> GroupMemberResponse:
    from app.modules.travel_buddies.services.group_management import GroupMembersService
    from app.modules.account.repositories import PsycopgUserRepository

    members = _repositories(connection)[1]
    user_repo = PsycopgUserRepository(connection)
    service = GroupMembersService(members)
    return service.add_member_by_email(group_id, current_user.id, request.email, user_repo)


@router.delete("/groups/{group_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
def leave_group(
    group_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> Response:
    from app.modules.travel_buddies.services.group_management import GroupMembersService

    members = _repositories(connection)[1]
    service = GroupMembersService(members)
    service.leave(group_id, current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/groups/{group_id}/transfer-ownership",
    response_model=GroupMemberResponse,
    status_code=status.HTTP_200_OK,
)
def transfer_group_ownership(
    group_id: UUID,
    request: TransferOwnershipRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> GroupMemberResponse:
    from app.modules.travel_buddies.services.group_management import GroupMembersService

    members = _repositories(connection)[1]
    service = GroupMembersService(members)
    return service.transfer_ownership(group_id, request.new_owner_id, current_user.id)


@router.get("/groups/{group_id}/polls", response_model=PollListResponse)
def list_polls(
    group_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
    limit: int = 20,
    offset: int = 0,
) -> PollListResponse:
    from app.modules.travel_buddies.services.chat import PollManagementService

    polls_repo = _repositories(connection)[2]
    service = PollManagementService(polls_repo)
    return service.list_polls(group_id, limit, offset)


@router.post("/groups/{group_id}/polls", response_model=PollResponse, status_code=status.HTTP_201_CREATED)
def create_poll(
    group_id: UUID,
    request: CreatePollRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> PollResponse:
    from app.modules.travel_buddies.services.chat import PollManagementService

    polls_repo, poll_options_repo = _repositories(connection)[2:4]
    service = PollManagementService(polls_repo, poll_options_repo)
    return service.create_poll(group_id, current_user.id, request)


@router.get("/groups/{group_id}/polls/{poll_id}", response_model=PollDetailResponse)
def get_poll(
    group_id: UUID,
    poll_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> PollDetailResponse:
    from app.modules.travel_buddies.services.chat import PollManagementService

    polls_repo, poll_options_repo, poll_votes_repo = _repositories(connection)[2:5]
    service = PollManagementService(polls_repo, poll_options_repo, poll_votes_repo)
    return service.get_poll_detail(poll_id, current_user.id)


@router.post("/groups/{group_id}/polls/{poll_id}/options", response_model=PollOptionResponse, status_code=status.HTTP_201_CREATED)
def add_poll_option(
    group_id: UUID,
    poll_id: UUID,
    request: AddPollOptionRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> PollOptionResponse:
    from app.modules.travel_buddies.services.chat import PollManagementService

    polls_repo, poll_options_repo = _repositories(connection)[2:4]
    service = PollManagementService(polls_repo, poll_options_repo)
    return service.add_option(poll_id, current_user.id, request)


@router.post("/groups/{group_id}/polls/{poll_id}/vote", response_model=PollDetailResponse)
def vote_poll(
    group_id: UUID,
    poll_id: UUID,
    request: VoteRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> PollDetailResponse:
    from app.modules.travel_buddies.services.chat import PollManagementService

    polls_repo, poll_options_repo, poll_votes_repo = _repositories(connection)[2:5]
    service = PollManagementService(polls_repo, poll_options_repo, poll_votes_repo)
    return service.vote(poll_id, request.option_id, current_user.id)


@router.delete("/groups/{group_id}/polls/{poll_id}/vote", status_code=status.HTTP_204_NO_CONTENT)
def remove_vote(
    group_id: UUID,
    poll_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> Response:
    from app.modules.travel_buddies.services.chat import PollManagementService

    polls_repo, poll_options_repo, poll_votes_repo = _repositories(connection)[2:5]
    service = PollManagementService(polls_repo, poll_options_repo, poll_votes_repo)
    service.remove_vote(poll_id, current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/groups/{group_id}/polls/{poll_id}/close", response_model=PollResponse)
def close_poll(
    group_id: UUID,
    poll_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> PollResponse:
    from app.modules.travel_buddies.services.chat import PollManagementService

    polls_repo, poll_options_repo = _repositories(connection)[2:4]
    service = PollManagementService(polls_repo, poll_options_repo)
    return service.close_poll(poll_id, current_user.id)


@router.get("/groups/{group_id}/messages", response_model=MessageListResponse)
def list_messages(
    group_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
    limit: int = 50,
    offset: int = 0,
) -> MessageListResponse:
    from app.modules.travel_buddies.services.chat import MessageService
    from app.modules.account.repositories import PsycopgUserRepository

    messages_repo = _repositories(connection)[5]
    attachments_repo = _repositories(connection)[6]
    user_repo = PsycopgUserRepository(connection)
    service = MessageService(messages_repo, attachments_repo)
    return service.list_messages(group_id, limit, offset, user_repo)


@router.post("/groups/{group_id}/attachments", response_model=AttachmentResponse, status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    group_id: UUID,
    file: UploadFile,
    current_user: Annotated[User, Depends(get_current_user)],
    current_member: Annotated[GroupMember, Depends(get_current_group_member)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> AttachmentResponse:
    from uuid import uuid4
    from app.modules.travel_buddies.repositories import PsycopgAttachmentRepository
    from app.modules.travel_buddies.models import Attachment
    from app.modules.travel_buddies.schemas import AttachmentResponse

    attachments_repo = _repositories(connection)[6]

    content = await file.read()
    size = len(content)

    if size > 10 * 1024 * 1024:
        raise ValidationError("File too large (max 10MB)")

    stored_path = await save_file_with_uuid(file, "travel_buddies")

    attachment = Attachment(
        id=uuid4(),
        group_id=group_id,
        user_id=current_user.id,
        filename=file.filename or stored_path.split("/")[-1],
        content_type=file.content_type or "application/octet-stream",
        size=size,
    )
    created = attachments_repo.create(attachment)
    return AttachmentResponse(
        id=created.id,
        filename=created.filename,
        content_type=created.content_type,
        url=f"/media/{stored_path}",
        size=created.size,
    )


@router.post("/groups/{group_id}/messages", response_model=MessageDetailWithCountsResponse, status_code=status.HTTP_201_CREATED)
def send_message(
    group_id: UUID,
    request: CreateMessageRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> MessageDetailResponse:
    from app.modules.travel_buddies.services.chat import MessageService
    from app.modules.account.repositories import PsycopgUserRepository

    messages_repo = _repositories(connection)[5]
    attachments_repo = _repositories(connection)[6]
    user_repo = PsycopgUserRepository(connection)
    service = MessageService(messages_repo, attachments_repo)
    return service.send_message(group_id, current_user.id, request, user_repo)


@router.post("/groups/{group_id}/messages/{message_id}/reactions/{emoji}", status_code=status.HTTP_204_NO_CONTENT)
def add_reaction(
    group_id: UUID,
    message_id: UUID,
    emoji: str,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> Response:
    from app.modules.travel_buddies.services.chat import MessageService
    from urllib.parse import unquote
    from app.modules.account.repositories import PsycopgUserRepository

    decoded_emoji = unquote(emoji)
    messages_repo = _repositories(connection)[5]
    service = MessageService(messages_repo)
    service.add_reaction(message_id, current_user.id, decoded_emoji)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
    service.add_reaction(message_id, current_user.id, emoji)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/groups/{group_id}/messages/{message_id}/reactions/{emoji}", status_code=status.HTTP_204_NO_CONTENT)
def remove_reaction(
    group_id: UUID,
    message_id: UUID,
    emoji: str,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> Response:
    from app.modules.travel_buddies.services.chat import MessageService
    from urllib.parse import unquote

    decoded_emoji = unquote(emoji)
    messages_repo = _repositories(connection)[5]
    service = MessageService(messages_repo)
    service.remove_reaction(message_id, current_user.id, decoded_emoji)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/groups/{group_id}/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_message(
    group_id: UUID,
    message_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> Response:
    from app.modules.travel_buddies.services.chat import MessageService

    messages_repo = _repositories(connection)[5]
    service = MessageService(messages_repo)
    service.delete_message(message_id, current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/groups/{group_id}/tasks", response_model=TaskListResponse)
def list_tasks(
    group_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
    limit: int = 50,
    offset: int = 0,
    status_filter: str | None = None,
) -> TaskListResponse:
    from app.modules.travel_buddies.services.notes import ToDoListService

    tasks_repo = _repositories(connection)[7]
    service = ToDoListService(tasks_repo)
    return service.list_tasks(group_id, limit, offset, status_filter)


@router.post("/groups/{group_id}/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    group_id: UUID,
    request: CreateTaskRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> TaskResponse:
    from app.modules.travel_buddies.services.notes import ToDoListService

    tasks_repo = _repositories(connection)[7]
    service = ToDoListService(tasks_repo)
    return service.create_task(group_id, current_user.id, request)


@router.patch("/groups/{group_id}/tasks/{task_id}", response_model=TaskResponse)
def update_task(
    group_id: UUID,
    task_id: UUID,
    request: UpdateTaskRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> TaskResponse:
    from app.modules.travel_buddies.services.notes import ToDoListService

    tasks_repo = _repositories(connection)[7]
    service = ToDoListService(tasks_repo)
    return service.update_task(task_id, current_user.id, request)


@router.post("/groups/{group_id}/tasks/{task_id}/done", response_model=TaskResponse)
def mark_task_done(
    group_id: UUID,
    task_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> TaskResponse:
    from app.modules.travel_buddies.services.notes import ToDoListService

    tasks_repo = _repositories(connection)[7]
    service = ToDoListService(tasks_repo)
    return service.mark_done(task_id, current_user.id)


@router.post("/groups/{group_id}/tasks/{task_id}/pending", response_model=TaskResponse)
def mark_task_pending(
    group_id: UUID,
    task_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> TaskResponse:
    from app.modules.travel_buddies.services.notes import ToDoListService

    tasks_repo = _repositories(connection)[7]
    service = ToDoListService(tasks_repo)
    return service.mark_pending(task_id, current_user.id)


@router.delete("/groups/{group_id}/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    group_id: UUID,
    task_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> Response:
    from app.modules.travel_buddies.services.notes import ToDoListService

    tasks_repo = _repositories(connection)[7]
    service = ToDoListService(tasks_repo)
    service.delete_task(task_id, current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/groups/{group_id}/packing", response_model=PackingItemListResponse)
def list_packing_items(
    group_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
    limit: int = 100,
    offset: int = 0,
    category: str | None = None,
) -> PackingItemListResponse:
    from app.modules.travel_buddies.services.notes import PackingListService

    packing_repo = _repositories(connection)[8]
    service = PackingListService(packing_repo)
    return service.list_items(group_id, limit, offset, category)


@router.get("/groups/{group_id}/packing/progress", response_model=PackingProgressResponse)
def get_packing_progress(
    group_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> PackingProgressResponse:
    from app.modules.travel_buddies.services.notes import PackingListService

    packing_repo = _repositories(connection)[8]
    service = PackingListService(packing_repo)
    return service.get_progress(group_id)


@router.post("/groups/{group_id}/packing", response_model=PackingItemResponse, status_code=status.HTTP_201_CREATED)
def add_packing_item(
    group_id: UUID,
    request: CreatePackingItemRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> PackingItemResponse:
    from app.modules.travel_buddies.services.notes import PackingListService

    packing_repo = _repositories(connection)[8]
    service = PackingListService(packing_repo)
    return service.add_item(group_id, current_user.id, request)


@router.patch("/groups/{group_id}/packing/{item_id}", response_model=PackingItemResponse)
def update_packing_item(
    group_id: UUID,
    item_id: UUID,
    request: UpdatePackingItemRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> PackingItemResponse:
    from app.modules.travel_buddies.services.notes import PackingListService

    packing_repo = _repositories(connection)[8]
    service = PackingListService(packing_repo)
    return service.update_item(item_id, current_user.id, request)


@router.post("/groups/{group_id}/packing/{item_id}/packed", response_model=PackingItemResponse)
def mark_item_packed(
    group_id: UUID,
    item_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> PackingItemResponse:
    from app.modules.travel_buddies.services.notes import PackingListService

    packing_repo = _repositories(connection)[8]
    service = PackingListService(packing_repo)
    return service.mark_packed(item_id, current_user.id)


@router.post("/groups/{group_id}/packing/{item_id}/unpacked", response_model=PackingItemResponse)
def mark_item_unpacked(
    group_id: UUID,
    item_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> PackingItemResponse:
    from app.modules.travel_buddies.services.notes import PackingListService

    packing_repo = _repositories(connection)[8]
    service = PackingListService(packing_repo)
    return service.mark_unpacked(item_id, current_user.id)


@router.delete("/groups/{group_id}/packing/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_packing_item(
    group_id: UUID,
    item_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
) -> Response:
    from app.modules.travel_buddies.services.notes import PackingListService

    packing_repo = _repositories(connection)[8]
    service = PackingListService(packing_repo)
    service.delete_item(item_id, current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/groups/{group_id}/files/{filename}", tags=["files"])
def get_attachment(
    group_id: UUID,
    filename: str,
    current_user: Annotated[User, Depends(get_current_user)],
    current_member: Annotated[GroupMember, Depends(get_current_group_member)],
) -> FileResponse:
    from pathlib import Path
    from app.utils.file_storage.storage import UPLOAD_DIR

    filepath = UPLOAD_DIR / "travel_buddies" / filename
    if not filepath.exists():
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(filepath)