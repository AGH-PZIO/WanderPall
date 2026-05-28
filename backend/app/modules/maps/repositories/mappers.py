from collections.abc import Mapping

from app.modules.maps.models import Marker, MarkerComment, Route


def marker_from_row(row: Mapping) -> Marker:
    return Marker(
        id=row["id"],
        group_id=row["group_id"],
        name=row["name"],
        category=row["category"],
        latitude=float(row["latitude"]),
        longitude=float(row["longitude"]),
        visited=bool(row["visited"]),
        created_by=row["created_by"],
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
    )


def route_from_row(row: Mapping) -> Route:
    raw_points = row["points"]
    points = [(float(pt["latitude"]), float(pt["longitude"])) for pt in raw_points]
    return Route(
        id=row["id"],
        group_id=row["group_id"],
        name=row.get("name"),
        color=row["color"],
        points=points,
        created_by=row["created_by"],
        created_at=row.get("created_at"),
    )


def marker_comment_from_row(row: Mapping) -> MarkerComment:
    return MarkerComment(
        id=row["id"],
        marker_id=row["marker_id"],
        author_id=row["author_id"],
        body=row["body"],
        created_at=row.get("created_at"),
    )
