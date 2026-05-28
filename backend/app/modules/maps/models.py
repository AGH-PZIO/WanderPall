from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from uuid import UUID


class MarkerCategory(str, Enum):
    """Predefined functional groups for markers (UC 4.7)."""

    RESTAURANT = "restaurant"
    HOTEL = "hotel"
    SIGHTSEEING = "sightseeing"
    TRANSPORT = "transport"
    NATURE = "nature"
    SHOPPING = "shopping"
    OTHER = "other"

    @classmethod
    def values(cls) -> list[str]:
        return [item.value for item in cls]


@dataclass(frozen=True)
class Marker:
    id: UUID
    group_id: UUID
    name: str
    category: str
    latitude: float
    longitude: float
    visited: bool
    created_by: UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass(frozen=True)
class Route:
    id: UUID
    group_id: UUID
    name: str | None
    color: str
    points: list[tuple[float, float]]
    created_by: UUID
    created_at: datetime | None = None


@dataclass(frozen=True)
class MarkerComment:
    id: UUID
    marker_id: UUID
    author_id: UUID
    body: str
    created_at: datetime | None = None
