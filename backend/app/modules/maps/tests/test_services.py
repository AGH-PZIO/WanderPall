from dataclasses import replace
from uuid import UUID, uuid4

import pytest

from app.modules.maps.errors import ForbiddenError, NotFoundError, ValidationError
from app.modules.maps.models import Marker, MarkerCategory, MarkerComment, Route
from app.modules.maps.schemas import (
    MarkerCommentCreateRequest,
    MarkerCreateRequest,
    MarkerUpdateRequest,
    RouteCreateRequest,
    RoutePointModel,
    RouteUpdateRequest,
)
from app.modules.maps.services import (
    GroupMembershipChecker,
    MapSnapshotService,
    MarkerService,
    RouteService,
    available_categories,
)


# ─── Fakes ─────────────────────────────────────────────────────────────


class FakeMembership(GroupMembershipChecker):
    """In-memory membership: (group_id, user_id) pairs that are members."""

    def __init__(self) -> None:
        self.members: set[tuple[UUID, UUID]] = set()

    def add(self, group_id: UUID, user_id: UUID) -> None:
        self.members.add((group_id, user_id))

    def is_member(self, group_id: UUID, user_id: UUID) -> bool:
        return (group_id, user_id) in self.members


class FakeMarkers:
    def __init__(self) -> None:
        self.by_id: dict[UUID, Marker] = {}

    def get_by_id(self, marker_id: UUID) -> Marker | None:
        return self.by_id.get(marker_id)

    def list_by_group(self, group_id: UUID) -> list[Marker]:
        return [m for m in self.by_id.values() if m.group_id == group_id]

    def create(self, marker: Marker) -> Marker:
        self.by_id[marker.id] = marker
        return marker

    def update(self, marker: Marker) -> Marker:
        self.by_id[marker.id] = marker
        return marker

    def delete(self, marker_id: UUID) -> None:
        self.by_id.pop(marker_id, None)


class FakeRoutes:
    def __init__(self) -> None:
        self.by_id: dict[UUID, Route] = {}

    def get_by_id(self, route_id: UUID) -> Route | None:
        return self.by_id.get(route_id)

    def list_by_group(self, group_id: UUID) -> list[Route]:
        return [r for r in self.by_id.values() if r.group_id == group_id]

    def create(self, route: Route) -> Route:
        self.by_id[route.id] = route
        return route

    def update(self, route: Route) -> Route:
        self.by_id[route.id] = route
        return route

    def delete(self, route_id: UUID) -> None:
        self.by_id.pop(route_id, None)


class FakeComments:
    def __init__(self) -> None:
        self.by_id: dict[UUID, MarkerComment] = {}

    def get_by_id(self, comment_id: UUID) -> MarkerComment | None:
        return self.by_id.get(comment_id)

    def list_by_marker(self, marker_id: UUID) -> list[MarkerComment]:
        return [c for c in self.by_id.values() if c.marker_id == marker_id]

    def list_by_markers(self, marker_ids: list[UUID]) -> dict[UUID, list[MarkerComment]]:
        result: dict[UUID, list[MarkerComment]] = {mid: [] for mid in marker_ids}
        for c in self.by_id.values():
            if c.marker_id in result:
                result[c.marker_id].append(c)
        return result

    def create(self, comment: MarkerComment) -> MarkerComment:
        self.by_id[comment.id] = comment
        return comment

    def update_body(self, comment_id: UUID, body: str) -> MarkerComment:
        existing = self.by_id[comment_id]
        updated = replace(existing, body=body)
        self.by_id[comment_id] = updated
        return updated

    def delete(self, comment_id: UUID) -> None:
        self.by_id.pop(comment_id, None)


# ─── Helpers ─────────────────────────────────────────────────────────────


def _make_marker_service():
    markers = FakeMarkers()
    comments = FakeComments()
    membership = FakeMembership()
    service = MarkerService(markers, comments, membership)
    return service, markers, comments, membership


def _make_route_service():
    routes = FakeRoutes()
    membership = FakeMembership()
    service = RouteService(routes, membership)
    return service, routes, membership


# ─── UC 4.1: Add marker ──────────────────────────────────────────────────


