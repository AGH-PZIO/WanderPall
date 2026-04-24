from uuid import UUID
from typing import Optional, Annotated

from fastapi import APIRouter, Depends, HTTPException
from psycopg import Connection
from app.core.database import get_connection
from app.modules.account.dependencies import get_current_user
from app.modules.account.models import User
from app.modules.maps import db
from app.modules.maps.schemas import (
    MarkerGroupCreate,
    MarkerGroupUpdate,
    MarkerGroupResponse,
    MarkerGroupListResponse,
    MarkerCreate,
    MarkerUpdate,
    MarkerResponse,
    MarkerListResponse,
    RouteCreate,
    RouteUpdate,
    RouteResponse,
    RouteListResponse,
    MarkerCommentCreate,
    MarkerCommentUpdate,
    MarkerCommentResponse,
    MarkerCommentListResponse,
    MapSettingsUpdate,
    MapSettingsResponse,
)

router = APIRouter(prefix="/maps", tags=["module-4-maps"])


@router.get("/status")
def maps_status() -> dict[str, str]:
    return {"module": "maps", "status": "active"}


@router.get("/marker-groups", response_model=MarkerGroupListResponse)
def list_marker_groups(
    user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
):
    records = db.get_marker_groups(connection, user.id)
    return {"items": [MarkerGroupResponse.model_validate(r) for r in records], "total": len(records)}


@router.post("/marker-groups", response_model=MarkerGroupResponse, status_code=201)
def create_marker_group(
    data: MarkerGroupCreate,
    user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
):
    record = db.create_marker_group(connection, user.id, data)
    return MarkerGroupResponse.model_validate(record)


@router.get("/marker-groups/{group_id}", response_model=MarkerGroupResponse)
def get_marker_group(
    group_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
):
    record = db.get_marker_group(connection, group_id, user.id)
    if not record:
        raise HTTPException(status_code=404, detail="Marker group not found")
    return MarkerGroupResponse.model_validate(record)


@router.patch("/marker-groups/{group_id}", response_model=MarkerGroupResponse)
def update_marker_group(
    group_id: UUID,
    data: MarkerGroupUpdate,
    user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
):
    record = db.update_marker_group(connection, group_id, user.id, data)
    if not record:
        raise HTTPException(status_code=404, detail="Marker group not found")
    return MarkerGroupResponse.model_validate(record)


