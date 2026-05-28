from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Response, status

from app.modules.account.dependencies import get_current_user
from app.modules.account.models import User
from app.modules.maps.dependencies import (
    get_marker_service,
    get_route_service,
    get_snapshot_service,
)
from app.modules.maps.models import Marker, MarkerComment, Route
from app.modules.maps.schemas import (
    MapSnapshotResponse,
    MarkerCategoryItem,
    MarkerCategoryListResponse,
    MarkerCommentCreateRequest,
    MarkerCommentResponse,
    MarkerCommentUpdateRequest,
    MarkerCreateRequest,
    MarkerResponse,
    MarkerUpdateRequest,
    RouteCreateRequest,
    RoutePointModel,
    RouteResponse,
    RouteUpdateRequest,
)
from app.modules.maps.services import (
    MapSnapshotService,
    MarkerService,
    RouteService,
    available_categories,
)


router = APIRouter(prefix="/maps", tags=["module-4-maps"])


def _dt(value) -> str | None:
    return value.isoformat() if value else None


def _marker_to_response(marker: Marker) -> MarkerResponse:
    return MarkerResponse(
        id=marker.id,
        group_id=marker.group_id,
        name=marker.name,
        category=marker.category,
        latitude=marker.latitude,
        longitude=marker.longitude,
        visited=marker.visited,
        created_by=marker.created_by,
        created_at=_dt(marker.created_at),
        updated_at=_dt(marker.updated_at),
    )


def _route_to_response(route: Route) -> RouteResponse:
    return RouteResponse(
        id=route.id,
        group_id=route.group_id,
        name=route.name,
        color=route.color,
        points=[RoutePointModel(latitude=lat, longitude=lng) for lat, lng in route.points],
        created_by=route.created_by,
        created_at=_dt(route.created_at),
    )


def _comment_to_response(comment: MarkerComment) -> MarkerCommentResponse:
    return MarkerCommentResponse(
        id=comment.id,
        marker_id=comment.marker_id,
        author_id=comment.author_id,
        body=comment.body,
        created_at=_dt(comment.created_at),
    )


@router.get("/status")
def maps_status() -> dict[str, str]:
    return {"module": "maps", "status": "ok"}


@router.get("/categories", response_model=MarkerCategoryListResponse)
def list_marker_categories() -> MarkerCategoryListResponse:
    """UC 4.7: predefined functional marker groups."""
    items = [MarkerCategoryItem(value=val, label=label) for val, label in available_categories()]
    return MarkerCategoryListResponse(items=items)


# ─── Map snapshot ────────────────────────────────────────────────────────────


@router.get("/groups/{group_id}", response_model=MapSnapshotResponse)
def get_group_map(
    group_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[MapSnapshotService, Depends(get_snapshot_service)],
) -> MapSnapshotResponse:
    """Single-shot render payload: markers + routes + comments per marker."""
    markers, routes, comments_by_marker = service.get(group_id, current_user.id)
    return MapSnapshotResponse(
        group_id=group_id,
        markers=[_marker_to_response(m) for m in markers],
        routes=[_route_to_response(r) for r in routes],
        comments_by_marker={
            marker_id: [_comment_to_response(c) for c in comments]
            for marker_id, comments in comments_by_marker.items()
        },
    )


# ─── Markers (UC 4.1, 4.2, 4.6, 4.7) ─────────────────────────────────────────


@router.get("/groups/{group_id}/markers", response_model=list[MarkerResponse])
def list_markers(
    group_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[MarkerService, Depends(get_marker_service)],
) -> list[MarkerResponse]:
    markers = service.list_for_group(group_id, current_user.id)
    return [_marker_to_response(m) for m in markers]


