import json
from uuid import UUID
from typing import Optional

import psycopg
from psycopg import Connection
from psycopg.rows import Row, dict_row

from app.modules.maps.schemas import (
    MarkerGroupCreate,
    MarkerGroupUpdate,
    MarkerCreate,
    MarkerUpdate,
    RouteCreate,
    RouteUpdate,
    MarkerCommentCreate,
    MarkerCommentUpdate,
    MapSettingsUpdate,
)


def get_marker_groups(connection: Connection, user_id: UUID) -> list[Row]:
    with connection.cursor(row_factory=dict_row) as cur:
        return cur.execute(
            "SELECT id, user_id, name, color, icon, created_at, updated_at FROM maps.marker_groups WHERE user_id = %s ORDER BY created_at DESC",
            (str(user_id),)
        ).fetchall()


def get_marker_group(connection: Connection, group_id: UUID, user_id: UUID) -> Optional[Row]:
    with connection.cursor(row_factory=dict_row) as cur:
        return cur.execute(
            "SELECT id, user_id, name, color, icon, created_at, updated_at FROM maps.marker_groups WHERE id = %s AND user_id = %s",
            (str(group_id), str(user_id))
        ).fetchone()


def create_marker_group(connection: Connection, user_id: UUID, data: MarkerGroupCreate) -> Row:
    with connection.cursor(row_factory=dict_row) as cur:
        return cur.execute(
            "INSERT INTO maps.marker_groups (user_id, name, color, icon) VALUES (%s, %s, %s, %s) RETURNING id, user_id, name, color, icon, created_at, updated_at",
            (str(user_id), data.name, data.color, data.icon)
        ).fetchone()


def update_marker_group(
    connection: Connection, group_id: UUID, user_id: UUID, data: MarkerGroupUpdate
) -> Optional[Row]:
    updates = []
    params = []

    if data.name is not None:
        params.append(data.name)
        updates.append("name = %s")
    if data.color is not None:
        params.append(data.color)
        updates.append("color = %s")
    if data.icon is not None:
        params.append(data.icon)
        updates.append("icon = %s")

    if not updates:
        return get_marker_group(connection, group_id, user_id)

    updates.append("updated_at = NOW()")
    params.append(str(group_id))
    params.append(str(user_id))

    query = "UPDATE maps.marker_groups SET " + ", ".join(updates) + " WHERE id = %s AND user_id = %s RETURNING id, user_id, name, color, icon, created_at, updated_at"

    with connection.cursor(row_factory=dict_row) as cur:
        return cur.execute(query, params).fetchone()


def delete_marker_group(connection: Connection, group_id: UUID, user_id: UUID) -> bool:
    with connection.cursor() as cur:
        cur.execute(
            "DELETE FROM maps.marker_groups WHERE id = %s AND user_id = %s",
            (str(group_id), str(user_id))
        )
        return cur.rowcount > 0


def get_markers(connection: Connection, user_id: UUID, group_id: Optional[UUID] = None) -> list[Row]:
    with connection.cursor(row_factory=dict_row) as cur:
        if group_id:
            return cur.execute(
                "SELECT id, user_id, group_id, name, description, latitude, longitude, is_visited, created_at, updated_at FROM maps.markers WHERE user_id = %s AND group_id = %s ORDER BY created_at DESC",
                (str(user_id), str(group_id))
            ).fetchall()
        return cur.execute(
            "SELECT id, user_id, group_id, name, description, latitude, longitude, is_visited, created_at, updated_at FROM maps.markers WHERE user_id = %s ORDER BY created_at DESC",
            (str(user_id),)
        ).fetchall()


def get_marker(connection: Connection, marker_id: UUID, user_id: UUID) -> Optional[Row]:
    with connection.cursor(row_factory=dict_row) as cur:
        return cur.execute(
            "SELECT id, user_id, group_id, name, description, latitude, longitude, is_visited, created_at, updated_at FROM maps.markers WHERE id = %s AND user_id = %s",
            (str(marker_id), str(user_id))
        ).fetchone()


def create_marker(connection: Connection, user_id: UUID, data: MarkerCreate) -> Row:
    with connection.cursor(row_factory=dict_row) as cur:
        group_id_str = str(data.group_id) if data.group_id else None
        return cur.execute(
            "INSERT INTO maps.markers (user_id, name, description, latitude, longitude, group_id, is_visited) VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id, user_id, group_id, name, description, latitude, longitude, is_visited, created_at, updated_at",
            (str(user_id), data.name, data.description, str(data.latitude), str(data.longitude), group_id_str, data.is_visited)
        ).fetchone()


