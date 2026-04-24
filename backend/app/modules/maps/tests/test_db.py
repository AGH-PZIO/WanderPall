"""Tests that inspect SQL construction in app.modules.maps.db.

We don't run a real database here — instead we substitute a
``FakeConnection`` that records every SQL string + params pair and returns a
preset response. That's enough to lock in:

- the table/column list we SELECT/INSERT/UPDATE is correct
- partial update builders skip unchanged fields
- delete helpers surface psycopg's ``rowcount`` signal via a bool
- JSONB waypoints are serialized before hitting the driver
"""

from __future__ import annotations

import json
from typing import Any
from uuid import uuid4

import pytest

from app.modules.maps import db
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
    Waypoint,
)


class _FakeCursor:
    def __init__(
        self,
        calls: list[tuple[str, Any]],
        response: Any = None,
        rowcount: int = 0,
    ) -> None:
        self._calls = calls
        self._response = response
        self.rowcount = rowcount
        self._last_result: Any = None

    def __enter__(self) -> "_FakeCursor":
        return self

    def __exit__(self, *exc: Any) -> None:
        return None

    def execute(self, query: str, params: Any = ()) -> "_FakeCursor":
        self._calls.append((query, params))
        if isinstance(self._response, list):
            self._last_result = list(self._response)
        else:
            self._last_result = self._response
        return self

    def fetchone(self) -> Any:
        result = self._last_result
        if isinstance(result, list):
            return result[0] if result else None
        return result

    def fetchall(self) -> list[Any]:
        result = self._last_result
        if isinstance(result, list):
            return result
        if result is None:
            return []
        return [result]


class _FakeConnection:
    def __init__(self, response: Any = None, rowcount: int = 0) -> None:
        self.calls: list[tuple[str, Any]] = []
        self._response = response
        self._rowcount = rowcount

    def cursor(self, *args: Any, **kwargs: Any) -> _FakeCursor:
        return _FakeCursor(self.calls, self._response, self._rowcount)


# ---------------------------------------------------------------------------
# Marker groups
# ---------------------------------------------------------------------------


def test_get_marker_groups_scopes_by_user_id() -> None:
    conn = _FakeConnection(response=[])
    user_id = uuid4()

    db.get_marker_groups(conn, user_id)

    sql, params = conn.calls[0]
    assert "FROM maps.marker_groups" in sql
    assert "WHERE user_id = %s" in sql
    assert params == (str(user_id),)


def test_create_marker_group_passes_all_columns() -> None:
    conn = _FakeConnection(response={"id": uuid4()})
    user_id = uuid4()
    data = MarkerGroupCreate(name="Cafes", color="#112233", icon="coffee")

    db.create_marker_group(conn, user_id, data)

    sql, params = conn.calls[0]
    assert "INSERT INTO maps.marker_groups" in sql
    assert params == (str(user_id), "Cafes", "#112233", "coffee")


def test_update_marker_group_skips_none_fields() -> None:
    conn = _FakeConnection(response={"id": uuid4()})
    db.update_marker_group(conn, uuid4(), uuid4(), MarkerGroupUpdate(name="Only name"))

    sql, params = conn.calls[0]
    assert "SET name = %s" in sql
    assert "color" not in sql.split("SET")[1].split("WHERE")[0]
    assert "updated_at = NOW()" in sql
    assert params[0] == "Only name"


def test_update_marker_group_returns_existing_when_nothing_to_update() -> None:
    conn = _FakeConnection(response={"id": uuid4(), "name": "Existing"})
    result = db.update_marker_group(conn, uuid4(), uuid4(), MarkerGroupUpdate())

    sql, _ = conn.calls[0]
    # Falls back to the SELECT path rather than running UPDATE with no SET clause.
    assert sql.startswith("SELECT")
    assert result == {"id": result["id"], "name": "Existing"}


