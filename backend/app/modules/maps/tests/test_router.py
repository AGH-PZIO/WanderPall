"""Unit tests for the maps router.

These tests use FastAPI's TestClient with dependency overrides so no real
database is required. The ``app.modules.maps.db`` module functions are
monkeypatched with in-memory fakes, which lets us exercise every route
(validation, 404s, filtering, the visited-shortcut, comment scoping, etc.)
without touching psycopg.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from typing import Any, Optional
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.database import get_connection
from app.main import app
from app.modules.account.dependencies import get_current_user
from app.modules.account.models import User
from app.modules.maps import db as maps_db
from app.modules.maps.schemas import (
    MapSettingsUpdate,
    MarkerCommentCreate,
    MarkerCommentUpdate,
    MarkerCreate,
    MarkerGroupCreate,
    MarkerGroupUpdate,
    MarkerUpdate,
    RouteCreate,
    RouteUpdate,
)


@dataclass
class _FakeStore:
    marker_groups: dict[UUID, dict[str, Any]] = field(default_factory=dict)
    markers: dict[UUID, dict[str, Any]] = field(default_factory=dict)
    routes: dict[UUID, dict[str, Any]] = field(default_factory=dict)
    comments: dict[UUID, dict[str, Any]] = field(default_factory=dict)
    settings: dict[UUID, dict[str, Any]] = field(default_factory=dict)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _make_user() -> User:
    return User(
        id=uuid4(),
        first_name="Test",
        last_name="User",
        birth_date=date(2000, 1, 1),
        email="test@example.com",
        phone=None,
        password_hash="hash",
        theme="light",
    )


@pytest.fixture
def store() -> _FakeStore:
    return _FakeStore()


@pytest.fixture
def current_user() -> User:
    return _make_user()


@pytest.fixture
def client(
    monkeypatch: pytest.MonkeyPatch,
    store: _FakeStore,
    current_user: User,
) -> TestClient:
    def _scoped(rows: dict[UUID, dict[str, Any]], user_id: UUID) -> list[dict[str, Any]]:
        return [dict(r) for r in rows.values() if r["user_id"] == user_id]

    # --- marker groups -----------------------------------------------------
    def fake_get_marker_groups(_conn: Any, user_id: UUID) -> list[dict[str, Any]]:
        return _scoped(store.marker_groups, user_id)

    def fake_get_marker_group(_conn: Any, group_id: UUID, user_id: UUID) -> Optional[dict[str, Any]]:
        record = store.marker_groups.get(group_id)
        if record and record["user_id"] == user_id:
            return dict(record)
        return None

    def fake_create_marker_group(_conn: Any, user_id: UUID, data: MarkerGroupCreate) -> dict[str, Any]:
        record = {
            "id": uuid4(),
            "user_id": user_id,
            "name": data.name,
            "color": data.color,
            "icon": data.icon,
            "created_at": _now(),
            "updated_at": _now(),
        }
        store.marker_groups[record["id"]] = record
        return dict(record)

    def fake_update_marker_group(
        _conn: Any, group_id: UUID, user_id: UUID, data: MarkerGroupUpdate
    ) -> Optional[dict[str, Any]]:
        record = store.marker_groups.get(group_id)
        if not record or record["user_id"] != user_id:
            return None
        for key in ("name", "color", "icon"):
            value = getattr(data, key)
            if value is not None:
                record[key] = value
        record["updated_at"] = _now()
        return dict(record)

    def fake_delete_marker_group(_conn: Any, group_id: UUID, user_id: UUID) -> bool:
        record = store.marker_groups.get(group_id)
        if not record or record["user_id"] != user_id:
            return False
        del store.marker_groups[group_id]
        return True

    # --- markers -----------------------------------------------------------
    def fake_get_markers(_conn: Any, user_id: UUID, group_id: Optional[UUID] = None) -> list[dict[str, Any]]:
        markers = _scoped(store.markers, user_id)
        if group_id is not None:
            markers = [m for m in markers if m["group_id"] == group_id]
        return markers

    def fake_get_marker(_conn: Any, marker_id: UUID, user_id: UUID) -> Optional[dict[str, Any]]:
        record = store.markers.get(marker_id)
        if record and record["user_id"] == user_id:
            return dict(record)
        return None

    def fake_create_marker(_conn: Any, user_id: UUID, data: MarkerCreate) -> dict[str, Any]:
        record = {
            "id": uuid4(),
            "user_id": user_id,
            "group_id": data.group_id,
            "name": data.name,
            "description": data.description,
            "latitude": data.latitude,
            "longitude": data.longitude,
            "is_visited": data.is_visited,
            "created_at": _now(),
            "updated_at": _now(),
        }
        store.markers[record["id"]] = record
        return dict(record)

    def fake_update_marker(
        _conn: Any, marker_id: UUID, user_id: UUID, data: MarkerUpdate
    ) -> Optional[dict[str, Any]]:
        record = store.markers.get(marker_id)
        if not record or record["user_id"] != user_id:
            return None
        for key in ("name", "description", "latitude", "longitude", "group_id", "is_visited"):
            value = getattr(data, key)
            if value is not None:
                record[key] = value
        record["updated_at"] = _now()
        return dict(record)

    def fake_delete_marker(_conn: Any, marker_id: UUID, user_id: UUID) -> bool:
        record = store.markers.get(marker_id)
        if not record or record["user_id"] != user_id:
            return False
        del store.markers[marker_id]
        return True

    # --- routes ------------------------------------------------------------
    def fake_get_routes(_conn: Any, user_id: UUID) -> list[dict[str, Any]]:
        return _scoped(store.routes, user_id)

    def fake_get_route(_conn: Any, route_id: UUID, user_id: UUID) -> Optional[dict[str, Any]]:
        record = store.routes.get(route_id)
        if record and record["user_id"] == user_id:
            return dict(record)
        return None

    def fake_create_route(_conn: Any, user_id: UUID, data: RouteCreate) -> dict[str, Any]:
        record = {
            "id": uuid4(),
            "user_id": user_id,
            "name": data.name,
            "description": data.description,
            "color": data.color,
            "waypoints": [wp.model_dump() for wp in data.waypoints],
            "created_at": _now(),
            "updated_at": _now(),
        }
        store.routes[record["id"]] = record
        return dict(record)

    def fake_update_route(
        _conn: Any, route_id: UUID, user_id: UUID, data: RouteUpdate
    ) -> Optional[dict[str, Any]]:
        record = store.routes.get(route_id)
        if not record or record["user_id"] != user_id:
            return None
        if data.name is not None:
            record["name"] = data.name
        if data.description is not None:
            record["description"] = data.description
        if data.color is not None:
            record["color"] = data.color
        if data.waypoints is not None:
            record["waypoints"] = [wp.model_dump() for wp in data.waypoints]
        record["updated_at"] = _now()
        return dict(record)

    def fake_delete_route(_conn: Any, route_id: UUID, user_id: UUID) -> bool:
        record = store.routes.get(route_id)
        if not record or record["user_id"] != user_id:
            return False
        del store.routes[route_id]
        return True

    # --- marker comments ---------------------------------------------------
    def fake_get_marker_comments(_conn: Any, marker_id: UUID, user_id: UUID) -> list[dict[str, Any]]:
        return [
            dict(c)
            for c in store.comments.values()
            if c["marker_id"] == marker_id and c["user_id"] == user_id
        ]

    def fake_create_marker_comment(_conn: Any, user_id: UUID, data: MarkerCommentCreate) -> dict[str, Any]:
        record = {
            "id": uuid4(),
            "user_id": user_id,
            "marker_id": data.marker_id,
            "content": data.content,
            "created_at": _now(),
            "updated_at": _now(),
        }
        store.comments[record["id"]] = record
        return dict(record)

    def fake_update_marker_comment(
        _conn: Any, comment_id: UUID, user_id: UUID, data: MarkerCommentUpdate
    ) -> Optional[dict[str, Any]]:
        record = store.comments.get(comment_id)
        if not record or record["user_id"] != user_id:
            return None
        record["content"] = data.content
        record["updated_at"] = _now()
        return dict(record)

    def fake_delete_marker_comment(_conn: Any, comment_id: UUID, user_id: UUID) -> bool:
        record = store.comments.get(comment_id)
        if not record or record["user_id"] != user_id:
            return False
        del store.comments[comment_id]
        return True

    # --- settings ----------------------------------------------------------
    def fake_get_user_map_settings(_conn: Any, user_id: UUID) -> Optional[dict[str, Any]]:
        record = store.settings.get(user_id)
        return dict(record) if record else None

    def fake_update_user_map_settings(
        _conn: Any, user_id: UUID, data: MapSettingsUpdate
    ) -> dict[str, Any]:
        existing = store.settings.get(user_id)
        if existing is None:
            existing = {
                "id": uuid4(),
                "user_id": user_id,
                "map_layer": "OpenStreetMap",
                "center_latitude": 52.2297,
                "center_longitude": 21.0122,
                "zoom_level": 6,
                "created_at": _now(),
                "updated_at": _now(),
            }
        if data.map_layer is not None:
            existing["map_layer"] = data.map_layer
        if data.center_latitude is not None:
            existing["center_latitude"] = data.center_latitude
        if data.center_longitude is not None:
            existing["center_longitude"] = data.center_longitude
        if data.zoom_level is not None:
            existing["zoom_level"] = data.zoom_level
        existing["updated_at"] = _now()
        store.settings[user_id] = existing
        return dict(existing)

    # patch the db module
    monkeypatch.setattr(maps_db, "get_marker_groups", fake_get_marker_groups)
    monkeypatch.setattr(maps_db, "get_marker_group", fake_get_marker_group)
    monkeypatch.setattr(maps_db, "create_marker_group", fake_create_marker_group)
    monkeypatch.setattr(maps_db, "update_marker_group", fake_update_marker_group)
    monkeypatch.setattr(maps_db, "delete_marker_group", fake_delete_marker_group)
    monkeypatch.setattr(maps_db, "get_markers", fake_get_markers)
    monkeypatch.setattr(maps_db, "get_marker", fake_get_marker)
    monkeypatch.setattr(maps_db, "create_marker", fake_create_marker)
    monkeypatch.setattr(maps_db, "update_marker", fake_update_marker)
    monkeypatch.setattr(maps_db, "delete_marker", fake_delete_marker)
    monkeypatch.setattr(maps_db, "get_routes", fake_get_routes)
    monkeypatch.setattr(maps_db, "get_route", fake_get_route)
    monkeypatch.setattr(maps_db, "create_route", fake_create_route)
    monkeypatch.setattr(maps_db, "update_route", fake_update_route)
    monkeypatch.setattr(maps_db, "delete_route", fake_delete_route)
    monkeypatch.setattr(maps_db, "get_marker_comments", fake_get_marker_comments)
    monkeypatch.setattr(maps_db, "create_marker_comment", fake_create_marker_comment)
    monkeypatch.setattr(maps_db, "update_marker_comment", fake_update_marker_comment)
    monkeypatch.setattr(maps_db, "delete_marker_comment", fake_delete_marker_comment)
    monkeypatch.setattr(maps_db, "get_user_map_settings", fake_get_user_map_settings)
    monkeypatch.setattr(maps_db, "update_user_map_settings", fake_update_user_map_settings)

    app.dependency_overrides[get_current_user] = lambda: current_user
    app.dependency_overrides[get_connection] = lambda: object()

    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Status + smoke
# ---------------------------------------------------------------------------


def test_status_endpoint_does_not_require_auth(monkeypatch: pytest.MonkeyPatch) -> None:
    raw_client = TestClient(app)
    response = raw_client.get("/maps/status")
    assert response.status_code == 200
    assert response.json() == {"module": "maps", "status": "active"}


# ---------------------------------------------------------------------------
# Marker groups
# ---------------------------------------------------------------------------


def test_marker_group_crud_roundtrip(client: TestClient) -> None:
    response = client.post("/maps/marker-groups", json={"name": "Restauracje", "color": "#ff8800"})
    assert response.status_code == 201, response.text
    group = response.json()
    assert group["name"] == "Restauracje"
    assert group["color"] == "#ff8800"

    listing = client.get("/maps/marker-groups")
    assert listing.status_code == 200
    assert listing.json()["total"] == 1

    fetched = client.get(f"/maps/marker-groups/{group['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["id"] == group["id"]

    patched = client.patch(f"/maps/marker-groups/{group['id']}", json={"name": "Knajpy"})
    assert patched.status_code == 200
    assert patched.json()["name"] == "Knajpy"
    # color left alone
    assert patched.json()["color"] == "#ff8800"

    deleted = client.delete(f"/maps/marker-groups/{group['id']}")
    assert deleted.status_code == 200
    assert deleted.json() == {"status": "deleted"}

    missing = client.get(f"/maps/marker-groups/{group['id']}")
    assert missing.status_code == 404


def test_marker_group_404_on_unknown_id(client: TestClient) -> None:
    unknown = uuid4()
    assert client.get(f"/maps/marker-groups/{unknown}").status_code == 404
    assert client.patch(f"/maps/marker-groups/{unknown}", json={"name": "X"}).status_code == 404
    assert client.delete(f"/maps/marker-groups/{unknown}").status_code == 404


# ---------------------------------------------------------------------------
# Markers (Use case: 4.1 Dodanie znacznika / 4.2 Usunięcie znacznika / 4.6 Oznaczenie jako odwiedzonego)
# ---------------------------------------------------------------------------


def test_add_marker_appears_on_listing(client: TestClient) -> None:
    """Use case 4.1: adding a marker persists it so it shows up on subsequent map renders."""
    response = client.post(
        "/maps/markers",
        json={"name": "Barbakan", "latitude": 52.2497, "longitude": 21.0120},
    )
    assert response.status_code == 201, response.text
    marker = response.json()
    assert marker["name"] == "Barbakan"
    assert marker["is_visited"] is False

    listing = client.get("/maps/markers")
    assert listing.status_code == 200
    items = listing.json()["items"]
    assert len(items) == 1
    assert items[0]["id"] == marker["id"]


def test_delete_marker_removes_it(client: TestClient) -> None:
    """Use case 4.2: deleting a marker removes it from subsequent renders."""
    marker = client.post(
        "/maps/markers",
        json={"name": "Rynek", "latitude": 50.0614, "longitude": 19.9366},
    ).json()
    assert client.delete(f"/maps/markers/{marker['id']}").status_code == 200
    assert client.get("/maps/markers").json()["total"] == 0


def test_marker_coordinate_bounds_enforced(client: TestClient) -> None:
    invalid = client.post(
        "/maps/markers",
        json={"name": "Bad", "latitude": 95.0, "longitude": 21.0},
    )
    assert invalid.status_code == 422


def test_mark_marker_visited_shortcut(client: TestClient) -> None:
    """Use case 4.6: dedicated endpoint flips is_visited without touching other fields."""
    marker = client.post(
        "/maps/markers",
        json={"name": "Wawel", "latitude": 50.0541, "longitude": 19.9352, "description": "Zamek"},
    ).json()
    assert marker["is_visited"] is False

    visited = client.post(f"/maps/markers/{marker['id']}/visited")
    assert visited.status_code == 200
    body = visited.json()
    assert body["is_visited"] is True
    assert body["description"] == "Zamek"


def test_marker_filter_by_group(client: TestClient) -> None:
    """Use case 4.7: functional groups let the UI filter markers."""
    group = client.post("/maps/marker-groups", json={"name": "Zabytki"}).json()
    in_group = client.post(
        "/maps/markers",
        json={"name": "A", "latitude": 52.0, "longitude": 21.0, "group_id": group["id"]},
    ).json()
    client.post("/maps/markers", json={"name": "B", "latitude": 50.0, "longitude": 19.0})

    filtered = client.get("/maps/markers", params={"group_id": group["id"]})
    assert filtered.status_code == 200
    items = filtered.json()["items"]
    assert len(items) == 1
    assert items[0]["id"] == in_group["id"]

    all_markers = client.get("/maps/markers")
    assert all_markers.json()["total"] == 2


def test_marker_404_on_unknown(client: TestClient) -> None:
    unknown = uuid4()
    assert client.get(f"/maps/markers/{unknown}").status_code == 404
    assert client.patch(f"/maps/markers/{unknown}", json={"name": "X"}).status_code == 404
    assert client.delete(f"/maps/markers/{unknown}").status_code == 404
    assert client.post(f"/maps/markers/{unknown}/visited").status_code == 404


# ---------------------------------------------------------------------------
# Routes (Use case: 4.3 Nakreślenie trasy / 4.4 Usunięcie trasy)
# ---------------------------------------------------------------------------


def test_route_create_with_waypoints(client: TestClient) -> None:
    """Use case 4.3: drawing a route stores its waypoints and color."""
    response = client.post(
        "/maps/routes",
        json={
            "name": "Warsaw -> Krakow",
            "color": "#0000ff",
            "waypoints": [
                {"latitude": 52.2297, "longitude": 21.0122, "order": 0},
                {"latitude": 50.0647, "longitude": 19.9450, "order": 1},
            ],
        },
    )
    assert response.status_code == 201, response.text
    route = response.json()
    assert len(route["waypoints"]) == 2
    assert route["color"] == "#0000ff"


def test_route_delete(client: TestClient) -> None:
    """Use case 4.4: route removal disappears from listing."""
    route = client.post("/maps/routes", json={"name": "R"}).json()
    assert client.delete(f"/maps/routes/{route['id']}").status_code == 200
    assert client.get("/maps/routes").json()["total"] == 0


def test_route_update_replaces_waypoints(client: TestClient) -> None:
    route = client.post("/maps/routes", json={"name": "R", "waypoints": []}).json()
    updated = client.patch(
        f"/maps/routes/{route['id']}",
        json={
            "waypoints": [
                {"latitude": 1.0, "longitude": 1.0, "order": 0},
                {"latitude": 2.0, "longitude": 2.0, "order": 1},
            ]
        },
    ).json()
    assert len(updated["waypoints"]) == 2


def test_route_404_on_unknown(client: TestClient) -> None:
    unknown = uuid4()
    assert client.get(f"/maps/routes/{unknown}").status_code == 404
    assert client.delete(f"/maps/routes/{unknown}").status_code == 404


# ---------------------------------------------------------------------------
# Marker comments (Use case: 4.5 Dodanie komentarza)
# ---------------------------------------------------------------------------


def test_comment_lifecycle(client: TestClient) -> None:
    """Use case 4.5: user attaches a comment to a marker."""
    marker = client.post(
        "/maps/markers",
        json={"name": "Comment target", "latitude": 0.0, "longitude": 0.0},
    ).json()

    created = client.post(
        f"/maps/markers/{marker['id']}/comments",
        json={"marker_id": marker["id"], "content": "Polecam!"},
    )
    assert created.status_code == 201, created.text
    comment = created.json()
    assert comment["content"] == "Polecam!"

    listing = client.get(f"/maps/markers/{marker['id']}/comments")
    assert listing.status_code == 200
    assert listing.json()["total"] == 1

    updated = client.patch(
        f"/maps/markers/{marker['id']}/comments/{comment['id']}",
        json={"content": "Naprawdę polecam!"},
    )
    assert updated.status_code == 200
    assert updated.json()["content"] == "Naprawdę polecam!"

    deleted = client.delete(f"/maps/markers/{marker['id']}/comments/{comment['id']}")
    assert deleted.status_code == 200
    assert client.get(f"/maps/markers/{marker['id']}/comments").json()["total"] == 0


def test_comment_returns_404_when_marker_missing(client: TestClient) -> None:
    unknown_marker = uuid4()
    response = client.post(
        f"/maps/markers/{unknown_marker}/comments",
        json={"marker_id": str(unknown_marker), "content": "X"},
    )
    assert response.status_code == 404

    assert client.get(f"/maps/markers/{unknown_marker}/comments").status_code == 404


# ---------------------------------------------------------------------------
# User map settings (Use case: 4.8 Zmiana warstwy map)
# ---------------------------------------------------------------------------


def test_settings_returns_defaults_before_any_update(client: TestClient) -> None:
    response = client.get("/maps/settings")
    assert response.status_code == 200
    body = response.json()
    assert body["map_layer"] == "OpenStreetMap"
    assert body["zoom_level"] == 6


def test_settings_update_persists_layer_change(client: TestClient) -> None:
    """Use case 4.8: changing the map layer stores it for the user."""
    response = client.patch("/maps/settings", json={"map_layer": "OpenTopoMap"})
    assert response.status_code == 200
    assert response.json()["map_layer"] == "OpenTopoMap"

    read_back = client.get("/maps/settings")
    assert read_back.json()["map_layer"] == "OpenTopoMap"


def test_settings_validation_rejects_invalid_zoom(client: TestClient) -> None:
    assert client.patch("/maps/settings", json={"zoom_level": 42}).status_code == 422
    assert client.patch("/maps/settings", json={"zoom_level": 0}).status_code == 422


# ---------------------------------------------------------------------------
# Isolation between users
# ---------------------------------------------------------------------------


def test_user_b_cannot_see_user_a_markers(
    monkeypatch: pytest.MonkeyPatch, client: TestClient, current_user: User
) -> None:
    """Per-user scoping: different users see disjoint data."""
    client.post("/maps/markers", json={"name": "A", "latitude": 0.0, "longitude": 0.0})
    assert client.get("/maps/markers").json()["total"] == 1

    other_user = _make_user()
    app.dependency_overrides[get_current_user] = lambda: other_user
    try:
        second_client = TestClient(app)
        assert second_client.get("/maps/markers").json()["total"] == 0
    finally:
        app.dependency_overrides[get_current_user] = lambda: current_user