@router.post(
    "/groups/{group_id}/markers",
    response_model=MarkerResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_marker(
    group_id: UUID,
    request: MarkerCreateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[MarkerService, Depends(get_marker_service)],
) -> MarkerResponse:
    """UC 4.1: Add a marker to the group's map."""
    marker = service.create(group_id, current_user.id, request)
    return _marker_to_response(marker)


@router.patch(
    "/groups/{group_id}/markers/{marker_id}",
    response_model=MarkerResponse,
)
def update_marker(
    group_id: UUID,
    marker_id: UUID,
    request: MarkerUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[MarkerService, Depends(get_marker_service)],
) -> MarkerResponse:
    """UC 4.6 / 4.7: mark as visited / change category / rename."""
    marker = service.update(group_id, marker_id, current_user.id, request)
    return _marker_to_response(marker)


@router.delete(
    "/groups/{group_id}/markers/{marker_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_marker(
    group_id: UUID,
    marker_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[MarkerService, Depends(get_marker_service)],
) -> Response:
    """UC 4.2: Remove a marker."""
    service.delete(group_id, marker_id, current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ─── Marker comments (UC 4.5) ────────────────────────────────────────────────


@router.get(
    "/groups/{group_id}/markers/{marker_id}/comments",
    response_model=list[MarkerCommentResponse],
)
def list_marker_comments(
    group_id: UUID,
    marker_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[MarkerService, Depends(get_marker_service)],
) -> list[MarkerCommentResponse]:
    comments = service.list_comments(group_id, marker_id, current_user.id)
    return [_comment_to_response(c) for c in comments]


@router.post(
    "/groups/{group_id}/markers/{marker_id}/comments",
    response_model=MarkerCommentResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_marker_comment(
    group_id: UUID,
    marker_id: UUID,
    request: MarkerCommentCreateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[MarkerService, Depends(get_marker_service)],
) -> MarkerCommentResponse:
    """UC 4.5: Add a comment under a marker."""
    comment = service.add_comment(group_id, marker_id, current_user.id, request)
    return _comment_to_response(comment)


@router.patch(
    "/groups/{group_id}/markers/{marker_id}/comments/{comment_id}",
    response_model=MarkerCommentResponse,
)
def update_marker_comment(
    group_id: UUID,
    marker_id: UUID,
    comment_id: UUID,
    request: MarkerCommentUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[MarkerService, Depends(get_marker_service)],
) -> MarkerCommentResponse:
    """UC 4.5 (extended): Edit author's own comment."""
    comment = service.edit_comment(
        group_id, marker_id, comment_id, current_user.id, request.body
    )
    return _comment_to_response(comment)


@router.delete(
    "/groups/{group_id}/markers/{marker_id}/comments/{comment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_marker_comment(
    group_id: UUID,
    marker_id: UUID,
    comment_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[MarkerService, Depends(get_marker_service)],
) -> Response:
    service.delete_comment(group_id, marker_id, comment_id, current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ─── Routes (UC 4.3, 4.4) ────────────────────────────────────────────────────


@router.get("/groups/{group_id}/routes", response_model=list[RouteResponse])
def list_routes(
    group_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[RouteService, Depends(get_route_service)],
) -> list[RouteResponse]:
    routes = service.list_for_group(group_id, current_user.id)
    return [_route_to_response(r) for r in routes]


@router.post(
    "/groups/{group_id}/routes",
    response_model=RouteResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_route(
    group_id: UUID,
    request: RouteCreateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[RouteService, Depends(get_route_service)],
) -> RouteResponse:
    """UC 4.3: Draw a route on the group's map."""
    route = service.create(group_id, current_user.id, request)
    return _route_to_response(route)


@router.patch(
    "/groups/{group_id}/routes/{route_id}",
    response_model=RouteResponse,
)
def update_route(
    group_id: UUID,
    route_id: UUID,
    request: RouteUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[RouteService, Depends(get_route_service)],
) -> RouteResponse:
    """Extension to UC 4.3: edit existing route (name/color/points)."""
    route = service.update(group_id, route_id, current_user.id, request)
    return _route_to_response(route)


@router.delete(
    "/groups/{group_id}/routes/{route_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_route(
    group_id: UUID,
    route_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[RouteService, Depends(get_route_service)],
) -> Response:
    """UC 4.4: Remove a route."""
    service.delete(group_id, route_id, current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
