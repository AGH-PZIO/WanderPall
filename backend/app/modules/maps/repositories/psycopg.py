import json
from uuid import UUID

from psycopg import Connection
from psycopg.types.json import Jsonb

from app.modules.maps.models import Marker, MarkerComment, Route
from app.modules.maps.repositories.mappers import (
    marker_comment_from_row,
    marker_from_row,
    route_from_row,
)


class PsycopgMarkerRepository:
    def __init__(self, connection: Connection) -> None:
        self.connection = connection

    def get_by_id(self, marker_id: UUID) -> Marker | None:
        row = self.connection.execute(
            "SELECT * FROM maps.markers WHERE id = %s",
            (marker_id,),
        ).fetchone()
        return marker_from_row(row) if row else None

    def list_by_group(self, group_id: UUID) -> list[Marker]:
        rows = self.connection.execute(
            "SELECT * FROM maps.markers WHERE group_id = %s ORDER BY created_at ASC",
            (group_id,),
        ).fetchall()
        return [marker_from_row(r) for r in rows]

    def create(self, marker: Marker) -> Marker:
        row = self.connection.execute(
            """
            INSERT INTO maps.markers
                (id, group_id, name, category, latitude, longitude, visited, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                marker.id,
                marker.group_id,
                marker.name,
                marker.category,
                marker.latitude,
                marker.longitude,
                marker.visited,
                marker.created_by,
            ),
        ).fetchone()
        return marker_from_row(row)

    def update(self, marker: Marker) -> Marker:
        row = self.connection.execute(
            """
            UPDATE maps.markers
            SET name = %s,
                category = %s,
                visited = %s,
                latitude = %s,
                longitude = %s,
                updated_at = now()
            WHERE id = %s
            RETURNING *
            """,
            (
                marker.name,
                marker.category,
                marker.visited,
                marker.latitude,
                marker.longitude,
                marker.id,
            ),
        ).fetchone()
        return marker_from_row(row)

    def delete(self, marker_id: UUID) -> None:
        self.connection.execute(
            "DELETE FROM maps.markers WHERE id = %s",
            (marker_id,),
        )


class PsycopgRouteRepository:
    def __init__(self, connection: Connection) -> None:
        self.connection = connection

    def get_by_id(self, route_id: UUID) -> Route | None:
        row = self.connection.execute(
            "SELECT * FROM maps.routes WHERE id = %s",
            (route_id,),
        ).fetchone()
        return route_from_row(row) if row else None

    def list_by_group(self, group_id: UUID) -> list[Route]:
        rows = self.connection.execute(
            "SELECT * FROM maps.routes WHERE group_id = %s ORDER BY created_at ASC",
            (group_id,),
        ).fetchall()
        return [route_from_row(r) for r in rows]

    def create(self, route: Route) -> Route:
        points_json = [
            {"latitude": lat, "longitude": lng} for lat, lng in route.points
        ]
        row = self.connection.execute(
            """
            INSERT INTO maps.routes (id, group_id, name, color, points, created_by)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                route.id,
                route.group_id,
                route.name,
                route.color,
                Jsonb(points_json),
                route.created_by,
            ),
        ).fetchone()
        return route_from_row(row)

    def update(self, route: Route) -> Route:
        points_json = [
            {"latitude": lat, "longitude": lng} for lat, lng in route.points
        ]
        row = self.connection.execute(
            """
            UPDATE maps.routes
            SET name = %s, color = %s, points = %s
            WHERE id = %s
            RETURNING *
            """,
            (route.name, route.color, Jsonb(points_json), route.id),
        ).fetchone()
        return route_from_row(row)

    def delete(self, route_id: UUID) -> None:
        self.connection.execute(
            "DELETE FROM maps.routes WHERE id = %s",
            (route_id,),
        )


class PsycopgMarkerCommentRepository:
    def __init__(self, connection: Connection) -> None:
        self.connection = connection

    def get_by_id(self, comment_id: UUID) -> MarkerComment | None:
        row = self.connection.execute(
            "SELECT * FROM maps.marker_comments WHERE id = %s",
            (comment_id,),
        ).fetchone()
        return marker_comment_from_row(row) if row else None

    def list_by_marker(self, marker_id: UUID) -> list[MarkerComment]:
        rows = self.connection.execute(
            """
            SELECT * FROM maps.marker_comments
            WHERE marker_id = %s
            ORDER BY created_at ASC
            """,
            (marker_id,),
        ).fetchall()
        return [marker_comment_from_row(r) for r in rows]

    def list_by_markers(self, marker_ids: list[UUID]) -> dict[UUID, list[MarkerComment]]:
        result: dict[UUID, list[MarkerComment]] = {mid: [] for mid in marker_ids}
        if not marker_ids:
            return result
        rows = self.connection.execute(
            """
            SELECT * FROM maps.marker_comments
            WHERE marker_id = ANY(%s)
            ORDER BY created_at ASC
            """,
            (list(marker_ids),),
        ).fetchall()
        for row in rows:
            mc = marker_comment_from_row(row)
            result.setdefault(mc.marker_id, []).append(mc)
        return result

    def create(self, comment: MarkerComment) -> MarkerComment:
        row = self.connection.execute(
            """
            INSERT INTO maps.marker_comments (id, marker_id, author_id, body)
            VALUES (%s, %s, %s, %s)
            RETURNING *
            """,
            (comment.id, comment.marker_id, comment.author_id, comment.body),
        ).fetchone()
        return marker_comment_from_row(row)

    def update_body(self, comment_id: UUID, body: str) -> MarkerComment:
        row = self.connection.execute(
            """
            UPDATE maps.marker_comments
            SET body = %s
            WHERE id = %s
            RETURNING *
            """,
            (body, comment_id),
        ).fetchone()
        return marker_comment_from_row(row)

    def delete(self, comment_id: UUID) -> None:
        self.connection.execute(
            "DELETE FROM maps.marker_comments WHERE id = %s",
            (comment_id,),
        )
