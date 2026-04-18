from __future__ import annotations

from datetime import datetime
from typing import Any

from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

from app.modules.travel_assistance.calendar.schemas import CalendarEventResponse


def build_calendar_service(creds: Credentials):
    return build("calendar", "v3", credentials=creds, cache_discovery=False)


def _parse_event_datetime(dt: dict[str, Any] | None) -> tuple[datetime | None, bool]:
    if not dt:
        return None, False
    # Google returns either {"dateTime": "..."} or {"date": "YYYY-MM-DD"} for all-day events.
    if dt.get("dateTime"):
        return datetime.fromisoformat(dt["dateTime"].replace("Z", "+00:00")), False
    if dt.get("date"):
        # all-day is date-only; treat as midnight in local-naive ISO, but keep as date boundary.
        return datetime.fromisoformat(dt["date"] + "T00:00:00"), True
    return None, False


def list_events(
    service,
    *,
    calendar_id: str,
    time_min: datetime,
    time_max: datetime | None,
    max_results: int,
) -> list[CalendarEventResponse]:
    req_kwargs: dict[str, Any] = {
        "calendarId": calendar_id,
        "timeMin": time_min.isoformat(),
        "maxResults": max_results,
        "singleEvents": True,
        "orderBy": "startTime",
    }
    if time_max is not None:
        req_kwargs["timeMax"] = time_max.isoformat()

    data = service.events().list(**req_kwargs).execute()
    items = data.get("items") or []

    out: list[CalendarEventResponse] = []
    for ev in items:
        start, all_day_start = _parse_event_datetime(ev.get("start"))
        end, all_day_end = _parse_event_datetime(ev.get("end"))
        all_day = bool(all_day_start or all_day_end)
        organizer_email = (ev.get("organizer") or {}).get("email")
        out.append(
            CalendarEventResponse(
                id=ev.get("id"),
                summary=ev.get("summary"),
                description=ev.get("description"),
                location=ev.get("location"),
                html_link=ev.get("htmlLink"),
                start=start,
                end=end,
                all_day=all_day,
                organizer=organizer_email,
            )
        )
    return out