def test_delete_marker_group_returns_true_when_row_deleted() -> None:
    conn = _FakeConnection(rowcount=1)
    assert db.delete_marker_group(conn, uuid4(), uuid4()) is True

    conn_none = _FakeConnection(rowcount=0)
    assert db.delete_marker_group(conn_none, uuid4(), uuid4()) is False


# ---------------------------------------------------------------------------
# Markers
# ---------------------------------------------------------------------------


def test_get_markers_filters_by_group_when_provided() -> None:
    conn = _FakeConnection(response=[])
    user_id = uuid4()
    group_id = uuid4()

    db.get_markers(conn, user_id, group_id)
    sql, params = conn.calls[0]
    assert "group_id = %s" in sql
    assert params == (str(user_id), str(group_id))


def test_get_markers_returns_all_for_user_when_no_group() -> None:
    conn = _FakeConnection(response=[])
    user_id = uuid4()

    db.get_markers(conn, user_id)
    sql, params = conn.calls[0]
    assert "group_id" not in sql.split("WHERE")[1]
    assert params == (str(user_id),)


def test_create_marker_stringifies_optional_group_id() -> None:
    conn = _FakeConnection(response={"id": uuid4()})
    user_id = uuid4()
    group_id = uuid4()
    data = MarkerCreate(
        name="Point",
        description="Nice",
        latitude=52.0,
        longitude=21.0,
        group_id=group_id,
        is_visited=True,
    )

    db.create_marker(conn, user_id, data)
    _, params = conn.calls[0]
    assert params == (
        str(user_id),
        "Point",
        "Nice",
        "52.0",
        "21.0",
        str(group_id),
        True,
    )


def test_create_marker_allows_null_group_id() -> None:
    conn = _FakeConnection(response={"id": uuid4()})
    data = MarkerCreate(name="Nogroup", latitude=0.0, longitude=0.0)

    db.create_marker(conn, uuid4(), data)
    _, params = conn.calls[0]
    assert params[5] is None


def test_update_marker_only_sets_provided_fields() -> None:
    conn = _FakeConnection(response={"id": uuid4()})
    db.update_marker(conn, uuid4(), uuid4(), MarkerUpdate(is_visited=True))

    sql, params = conn.calls[0]
    assert sql.startswith("UPDATE maps.markers")
    assert "is_visited = %s" in sql
    assert "latitude" not in sql.split("SET")[1].split("WHERE")[0]
    assert params[0] is True


def test_delete_marker_reports_rowcount() -> None:
    assert db.delete_marker(_FakeConnection(rowcount=1), uuid4(), uuid4()) is True
    assert db.delete_marker(_FakeConnection(rowcount=0), uuid4(), uuid4()) is False


# ---------------------------------------------------------------------------
# Routes (JSONB waypoints)
# ---------------------------------------------------------------------------


def test_create_route_serializes_waypoints_to_json() -> None:
    conn = _FakeConnection(response={"id": uuid4()})
    data = RouteCreate(
        name="Trip",
        waypoints=[
            Waypoint(latitude=1.0, longitude=2.0, order=0),
            Waypoint(latitude=3.0, longitude=4.0, order=1),
        ],
    )

    db.create_route(conn, uuid4(), data)
    _, params = conn.calls[0]
    waypoints_json = params[4]
    parsed = json.loads(waypoints_json)
    assert len(parsed) == 2
    assert parsed[0] == {"latitude": 1.0, "longitude": 2.0, "order": 0}


def test_update_route_serializes_waypoints_when_present() -> None:
    conn = _FakeConnection(response={"id": uuid4()})
    data = RouteUpdate(
        name="Renamed",
        waypoints=[Waypoint(latitude=5.0, longitude=6.0, order=0)],
    )

    db.update_route(conn, uuid4(), uuid4(), data)
    sql, params = conn.calls[0]
    assert "name = %s" in sql
    assert "waypoints = %s" in sql
    parsed = json.loads(params[1])
    assert parsed == [{"latitude": 5.0, "longitude": 6.0, "order": 0}]


