from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field
from typing import Optional


class MarkerGroupBase(BaseModel):
    name: str = Field(..., max_length=255)
    color: str = Field(default="#3388ff", max_length=7)
    icon: Optional[str] = Field(default=None, max_length=50)


class MarkerGroupCreate(MarkerGroupBase):
    pass


class MarkerGroupUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=255)
    color: Optional[str] = Field(default=None, max_length=7)
    icon: Optional[str] = Field(default=None, max_length=50)


class MarkerGroupResponse(MarkerGroupBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Waypoint(BaseModel):
    latitude: float
    longitude: float
    order: int


class MarkerBase(BaseModel):
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    group_id: Optional[UUID] = None
    is_visited: bool = False


class MarkerCreate(MarkerBase):
    pass


class MarkerUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=255)
    description: Optional[str] = None
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    group_id: Optional[UUID] = None
    is_visited: Optional[bool] = None


class MarkerResponse(MarkerBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RouteBase(BaseModel):
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    color: str = Field(default="#ff0000", max_length=7)
    waypoints: list[Waypoint] = Field(default_factory=list)


class RouteCreate(RouteBase):
    pass


class RouteUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=255)
    description: Optional[str] = None
    color: Optional[str] = Field(default=None, max_length=7)
    waypoints: Optional[list[Waypoint]] = None


class RouteResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    description: Optional[str]
    color: str
    waypoints: list[Waypoint]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MarkerCommentBase(BaseModel):
    content: str


class MarkerCommentCreate(MarkerCommentBase):
    marker_id: UUID


class MarkerCommentUpdate(BaseModel):
    content: str


class MarkerCommentResponse(MarkerCommentBase):
    id: UUID
    user_id: UUID
    marker_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MapSettingsUpdate(BaseModel):
    map_layer: Optional[str] = Field(default=None, max_length=50)
    center_latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    center_longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    zoom_level: Optional[int] = Field(default=None, ge=1, le=18)


class MapSettingsResponse(BaseModel):
    id: UUID
    user_id: UUID
    map_layer: str
    center_latitude: float
    center_longitude: float
    zoom_level: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MarkerGroupListResponse(BaseModel):
    items: list[MarkerGroupResponse]
    total: int


class MarkerListResponse(BaseModel):
    items: list[MarkerResponse]
    total: int


class RouteListResponse(BaseModel):
    items: list[RouteResponse]
    total: int


class MarkerCommentListResponse(BaseModel):
    items: list[MarkerCommentResponse]
    total: int