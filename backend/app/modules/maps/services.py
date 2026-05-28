from uuid import UUID, uuid4

from app.modules.maps.errors import ForbiddenError, NotFoundError, ValidationError
from app.modules.maps.models import Marker, MarkerCategory, MarkerComment, Route
from app.modules.maps.repositories.protocols import (
    MarkerCommentRepository,
    MarkerRepository,
    RouteRepository,
)
from app.modules.maps.schemas import (
    MarkerCommentCreateRequest,
    MarkerCreateRequest,
    MarkerUpdateRequest,
    RouteCreateRequest,
    RouteUpdateRequest,
)


class GroupMembershipChecker:
    """Abstraction so services don't directly depend on travel_buddies repository.

    The router wires the real travel_buddies.GroupMemberRepository here; tests
    can pass a tiny fake that returns True/False.
    """

    def is_member(self, group_id: UUID, user_id: UUID) -> bool:  # pragma: no cover - protocol
        ...


def _require_member(checker: GroupMembershipChecker, group_id: UUID, user_id: UUID) -> None:
    if not checker.is_member(group_id, user_id):
        raise ForbiddenError("You are not a member of this group")


class MarkerService:
    def __init__(
        self,
        markers: MarkerRepository,
        comments: MarkerCommentRepository,
        membership: GroupMembershipChecker,
    ) -> None:
        self.markers = markers
        self.comments = comments
        self.membership = membership

    def list_for_group(self, group_id: UUID, user_id: UUID) -> list[Marker]:
        _require_member(self.membership, group_id, user_id)
        return self.markers.list_by_group(group_id)

    def create(self, group_id: UUID, user_id: UUID, request: MarkerCreateRequest) -> Marker:
        """UC 4.1: Add marker."""
        _require_member(self.membership, group_id, user_id)
        marker = Marker(
            id=uuid4(),
            group_id=group_id,
            name=request.name.strip(),
            category=request.category,
            latitude=request.latitude,
            longitude=request.longitude,
            visited=False,
            created_by=user_id,
        )
        return self.markers.create(marker)

    def update(
        self,
        group_id: UUID,
        marker_id: UUID,
        user_id: UUID,
        request: MarkerUpdateRequest,
    ) -> Marker:
        """UC 4.6 (mark visited) + UC 4.7 (change category) + rename."""
        _require_member(self.membership, group_id, user_id)
        existing = self._fetch_marker_in_group(group_id, marker_id)

        new_name = existing.name if request.name is None else request.name.strip()
        new_category = existing.category if request.category is None else request.category
        new_visited = existing.visited if request.visited is None else request.visited
        new_lat = existing.latitude if request.latitude is None else request.latitude
        new_lng = existing.longitude if request.longitude is None else request.longitude

        if not new_name:
            raise ValidationError("Marker name cannot be empty")

        updated = Marker(
            id=existing.id,
            group_id=existing.group_id,
            name=new_name,
            category=new_category,
            latitude=new_lat,
            longitude=new_lng,
            visited=new_visited,
            created_by=existing.created_by,
            created_at=existing.created_at,
            updated_at=existing.updated_at,
        )
        return self.markers.update(updated)

    def delete(self, group_id: UUID, marker_id: UUID, user_id: UUID) -> None:
        """UC 4.2: Remove marker (cascades comments)."""
        _require_member(self.membership, group_id, user_id)
        self._fetch_marker_in_group(group_id, marker_id)
        self.markers.delete(marker_id)

    def add_comment(
        self,
        group_id: UUID,
        marker_id: UUID,
        user_id: UUID,
        request: MarkerCommentCreateRequest,
    ) -> MarkerComment:
        """UC 4.5: Add a comment under a marker."""
        _require_member(self.membership, group_id, user_id)
        self._fetch_marker_in_group(group_id, marker_id)
        body = request.body.strip()
        if not body:
            raise ValidationError("Comment body cannot be empty")
        comment = MarkerComment(
            id=uuid4(),
            marker_id=marker_id,
            author_id=user_id,
            body=body,
        )
        return self.comments.create(comment)

    def edit_comment(
        self,
        group_id: UUID,
        marker_id: UUID,
        comment_id: UUID,
        user_id: UUID,
        new_body: str,
    ) -> MarkerComment:
        _require_member(self.membership, group_id, user_id)
        self._fetch_marker_in_group(group_id, marker_id)
        existing = self.comments.get_by_id(comment_id)
        if existing is None or existing.marker_id != marker_id:
            raise NotFoundError("Comment not found")
        if existing.author_id != user_id:
            raise ForbiddenError("You can only edit your own comments")
        body = new_body.strip()
        if not body:
            raise ValidationError("Comment body cannot be empty")
        return self.comments.update_body(comment_id, body)

    def delete_comment(
        self,
        group_id: UUID,
        marker_id: UUID,
        comment_id: UUID,
        user_id: UUID,
    ) -> None:
        _require_member(self.membership, group_id, user_id)
        self._fetch_marker_in_group(group_id, marker_id)
        existing = self.comments.get_by_id(comment_id)
        if existing is None or existing.marker_id != marker_id:
            raise NotFoundError("Comment not found")
        if existing.author_id != user_id:
            raise ForbiddenError("You can only delete your own comments")
        self.comments.delete(comment_id)

    def list_comments(
        self, group_id: UUID, marker_id: UUID, user_id: UUID
    ) -> list[MarkerComment]:
        _require_member(self.membership, group_id, user_id)
        self._fetch_marker_in_group(group_id, marker_id)
        return self.comments.list_by_marker(marker_id)

    def _fetch_marker_in_group(self, group_id: UUID, marker_id: UUID) -> Marker:
        marker = self.markers.get_by_id(marker_id)
        if marker is None or marker.group_id != group_id:
            raise NotFoundError("Marker not found")
        return marker


