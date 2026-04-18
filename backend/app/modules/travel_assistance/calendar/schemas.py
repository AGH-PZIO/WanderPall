from datetime import datetime

from pydantic import BaseModel, Field


class CalendarEventResponse(BaseModel):
    id: str | None = None
    summary: str | None = None
    description: str | None = None
    location: str | None = None
    html_link: str | None = None

    start: datetime | None = None
    end: datetime | None = None
    all_day: bool = False

    organizer: str | None = None


class CalendarEventsResponse(BaseModel):
    calendar_id: str = Field(description="Google Calendar id (e.g. 'primary')")
    time_min: datetime = Field(description="Lower bound (inclusive) for an event's start time")
    time_max: datetime | None = Field(default=None, description="Upper bound (exclusive) for an event's start time")
    items: list[CalendarEventResponse]