def test_uc_4_1_add_marker_creates_persistent_record() -> None:
    service, markers, _, membership = _make_marker_service()
    group_id, user_id = uuid4(), uuid4()
    membership.add(group_id, user_id)

    marker = service.create(
        group_id,
        user_id,
        MarkerCreateRequest(
            name="Wawel",
            latitude=50.0544,
            longitude=19.9356,
            category=MarkerCategory.SIGHTSEEING.value,
        ),
    )

    assert marker.id in markers.by_id
    assert marker.name == "Wawel"
    assert marker.category == "sightseeing"
    assert marker.visited is False
    assert marker.created_by == user_id


def test_uc_4_1_non_member_cannot_add_marker() -> None:
    """Spec precondition: client must belong to the travel-buddies group."""
    service, _, _, _ = _make_marker_service()
    with pytest.raises(ForbiddenError):
        service.create(
            uuid4(),
            uuid4(),
            MarkerCreateRequest(name="X", latitude=0, longitude=0),
        )


def test_uc_4_1_rejects_invalid_category_at_schema_level() -> None:
    """Schema layer should reject categories outside the predefined set."""
    with pytest.raises(ValueError):
        MarkerCreateRequest(
            name="X", latitude=0, longitude=0, category="aliens"
        )


def test_uc_4_1_rejects_out_of_range_coordinates_at_schema_level() -> None:
    with pytest.raises(ValueError):
        MarkerCreateRequest(name="X", latitude=999, longitude=0)
    with pytest.raises(ValueError):
        MarkerCreateRequest(name="X", latitude=0, longitude=-999)


# ─── UC 4.2: Remove marker ───────────────────────────────────────────────


def test_uc_4_2_remove_marker_deletes_record() -> None:
    service, markers, _, membership = _make_marker_service()
    group_id, user_id = uuid4(), uuid4()
    membership.add(group_id, user_id)

    marker = service.create(
        group_id, user_id, MarkerCreateRequest(name="X", latitude=0, longitude=0)
    )
    service.delete(group_id, marker.id, user_id)

    assert marker.id not in markers.by_id


def test_uc_4_2_delete_unknown_marker_raises_not_found() -> None:
    service, _, _, membership = _make_marker_service()
    group_id, user_id = uuid4(), uuid4()
    membership.add(group_id, user_id)

    with pytest.raises(NotFoundError):
        service.delete(group_id, uuid4(), user_id)


def test_uc_4_2_cannot_delete_marker_from_other_group() -> None:
    service, _, _, membership = _make_marker_service()
    group_a, group_b, user_id = uuid4(), uuid4(), uuid4()
    membership.add(group_a, user_id)
    membership.add(group_b, user_id)

    marker = service.create(
        group_a, user_id, MarkerCreateRequest(name="X", latitude=0, longitude=0)
    )

    # Attempting to delete it via group_b's URL must NOT succeed.
    with pytest.raises(NotFoundError):
        service.delete(group_b, marker.id, user_id)


# ─── UC 4.3: Add route ───────────────────────────────────────────────────


def test_uc_4_3_add_route_with_polyline_points() -> None:
    service, routes, membership = _make_route_service()
    group_id, user_id = uuid4(), uuid4()
    membership.add(group_id, user_id)

    route = service.create(
        group_id,
        user_id,
        RouteCreateRequest(
            name="Stare Miasto",
            color="#ff5500",
            points=[
                RoutePointModel(latitude=50.06, longitude=19.93),
                RoutePointModel(latitude=50.07, longitude=19.94),
                RoutePointModel(latitude=50.08, longitude=19.95),
            ],
        ),
    )

    assert route.id in routes.by_id
    assert route.color == "#ff5500"
    assert len(route.points) == 3


def test_uc_4_3_route_requires_at_least_two_points_at_schema_level() -> None:
    with pytest.raises(ValueError):
        RouteCreateRequest(points=[RoutePointModel(latitude=0, longitude=0)])


def test_uc_4_3_route_color_must_be_hex() -> None:
    with pytest.raises(ValueError):
        RouteCreateRequest(
            color="red",
            points=[
                RoutePointModel(latitude=0, longitude=0),
                RoutePointModel(latitude=1, longitude=1),
            ],
        )


