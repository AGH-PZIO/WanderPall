from datetime import datetime, timezone
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.modules.maps.schemas import (
    MapSettingsResponse,
    MapSettingsUpdate,
    MarkerCommentCreate,
    MarkerCommentUpdate,
    MarkerCreate,
    MarkerGroupCreate,
    MarkerGroupUpdate,
    MarkerResponse,
    MarkerUpdate,
    RouteCreate,
    RouteUpdate,
    Waypoint,
)


def test_marker_group_defaults_color_when_not_provided() -> None:
    group = MarkerGroupCreate(name="Restauracje")
    assert group.color == "#3388ff"
    assert group.icon is None


def test_marker_group_update_allows_all_fields_optional() -> None:
    update = MarkerGroupUpdate()
    assert update.name is None
    assert update.color is None
    assert update.icon is None


def test_marker_rejects_latitude_above_90() -> None:
    with pytest.raises(ValidationError):
        MarkerCreate(name="X", latitude=90.01, longitude=0.0)


def test_marker_rejects_latitude_below_minus_90() -> None:
    with pytest.raises(ValidationError):
        MarkerCreate(name="X", latitude=-90.01, longitude=0.0)


def test_marker_rejects_longitude_above_180() -> None:
    with pytest.raises(ValidationError):
        MarkerCreate(name="X", latitude=0.0, longitude=180.01)


def test_marker_rejects_longitude_below_minus_180() -> None:
    with pytest.raises(ValidationError):
        MarkerCreate(name="X", latitude=0.0, longitude=-180.01)


def test_marker_accepts_boundary_coordinates() -> None:
    # polar/meridian boundaries
    north_pole = MarkerCreate(name="North", latitude=90.0, longitude=0.0)
    dateline = MarkerCreate(name="Dateline", latitude=0.0, longitude=180.0)
    assert north_pole.latitude == 90.0
    assert dateline.longitude == 180.0


def test_marker_is_visited_defaults_to_false() -> None:
    marker = MarkerCreate(name="X", latitude=52.23, longitude=21.01)
    assert marker.is_visited is False


def test_marker_update_rejects_out_of_range_latitude() -> None:
    with pytest.raises(ValidationError):
        MarkerUpdate(latitude=91.0)


def test_marker_update_allows_partial_update() -> None:
    update = MarkerUpdate(name="New name")
    assert update.name == "New name"
    assert update.description is None
    assert update.is_visited is None


def test_route_create_defaults_color_and_empty_waypoints() -> None:
    route = RouteCreate(name="Warszawa - Kraków")
    assert route.color == "#ff0000"
    assert route.waypoints == []


def test_route_create_preserves_waypoints_order() -> None:
    route = RouteCreate(
        name="Trip",
        waypoints=[
            Waypoint(latitude=52.2297, longitude=21.0122, order=0),
            Waypoint(latitude=50.0647, longitude=19.9450, order=1),
        ],
    )
    assert len(route.waypoints) == 2
    assert route.waypoints[0].order == 0
    assert route.waypoints[1].latitude == 50.0647


def test_route_update_waypoints_optional() -> None:
    update = RouteUpdate()
    assert update.waypoints is None
    update_with = RouteUpdate(waypoints=[])
    assert update_with.waypoints == []


def test_marker_comment_create_requires_marker_and_content() -> None:
    comment = MarkerCommentCreate(marker_id=uuid4(), content="Świetne miejsce!")
    assert comment.content == "Świetne miejsce!"


def test_marker_comment_update_requires_content() -> None:
    with pytest.raises(ValidationError):
        MarkerCommentUpdate()  # type: ignore[call-arg]


def test_map_settings_update_rejects_zoom_above_18() -> None:
    with pytest.raises(ValidationError):
        MapSettingsUpdate(zoom_level=19)


def test_map_settings_update_rejects_zoom_below_1() -> None:
    with pytest.raises(ValidationError):
        MapSettingsUpdate(zoom_level=0)


def test_map_settings_update_allows_layer_name_only() -> None:
    update = MapSettingsUpdate(map_layer="OpenTopoMap")
    assert update.map_layer == "OpenTopoMap"
    assert update.zoom_level is None


def test_map_settings_update_rejects_invalid_coordinates() -> None:
    with pytest.raises(ValidationError):
        MapSettingsUpdate(center_latitude=91.0)
    with pytest.raises(ValidationError):
        MapSettingsUpdate(center_longitude=-181.0)


def test_marker_response_roundtrip_from_dict() -> None:
    now = datetime.now(timezone.utc)
    payload = {
        "id": uuid4(),
        "user_id": uuid4(),
        "group_id": None,
        "name": "Test",
        "description": None,
        "latitude": 52.23,
        "longitude": 21.01,
        "is_visited": False,
        "created_at": now,
        "updated_at": now,
    }
    response = MarkerResponse.model_validate(payload)
    assert response.latitude == 52.23
    assert response.group_id is None


def test_map_settings_response_from_dict() -> None:
    now = datetime.now(timezone.utc)
    payload = {
        "id": uuid4(),
        "user_id": uuid4(),
        "map_layer": "OpenStreetMap",
        "center_latitude": 52.2297,
        "center_longitude": 21.0122,
        "zoom_level": 6,
        "created_at": now,
        "updated_at": now,
    }
    response = MapSettingsResponse.model_validate(payload)
    assert response.map_layer == "OpenStreetMap"
    assert response.zoom_level == 6