def update_marker(
    connection: Connection, marker_id: UUID, user_id: UUID, data: MarkerUpdate
) -> Optional[Row]:
    updates = []
    params = []

    if data.name is not None:
        params.append(data.name)
        updates.append("name = %s")
    if data.description is not None:
        params.append(data.description)
        updates.append("description = %s")
    if data.latitude is not None:
        params.append(str(data.latitude))
        updates.append("latitude = %s")
    if data.longitude is not None:
        params.append(str(data.longitude))
        updates.append("longitude = %s")
    if data.group_id is not None:
        params.append(str(data.group_id) if data.group_id else None)
        updates.append("group_id = %s")
    if data.is_visited is not None:
        params.append(data.is_visited)
        updates.append("is_visited = %s")

    if not updates:
        return get_marker(connection, marker_id, user_id)

    updates.append("updated_at = NOW()")
    params.append(str(marker_id))
    params.append(str(user_id))

    query = "UPDATE maps.markers SET " + ", ".join(updates) + " WHERE id = %s AND user_id = %s RETURNING id, user_id, group_id, name, description, latitude, longitude, is_visited, created_at, updated_at"

    with connection.cursor(row_factory=dict_row) as cur:
        return cur.execute(query, params).fetchone()


def delete_marker(connection: Connection, marker_id: UUID, user_id: UUID) -> bool:
    with connection.cursor() as cur:
        cur.execute(
            "DELETE FROM maps.markers WHERE id = %s AND user_id = %s",
            (str(marker_id), str(user_id))
        )
        return cur.rowcount > 0


def get_routes(connection: Connection, user_id: UUID) -> list[Row]:
    with connection.cursor(row_factory=dict_row) as cur:
        return cur.execute(
            "SELECT id, user_id, name, description, color, waypoints, created_at, updated_at FROM maps.routes WHERE user_id = %s ORDER BY created_at DESC",
            (str(user_id),)
        ).fetchall()


def get_route(connection: Connection, route_id: UUID, user_id: UUID) -> Optional[Row]:
    with connection.cursor(row_factory=dict_row) as cur:
        return cur.execute(
            "SELECT id, user_id, name, description, color, waypoints, created_at, updated_at FROM maps.routes WHERE id = %s AND user_id = %s",
            (str(route_id), str(user_id))
        ).fetchone()


def create_route(connection: Connection, user_id: UUID, data: RouteCreate) -> Row:
    waypoints_json = json.dumps([wp.model_dump() for wp in data.waypoints])
    with connection.cursor(row_factory=dict_row) as cur:
        return cur.execute(
            "INSERT INTO maps.routes (user_id, name, description, color, waypoints) VALUES (%s, %s, %s, %s, %s) RETURNING id, user_id, name, description, color, waypoints, created_at, updated_at",
            (str(user_id), data.name, data.description, data.color, waypoints_json)
        ).fetchone()


def update_route(
    connection: Connection, route_id: UUID, user_id: UUID, data: RouteUpdate
) -> Optional[Row]:
    updates = []
    params = []

    if data.name is not None:
        params.append(data.name)
        updates.append("name = %s")
    if data.description is not None:
        params.append(data.description)
        updates.append("description = %s")
    if data.color is not None:
        params.append(data.color)
        updates.append("color = %s")
    if data.waypoints is not None:
        params.append(json.dumps([wp.model_dump() for wp in data.waypoints]))
        updates.append("waypoints = %s")

    if not updates:
        return get_route(connection, route_id, user_id)

    updates.append("updated_at = NOW()")
    params.append(str(route_id))
    params.append(str(user_id))

    query = "UPDATE maps.routes SET " + ", ".join(updates) + " WHERE id = %s AND user_id = %s RETURNING id, user_id, name, description, color, waypoints, created_at, updated_at"

    with connection.cursor(row_factory=dict_row) as cur:
        return cur.execute(query, params).fetchone()


def delete_route(connection: Connection, route_id: UUID, user_id: UUID) -> bool:
    with connection.cursor() as cur:
        cur.execute(
            "DELETE FROM maps.routes WHERE id = %s AND user_id = %s",
            (str(route_id), str(user_id))
        )
        return cur.rowcount > 0


