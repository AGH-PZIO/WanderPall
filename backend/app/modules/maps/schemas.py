from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.modules.maps.models import MarkerCategory


def _dt(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


class MarkerCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    category: str = Field(default=MarkerCategory.OTHER.value, min_length=1, max_length=32)

    @field_validator("category")
    @classmethod
    def category_in_allowed(cls, value: str) -> str:
        if value not in MarkerCategory.values():
            raise ValueError(f"Unknown marker category: {value}")
        return value


class MarkerUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    category: str | None = Field(default=None, min_length=1, max_length=32)
    visited: bool | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)

    @field_validator("category")
    @classmethod
    def category_in_allowed(cls, value: str | None) -> str | None:
        if value is not None and value not in MarkerCategory.values():
            raise ValueError(f"Unknown marker category: {value}")
        return value


class MarkerResponse(BaseModel):
    id: UUID
    group_id: UUID
    name: str
    category: str
    latitude: float
    longitude: float
    visited: bool
    created_by: UUID
    created_at: str | None = None
    updated_at: str | None = None


class RoutePointModel(BaseModel):
    """A single waypoint of a polyline route."""

    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class RouteCreateRequest(BaseModel):
    name: str | None = Field(default=None, max_length=100)
    color: str = Field(default="#2563eb", pattern=r"^#[0-9A-Fa-f]{6}$")
    points: list[RoutePointModel] = Field(min_length=2)


class RouteUpdateRequest(BaseModel):
    """Partial update for an existing route. All fields optional."""

    name: str | None = Field(default=None, max_length=100)
    color: str | None = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")
    points: list[RoutePointModel] | None = Field(default=None, min_length=2)


class RouteResponse(BaseModel):
    id: UUID
    group_id: UUID
    name: str | None = None
    color: str
    points: list[RoutePointModel]
    created_by: UUID
    created_at: str | None = None


class MarkerCommentCreateRequest(BaseModel):
    body: str = Field(min_length=1, max_length=1000)


class MarkerCommentUpdateRequest(BaseModel):
    body: str = Field(min_length=1, max_length=1000)


class MarkerCommentResponse(BaseModel):
    id: UUID
    marker_id: UUID
    author_id: UUID
    body: str
    created_at: str | None = None


class MapSnapshotResponse(BaseModel):
    """Single payload to render a group's map: markers + routes + per-marker comments."""

    group_id: UUID
    markers: list[MarkerResponse]
    routes: list[RouteResponse]
    comments_by_marker: dict[UUID, list[MarkerCommentResponse]]


class MarkerCategoryItem(BaseModel):
    value: str
    label: str


class MarkerCategoryListResponse(BaseModel):
    items: list[MarkerCategoryItem]
