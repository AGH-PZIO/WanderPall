from . import schemas

def map_guide(row) -> schemas.GuideResponse:
    return schemas.GuideResponse(
        id=row["id"],
        user_id=row["user_id"],
        title=row["title"],
        content=row["content"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        published=row["published"],
    )

def map_guides(rows) -> list[schemas.GuideResponse]:
    return [map_guide(row) for row in rows]