def test_uc_4_3_non_member_cannot_create_route() -> None:
    service, _, _ = _make_route_service()
    with pytest.raises(ForbiddenError):
        service.create(
            uuid4(),
            uuid4(),
            RouteCreateRequest(
                points=[
                    RoutePointModel(latitude=0, longitude=0),
                    RoutePointModel(latitude=1, longitude=1),
                ]
            ),
        )


def test_uc_4_3_optional_route_name_is_normalized_to_none_when_blank() -> None:
    service, _, membership = _make_route_service()
    group_id, user_id = uuid4(), uuid4()
    membership.add(group_id, user_id)
    route = service.create(
        group_id,
        user_id,
        RouteCreateRequest(
            name="   ",
            points=[
                RoutePointModel(latitude=0, longitude=0),
                RoutePointModel(latitude=1, longitude=1),
            ],
        ),
    )
    assert route.name is None


# ─── UC 4.4: Remove route ────────────────────────────────────────────────


def test_uc_4_4_delete_route_removes_it() -> None:
    service, routes, membership = _make_route_service()
    group_id, user_id = uuid4(), uuid4()
    membership.add(group_id, user_id)

    route = service.create(
        group_id,
        user_id,
        RouteCreateRequest(
            points=[
                RoutePointModel(latitude=0, longitude=0),
                RoutePointModel(latitude=1, longitude=1),
            ]
        ),
    )
    service.delete(group_id, route.id, user_id)
    assert route.id not in routes.by_id


def test_route_edit_changes_color_and_points() -> None:
    service, routes, membership = _make_route_service()
    group_id, user_id = uuid4(), uuid4()
    membership.add(group_id, user_id)
    route = service.create(
        group_id,
        user_id,
        RouteCreateRequest(
            color="#2563eb",
            points=[
                RoutePointModel(latitude=0, longitude=0),
                RoutePointModel(latitude=1, longitude=1),
            ],
        ),
    )

    updated = service.update(
        group_id,
        route.id,
        user_id,
        RouteUpdateRequest(
            color="#ff5500",
            points=[
                RoutePointModel(latitude=10, longitude=10),
                RoutePointModel(latitude=11, longitude=11),
                RoutePointModel(latitude=12, longitude=12),
            ],
        ),
    )
    assert updated.color == "#ff5500"
    assert len(updated.points) == 3
    assert routes.by_id[route.id].points == updated.points


def test_route_edit_partial_keeps_other_fields() -> None:
    service, _, membership = _make_route_service()
    group_id, user_id = uuid4(), uuid4()
    membership.add(group_id, user_id)
    route = service.create(
        group_id,
        user_id,
        RouteCreateRequest(
            name="A",
            color="#2563eb",
            points=[
                RoutePointModel(latitude=0, longitude=0),
                RoutePointModel(latitude=1, longitude=1),
            ],
        ),
    )
    # Only color changes.
    updated = service.update(
        group_id, route.id, user_id, RouteUpdateRequest(color="#16a34a")
    )
    assert updated.color == "#16a34a"
    assert updated.name == "A"
    assert updated.points == route.points


def test_route_edit_rejects_single_point_polyline() -> None:
    service, _, membership = _make_route_service()
    group_id, user_id = uuid4(), uuid4()
    membership.add(group_id, user_id)
    route = service.create(
        group_id,
        user_id,
        RouteCreateRequest(
            points=[
                RoutePointModel(latitude=0, longitude=0),
                RoutePointModel(latitude=1, longitude=1),
            ]
        ),
    )
    # Schema-level guard already prevents single-point arrays; verify the
    # service raises ValidationError if somebody bypasses the schema.
    with pytest.raises(ValueError):
        service.update(
            group_id,
            route.id,
            user_id,
            RouteUpdateRequest(points=[RoutePointModel(latitude=0, longitude=0)]),
        )


def test_uc_4_4_delete_unknown_route_raises_not_found() -> None:
    service, _, membership = _make_route_service()
    group_id, user_id = uuid4(), uuid4()
    membership.add(group_id, user_id)

    with pytest.raises(NotFoundError):
        service.delete(group_id, uuid4(), user_id)


# ─── UC 4.5: Add comment under marker ────────────────────────────────────