def test_delete_route_rowcount() -> None:
    assert db.delete_route(_FakeConnection(rowcount=1), uuid4(), uuid4()) is True
    assert db.delete_route(_FakeConnection(rowcount=0), uuid4(), uuid4()) is False


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------


def test_create_marker_comment_links_to_marker() -> None:
    conn = _FakeConnection(response={"id": uuid4()})
    user_id = uuid4()
    marker_id = uuid4()
    data = MarkerCommentCreate(marker_id=marker_id, content="Ładnie")

    db.create_marker_comment(conn, user_id, data)
    sql, params = conn.calls[0]
    assert "INSERT INTO maps.marker_comments" in sql
    assert params == (str(user_id), str(marker_id), "Ładnie")


def test_update_marker_comment_sets_content_and_timestamp() -> None:
    conn = _FakeConnection(response={"id": uuid4()})
    db.update_marker_comment(conn, uuid4(), uuid4(), MarkerCommentUpdate(content="Updated"))
    sql, params = conn.calls[0]
    assert "content = %s" in sql
    assert "updated_at = NOW()" in sql
    assert params[0] == "Updated"


def test_delete_marker_comment_rowcount() -> None:
    assert db.delete_marker_comment(_FakeConnection(rowcount=1), uuid4(), uuid4()) is True
    assert db.delete_marker_comment(_FakeConnection(rowcount=0), uuid4(), uuid4()) is False


# ---------------------------------------------------------------------------
# User map settings (upsert semantics)
# ---------------------------------------------------------------------------


class _MultiResponseConnection:
    """FakeConnection that hands out different responses per .cursor() call."""

    def __init__(self, responses: list[Any], rowcounts: list[int] | None = None) -> None:
        self.calls: list[tuple[str, Any]] = []
        self._responses = list(responses)
        self._rowcounts = list(rowcounts or [0] * len(responses))

    def cursor(self, *args: Any, **kwargs: Any) -> _FakeCursor:
        response = self._responses.pop(0) if self._responses else None
        rowcount = self._rowcounts.pop(0) if self._rowcounts else 0
        return _FakeCursor(self.calls, response, rowcount)


def test_update_user_map_settings_inserts_when_missing() -> None:
    """If no existing row, `update_user_map_settings` should run an INSERT."""
    # first cursor() is the SELECT (existing), second is the INSERT
    conn = _MultiResponseConnection(responses=[None, {"id": uuid4()}])
    db.update_user_map_settings(conn, uuid4(), MapSettingsUpdate(map_layer="OpenTopoMap"))

    sqls = [c[0] for c in conn.calls]
    assert sqls[0].startswith("SELECT")
    assert sqls[1].startswith("INSERT INTO maps.user_map_settings")


def test_update_user_map_settings_updates_when_existing() -> None:
    existing = {"id": uuid4(), "user_id": uuid4(), "map_layer": "OpenStreetMap"}
    conn = _MultiResponseConnection(responses=[existing, existing])
    db.update_user_map_settings(conn, uuid4(), MapSettingsUpdate(map_layer="OpenTopoMap"))

    sqls = [c[0] for c in conn.calls]
    assert sqls[0].startswith("SELECT")
    assert sqls[1].startswith("UPDATE maps.user_map_settings")
    assert "map_layer = %s" in sqls[1]


def test_update_user_map_settings_with_empty_payload_and_existing_row_returns_existing() -> None:
    existing = {"id": uuid4(), "user_id": uuid4(), "map_layer": "OpenStreetMap"}
    conn = _MultiResponseConnection(responses=[existing])

    result = db.update_user_map_settings(conn, uuid4(), MapSettingsUpdate())
    assert result == existing
    # only the SELECT was run; no INSERT or UPDATE
    assert len(conn.calls) == 1
    assert conn.calls[0][0].startswith("SELECT")
