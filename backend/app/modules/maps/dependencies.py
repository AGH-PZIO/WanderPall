from typing import Annotated
from uuid import UUID

from fastapi import Depends
from psycopg import Connection

from app.core.database import get_connection
from app.modules.account.dependencies import get_current_user
from app.modules.account.models import User
from app.modules.maps.errors import ForbiddenError
from app.modules.maps.repositories import (
    PsycopgMarkerCommentRepository,
    PsycopgMarkerRepository,
    PsycopgRouteRepository,
)
from app.modules.maps.services import (
    GroupMembershipChecker,
    MapSnapshotService,
    MarkerService,
    RouteService,
)
from app.modules.travel_buddies.repositories import PsycopgGroupMemberRepository


class TravelBuddiesGroupMembership(GroupMembershipChecker):
    """Adapter that uses the travel_buddies repository to check membership."""

    def __init__(self, connection: Connection) -> None:
        self.repo = PsycopgGroupMemberRepository(connection)

    def is_member(self, group_id: UUID, user_id: UUID) -> bool:
        return self.repo.is_member(group_id, user_id)


def get_marker_service(
    connection: Annotated[Connection, Depends(get_connection)],
) -> MarkerService:
    return MarkerService(
        markers=PsycopgMarkerRepository(connection),
        comments=PsycopgMarkerCommentRepository(connection),
        membership=TravelBuddiesGroupMembership(connection),
    )


def get_route_service(
    connection: Annotated[Connection, Depends(get_connection)],
) -> RouteService:
    return RouteService(
        routes=PsycopgRouteRepository(connection),
        membership=TravelBuddiesGroupMembership(connection),
    )


def get_snapshot_service(
    connection: Annotated[Connection, Depends(get_connection)],
) -> MapSnapshotService:
    return MapSnapshotService(
        markers=PsycopgMarkerRepository(connection),
        routes=PsycopgRouteRepository(connection),
        comments=PsycopgMarkerCommentRepository(connection),
        membership=TravelBuddiesGroupMembership(connection),
    )


__all__ = [
    "TravelBuddiesGroupMembership",
    "get_marker_service",
    "get_route_service",
    "get_snapshot_service",
    "ForbiddenError",
    "get_current_user",
    "User",
]
