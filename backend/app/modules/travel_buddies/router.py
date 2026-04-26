from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.modules.travel_buddies import repository
from app.modules.travel_buddies.dependencies import get_db_conn, get_dev_user_id
from app.modules.travel_buddies.schemas import (
    AddMemberRequest,
    GroupCreate,
    GroupMemberResponse,
    GroupResponse,
    GroupWithMembersResponse,
)

import psycopg

router = APIRouter(prefix="/travel-buddies", tags=["module-3-travel-buddies"])


@router.get("/groups", response_model=list[GroupResponse])
def list_groups(
    conn: Annotated[psycopg.Connection, Depends(get_db_conn)],
    user_id: Annotated[UUID, Depends(get_dev_user_id)],
) -> list[GroupResponse]:
    rows = repository.list_user_groups(conn, user_id=user_id)
    return [GroupResponse(**r) for r in rows]


@router.post("/groups", response_model=GroupResponse, status_code=201)
def create_group(
    conn: Annotated[psycopg.Connection, Depends(get_db_conn)],
    user_id: Annotated[UUID, Depends(get_dev_user_id)],
    body: GroupCreate,
) -> GroupResponse:
    row = repository.create_group(conn, owner_id=user_id, name=body.name, description=body.description)
    return GroupResponse(**row)


@router.get("/groups/{group_id}", response_model=GroupWithMembersResponse)
def get_group(
    conn: Annotated[psycopg.Connection, Depends(get_db_conn)],
    user_id: Annotated[UUID, Depends(get_dev_user_id)],
    group_id: UUID,
) -> GroupWithMembersResponse:
    if not repository.is_member(conn, group_id=group_id, user_id=user_id):
        raise HTTPException(status_code=403, detail="Not a member of this group")
    group = repository.get_group(conn, group_id=group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    members = repository.list_members(conn, group_id=group_id)
    return GroupWithMembersResponse(
        **group,
        members=[GroupMemberResponse(**m) for m in members],
    )


@router.delete("/groups/{group_id}")
def delete_group(
    conn: Annotated[psycopg.Connection, Depends(get_db_conn)],
    user_id: Annotated[UUID, Depends(get_dev_user_id)],
    group_id: UUID,
) -> dict[str, str]:
    n = repository.delete_group(conn, group_id=group_id, owner_id=user_id)
    if n == 0:
        raise HTTPException(status_code=404, detail="Group not found or you are not the owner")
    return {"status": "deleted"}


@router.post("/groups/{group_id}/members", response_model=GroupMemberResponse, status_code=201)
def add_member(
    conn: Annotated[psycopg.Connection, Depends(get_db_conn)],
    user_id: Annotated[UUID, Depends(get_dev_user_id)],
    group_id: UUID,
    body: AddMemberRequest,
) -> GroupMemberResponse:
    group = repository.get_group(conn, group_id=group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if group["owner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only the group owner can add members")
    row = repository.add_member(conn, group_id=group_id, user_id=body.user_id)
    if row is None:
        raise HTTPException(status_code=409, detail="User is already a member of this group")
    return GroupMemberResponse(**row)


@router.get("/groups/{group_id}/members", response_model=list[GroupMemberResponse])
def list_members(
    conn: Annotated[psycopg.Connection, Depends(get_db_conn)],
    user_id: Annotated[UUID, Depends(get_dev_user_id)],
    group_id: UUID,
) -> list[GroupMemberResponse]:
    if not repository.is_member(conn, group_id=group_id, user_id=user_id):
        raise HTTPException(status_code=403, detail="Not a member of this group")
    rows = repository.list_members(conn, group_id=group_id)
    return [GroupMemberResponse(**r) for r in rows]


@router.delete("/groups/{group_id}/members/{member_id}")
def remove_member(
    conn: Annotated[psycopg.Connection, Depends(get_db_conn)],
    user_id: Annotated[UUID, Depends(get_dev_user_id)],
    group_id: UUID,
    member_id: UUID,
) -> dict[str, str]:
    group = repository.get_group(conn, group_id=group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if group["owner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only the group owner can remove members")
    n = repository.remove_member(conn, group_id=group_id, member_id=member_id)
    if n == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"status": "removed"}