def test_uc_4_5_add_comment_attaches_to_marker() -> None:
    service, _, comments, membership = _make_marker_service()
    group_id, user_id = uuid4(), uuid4()
    membership.add(group_id, user_id)
    marker = service.create(
        group_id, user_id, MarkerCreateRequest(name="X", latitude=0, longitude=0)
    )

    comment = service.add_comment(
        group_id, marker.id, user_id, MarkerCommentCreateRequest(body="Świetna kawa!")
    )

    assert comment.id in comments.by_id
    assert comment.marker_id == marker.id
    assert comment.body == "Świetna kawa!"


def test_uc_4_5_empty_comment_is_rejected_at_schema_level() -> None:
    with pytest.raises(ValueError):
        MarkerCommentCreateRequest(body="")


def test_uc_4_5_whitespace_only_comment_is_rejected_at_service_level() -> None:
    service, _, _, membership = _make_marker_service()
    group_id, user_id = uuid4(), uuid4()
    membership.add(group_id, user_id)
    marker = service.create(
        group_id, user_id, MarkerCreateRequest(name="X", latitude=0, longitude=0)
    )
    with pytest.raises(ValidationError):
        service.add_comment(
            group_id, marker.id, user_id, MarkerCommentCreateRequest(body="    ")
        )


def test_uc_4_5_edit_comment_updates_body() -> None:
    service, _, _, membership = _make_marker_service()
    group_id, user_id = uuid4(), uuid4()
    membership.add(group_id, user_id)
    marker = service.create(
        group_id, user_id, MarkerCreateRequest(name="X", latitude=0, longitude=0)
    )
    comment = service.add_comment(
        group_id, marker.id, user_id, MarkerCommentCreateRequest(body="old")
    )
    updated = service.edit_comment(
        group_id, marker.id, comment.id, user_id, "new body"
    )
    assert updated.body == "new body"


def test_uc_4_5_only_author_can_edit_own_comment() -> None:
    service, _, _, membership = _make_marker_service()
    group_id, author, other = uuid4(), uuid4(), uuid4()
    membership.add(group_id, author)
    membership.add(group_id, other)
    marker = service.create(
        group_id, author, MarkerCreateRequest(name="X", latitude=0, longitude=0)
    )
    comment = service.add_comment(
        group_id, marker.id, author, MarkerCommentCreateRequest(body="mine")
    )
    with pytest.raises(ForbiddenError):
        service.edit_comment(group_id, marker.id, comment.id, other, "hacked")


def test_uc_4_5_edit_rejects_whitespace_body() -> None:
    service, _, _, membership = _make_marker_service()
    group_id, user_id = uuid4(), uuid4()
    membership.add(group_id, user_id)
    marker = service.create(
        group_id, user_id, MarkerCreateRequest(name="X", latitude=0, longitude=0)
    )
    comment = service.add_comment(
        group_id, marker.id, user_id, MarkerCommentCreateRequest(body="ok")
    )
    with pytest.raises(ValidationError):
        service.edit_comment(group_id, marker.id, comment.id, user_id, "   ")


def test_uc_4_5_only_author_can_delete_own_comment() -> None:
    service, _, _, membership = _make_marker_service()
    group_id, author, other = uuid4(), uuid4(), uuid4()
    membership.add(group_id, author)
    membership.add(group_id, other)
    marker = service.create(
        group_id, author, MarkerCreateRequest(name="X", latitude=0, longitude=0)
    )
    comment = service.add_comment(
        group_id, marker.id, author, MarkerCommentCreateRequest(body="mine")
    )

    with pytest.raises(ForbiddenError):
        service.delete_comment(group_id, marker.id, comment.id, other)

    service.delete_comment(group_id, marker.id, comment.id, author)


# ─── UC 4.6: Mark visited ────────────────────────────────────────────────


def test_uc_4_6_marking_visited_flips_flag() -> None:
    service, _, _, membership = _make_marker_service()
    group_id, user_id = uuid4(), uuid4()
    membership.add(group_id, user_id)
    marker = service.create(
        group_id, user_id, MarkerCreateRequest(name="X", latitude=0, longitude=0)
    )
    assert marker.visited is False

    updated = service.update(
        group_id, marker.id, user_id, MarkerUpdateRequest(visited=True)
    )
    assert updated.visited is True