def get_marker_comments(
    connection: Connection, marker_id: UUID, user_id: UUID
) -> list[Row]:
    with connection.cursor(row_factory=dict_row) as cur:
        return cur.execute(
            "SELECT id, user_id, marker_id, content, created_at, updated_at FROM maps.marker_comments WHERE marker_id = %s AND user_id = %s ORDER BY created_at DESC",
            (str(marker_id), str(user_id))
        ).fetchall()


def get_marker_comment(
    connection: Connection, comment_id: UUID, user_id: UUID
) -> Optional[Row]:
    with connection.cursor(row_factory=dict_row) as cur:
        return cur.execute(
            "SELECT id, user_id, marker_id, content, created_at, updated_at FROM maps.marker_comments WHERE id = %s AND user_id = %s",
            (str(comment_id), str(user_id))
        ).fetchone()


def create_marker_comment(
    connection: Connection, user_id: UUID, data: MarkerCommentCreate
) -> Row:
    with connection.cursor(row_factory=dict_row) as cur:
        return cur.execute(
            "INSERT INTO maps.marker_comments (user_id, marker_id, content) VALUES (%s, %s, %s) RETURNING id, user_id, marker_id, content, created_at, updated_at",
            (str(user_id), str(data.marker_id), data.content)
        ).fetchone()


def update_marker_comment(
    connection: Connection, comment_id: UUID, user_id: UUID, data: MarkerCommentUpdate
) -> Optional[Row]:
    with connection.cursor(row_factory=dict_row) as cur:
        return cur.execute(
            "UPDATE maps.marker_comments SET content = %s, updated_at = NOW() WHERE id = %s AND user_id = %s RETURNING id, user_id, marker_id, content, created_at, updated_at",
            (data.content, str(comment_id), str(user_id))
        ).fetchone()


def delete_marker_comment(connection: Connection, comment_id: UUID, user_id: UUID) -> bool:
    with connection.cursor() as cur:
        cur.execute(
            "DELETE FROM maps.marker_comments WHERE id = %s AND user_id = %s",
            (str(comment_id), str(user_id))
        )
        return cur.rowcount > 0


def get_user_map_settings(connection: Connection, user_id: UUID) -> Optional[Row]:
    with connection.cursor(row_factory=dict_row) as cur:
        return cur.execute(
            "SELECT id, user_id, map_layer, center_latitude, center_longitude, zoom_level, created_at, updated_at FROM maps.user_map_settings WHERE user_id = %s",
            (str(user_id),)
        ).fetchone()


def update_user_map_settings(
    connection: Connection, user_id: UUID, data: MapSettingsUpdate
) -> Row:
    updates = []
    params = []

    if data.map_layer is not None:
        params.append(data.map_layer)
        updates.append("map_layer = %s")
    if data.center_latitude is not None:
        params.append(str(data.center_latitude))
        updates.append("center_latitude = %s")
    if data.center_longitude is not None:
        params.append(str(data.center_longitude))
        updates.append("center_longitude = %s")
    if data.zoom_level is not None:
        params.append(data.zoom_level)
        updates.append("zoom_level = %s")

    existing = get_user_map_settings(connection, user_id)

    if not updates:
        if existing:
            return existing
        with connection.cursor(row_factory=dict_row) as cur:
            return cur.execute(
                "INSERT INTO maps.user_map_settings (user_id) VALUES (%s) RETURNING id, user_id, map_layer, center_latitude, center_longitude, zoom_level, created_at, updated_at",
                (str(user_id),)
            ).fetchone()

    if existing:
        params.append(str(user_id))
        query = "UPDATE maps.user_map_settings SET " + ", ".join(updates) + ", updated_at = NOW() WHERE user_id = %s RETURNING id, user_id, map_layer, center_latitude, center_longitude, zoom_level, created_at, updated_at"
        with connection.cursor(row_factory=dict_row) as cur:
            return cur.execute(query, params).fetchone()
    else:
        with connection.cursor(row_factory=dict_row) as cur:
            return cur.execute(
                "INSERT INTO maps.user_map_settings (user_id) VALUES (%s) RETURNING id, user_id, map_layer, center_latitude, center_longitude, zoom_level, created_at, updated_at",
                (str(user_id),)
            ).fetchone()