@router.delete("/marker-groups/{group_id}")
def delete_marker_group(
    group_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
):
    deleted = db.delete_marker_group(connection, group_id, user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Marker group not found")
    return {"status": "deleted"}


@router.get("/markers", response_model=MarkerListResponse)
def list_markers(
    user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
    group_id: Optional[UUID] = None,
):
    records = db.get_markers(connection, user.id, group_id)
    return {"items": [MarkerResponse.model_validate(r) for r in records], "total": len(records)}


@router.post("/markers", response_model=MarkerResponse, status_code=201)
def create_marker(
    data: MarkerCreate,
    user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
):
    record = db.create_marker(connection, user.id, data)
    return MarkerResponse.model_validate(record)


@router.get("/markers/{marker_id}", response_model=MarkerResponse)
def get_marker(
    marker_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
):
    record = db.get_marker(connection, marker_id, user.id)
    if not record:
        raise HTTPException(status_code=404, detail="Marker not found")
    return MarkerResponse.model_validate(record)


@router.patch("/markers/{marker_id}", response_model=MarkerResponse)
def update_marker(
    marker_id: UUID,
    data: MarkerUpdate,
    user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
):
    record = db.update_marker(connection, marker_id, user.id, data)
    if not record:
        raise HTTPException(status_code=404, detail="Marker not found")
    return MarkerResponse.model_validate(record)


@router.delete("/markers/{marker_id}")
def delete_marker(
    marker_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
):
    deleted = db.delete_marker(connection, marker_id, user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Marker not found")
    return {"status": "deleted"}


@router.post("/markers/{marker_id}/visited", response_model=MarkerResponse)
def mark_marker_visited(
    marker_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
):
    record = db.update_marker(connection, marker_id, user.id, MarkerUpdate(is_visited=True))
    if not record:
        raise HTTPException(status_code=404, detail="Marker not found")
    return MarkerResponse.model_validate(record)


@router.get("/routes", response_model=RouteListResponse)
def list_routes(
    user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
):
    records = db.get_routes(connection, user.id)
    return {"items": [RouteResponse.model_validate(r) for r in records], "total": len(records)}


@router.post("/routes", response_model=RouteResponse, status_code=201)
def create_route(
    data: RouteCreate,
    user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
):
    record = db.create_route(connection, user.id, data)
    return RouteResponse.model_validate(record)


@router.get("/routes/{route_id}", response_model=RouteResponse)
def get_route(
    route_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
):
    record = db.get_route(connection, route_id, user.id)
    if not record:
        raise HTTPException(status_code=404, detail="Route not found")
    return RouteResponse.model_validate(record)


@router.patch("/routes/{route_id}", response_model=RouteResponse)
def update_route(
    route_id: UUID,
    data: RouteUpdate,
    user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
):
    record = db.update_route(connection, route_id, user.id, data)
    if not record:
        raise HTTPException(status_code=404, detail="Route not found")
    return RouteResponse.model_validate(record)


@router.delete("/routes/{route_id}")
def delete_route(
    route_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
):
    deleted = db.delete_route(connection, route_id, user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Route not found")
    return {"status": "deleted"}


@router.get("/markers/{marker_id}/comments", response_model=MarkerCommentListResponse)
def list_marker_comments(
    marker_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
):
    marker = db.get_marker(connection, marker_id, user.id)
    if not marker:
        raise HTTPException(status_code=404, detail="Marker not found")
    records = db.get_marker_comments(connection, marker_id, user.id)
    return {"items": [MarkerCommentResponse.model_validate(r) for r in records], "total": len(records)}


@router.post("/markers/{marker_id}/comments", response_model=MarkerCommentResponse, status_code=201)
def create_marker_comment(
    marker_id: UUID,
    data: MarkerCommentCreate,
    user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
):
    marker = db.get_marker(connection, marker_id, user.id)
    if not marker:
        raise HTTPException(status_code=404, detail="Marker not found")
    record = db.create_marker_comment(connection, user.id, data)
    return MarkerCommentResponse.model_validate(record)


@router.patch("/markers/{marker_id}/comments/{comment_id}", response_model=MarkerCommentResponse)
def update_marker_comment(
    marker_id: UUID,
    comment_id: UUID,
    data: MarkerCommentUpdate,
    user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
):
    record = db.update_marker_comment(connection, comment_id, user.id, data)
    if not record:
        raise HTTPException(status_code=404, detail="Comment not found")
    return MarkerCommentResponse.model_validate(record)


@router.delete("/markers/{marker_id}/comments/{comment_id}")
def delete_marker_comment(
    marker_id: UUID,
    comment_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
):
    deleted = db.delete_marker_comment(connection, comment_id, user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Comment not found")
    return {"status": "deleted"}


@router.get("/settings", response_model=MapSettingsResponse)
def get_map_settings(
    user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
):
    record = db.get_user_map_settings(connection, user.id)
    if not record:
        record = db.update_user_map_settings(connection, user.id, MapSettingsUpdate())
    return MapSettingsResponse.model_validate(record)


@router.patch("/settings", response_model=MapSettingsResponse)
def update_map_settings(
    data: MapSettingsUpdate,
    user: Annotated[User, Depends(get_current_user)],
    connection: Annotated[Connection, Depends(get_connection)],
):
    record = db.update_user_map_settings(connection, user.id, data)
    return MapSettingsResponse.model_validate(record)