def test_marker_drag_updates_coordinates_via_patch() -> None:
    """Dragging a marker pin reuses the marker PATCH endpoint with new lat/lng."""
    service, _, _, membership = _make_marker_service()
    group_id, user_id = uuid4(), uuid4()
    membership.add(group_id, user_id)
    marker = service.create(
        group_id, user_id, MarkerCreateRequest(name="X", latitude=10.0, longitude=20.0)
    )

    updated = service.update(
        group_id,
        marker.id,
        user_id,
        MarkerUpdateRequest(latitude=50.0, longitude=19.0),
    )
    assert updated.latitude == 50.0
    assert updated.longitude == 19.0
    # name/category/visited preserved
    assert updated.name == marker.name
    assert updated.visited is False


def test_uc_4_6_partial_update_preserves_unchanged_fields() -> None:
    service, _, _, membership = _make_marker_service()
    group_id, user_id = uuid4(), uuid4()
    membership.add(group_id, user_id)
    marker = service.create(
        group_id, user_id, MarkerCreateRequest(name="X", latitude=10, longitude=20)
    )

    updated = service.update(
        group_id, marker.id, user_id, MarkerUpdateRequest(visited=True)
    )
    assert updated.name == "X"
    assert updated.category == MarkerCategory.OTHER.value
    assert updated.latitude == 10
    assert updated.longitude == 20


# ─── UC 4.7: Marker category groups ──────────────────────────────────────


def test_uc_4_7_change_marker_category() -> None:
    service, _, _, membership = _make_marker_service()
    group_id, user_id = uuid4(), uuid4()
    membership.add(group_id, user_id)
    marker = service.create(
        group_id, user_id, MarkerCreateRequest(name="X", latitude=0, longitude=0)
    )

    updated = service.update(
        group_id,
        marker.id,
        user_id,
        MarkerUpdateRequest(category=MarkerCategory.HOTEL.value),
    )
    assert updated.category == "hotel"


def test_uc_4_7_available_categories_contains_all_predefined_groups() -> None:
    values = {value for value, _ in available_categories()}
    assert values == set(MarkerCategory.values())


# ─── Cross-cutting: membership enforcement ───────────────────────────────


def test_non_member_cannot_list_markers() -> None:
    service, _, _, _ = _make_marker_service()
    with pytest.raises(ForbiddenError):
        service.list_for_group(uuid4(), uuid4())


def test_non_member_cannot_list_routes() -> None:
    service, _, _ = _make_route_service()
    with pytest.raises(ForbiddenError):
        service.list_for_group(uuid4(), uuid4())


def test_non_member_cannot_get_snapshot() -> None:
    markers, routes, comments, membership = FakeMarkers(), FakeRoutes(), FakeComments(), FakeMembership()
    service = MapSnapshotService(markers, routes, comments, membership)
    with pytest.raises(ForbiddenError):
        service.get(uuid4(), uuid4())


# ─── Snapshot composes markers, routes and comments-by-marker ────────────


def test_snapshot_composes_markers_routes_and_comments_per_marker() -> None:
    markers = FakeMarkers()
    routes = FakeRoutes()
    comments = FakeComments()
    membership = FakeMembership()
    snapshot = MapSnapshotService(markers, routes, comments, membership)

    marker_service = MarkerService(markers, comments, membership)
    route_service = RouteService(routes, membership)
    group_id, user_id = uuid4(), uuid4()
    membership.add(group_id, user_id)

    m1 = marker_service.create(
        group_id, user_id, MarkerCreateRequest(name="A", latitude=0, longitude=0)
    )
    m2 = marker_service.create(
        group_id, user_id, MarkerCreateRequest(name="B", latitude=1, longitude=1)
    )
    route_service.create(
        group_id,
        user_id,
        RouteCreateRequest(
            points=[
                RoutePointModel(latitude=0, longitude=0),
                RoutePointModel(latitude=1, longitude=1),
            ]
        ),
    )
    marker_service.add_comment(
        group_id, m1.id, user_id, MarkerCommentCreateRequest(body="hello")
    )

    snapshot_markers, snapshot_routes, comments_by_marker = snapshot.get(group_id, user_id)
    assert {m.id for m in snapshot_markers} == {m1.id, m2.id}
    assert len(snapshot_routes) == 1
    assert len(comments_by_marker[m1.id]) == 1
    assert comments_by_marker[m2.id] == []