class RouteService:
    def __init__(
        self,
        routes: RouteRepository,
        membership: GroupMembershipChecker,
    ) -> None:
        self.routes = routes
        self.membership = membership

    def list_for_group(self, group_id: UUID, user_id: UUID) -> list[Route]:
        _require_member(self.membership, group_id, user_id)
        return self.routes.list_by_group(group_id)

    def create(self, group_id: UUID, user_id: UUID, request: RouteCreateRequest) -> Route:
        """UC 4.3: Draw a route on the map."""
        _require_member(self.membership, group_id, user_id)
        if len(request.points) < 2:
            raise ValidationError("Route must contain at least 2 points")
        points = [(pt.latitude, pt.longitude) for pt in request.points]
        route = Route(
            id=uuid4(),
            group_id=group_id,
            name=(request.name.strip() if request.name else None) or None,
            color=request.color,
            points=points,
            created_by=user_id,
        )
        return self.routes.create(route)

    def update(
        self,
        group_id: UUID,
        route_id: UUID,
        user_id: UUID,
        request: RouteUpdateRequest,
    ) -> Route:
        """Extension to UC 4.3: edit color/name/points of an existing route."""
        _require_member(self.membership, group_id, user_id)
        existing = self.routes.get_by_id(route_id)
        if existing is None or existing.group_id != group_id:
            raise NotFoundError("Route not found")

        new_name = existing.name
        if request.name is not None:
            stripped = request.name.strip()
            new_name = stripped or None

        new_color = existing.color if request.color is None else request.color

        new_points = existing.points
        if request.points is not None:
            if len(request.points) < 2:
                raise ValidationError("Route must contain at least 2 points")
            new_points = [(pt.latitude, pt.longitude) for pt in request.points]

        updated = Route(
            id=existing.id,
            group_id=existing.group_id,
            name=new_name,
            color=new_color,
            points=new_points,
            created_by=existing.created_by,
            created_at=existing.created_at,
        )
        return self.routes.update(updated)

    def delete(self, group_id: UUID, route_id: UUID, user_id: UUID) -> None:
        """UC 4.4: Remove a route."""
        _require_member(self.membership, group_id, user_id)
        route = self.routes.get_by_id(route_id)
        if route is None or route.group_id != group_id:
            raise NotFoundError("Route not found")
        self.routes.delete(route_id)


class MapSnapshotService:
    """Aggregates markers, routes, and comments for a single render of the group's map."""

    def __init__(
        self,
        markers: MarkerRepository,
        routes: RouteRepository,
        comments: MarkerCommentRepository,
        membership: GroupMembershipChecker,
    ) -> None:
        self.markers = markers
        self.routes = routes
        self.comments = comments
        self.membership = membership

    def get(self, group_id: UUID, user_id: UUID) -> tuple[
        list[Marker], list[Route], dict[UUID, list[MarkerComment]]
    ]:
        _require_member(self.membership, group_id, user_id)
        markers = self.markers.list_by_group(group_id)
        routes = self.routes.list_by_group(group_id)
        comments_by_marker = self.comments.list_by_markers([m.id for m in markers])
        return markers, routes, comments_by_marker


def available_categories() -> list[tuple[str, str]]:
    """UC 4.7: predefined functional groups for markers."""
    labels = {
        MarkerCategory.RESTAURANT: "Restauracja",
        MarkerCategory.HOTEL: "Hotel / nocleg",
        MarkerCategory.SIGHTSEEING: "Zabytek / atrakcja",
        MarkerCategory.TRANSPORT: "Transport",
        MarkerCategory.NATURE: "Natura",
        MarkerCategory.SHOPPING: "Zakupy",
        MarkerCategory.OTHER: "Inne",
    }
    return [(cat.value, labels[cat]) for cat in MarkerCategory]
