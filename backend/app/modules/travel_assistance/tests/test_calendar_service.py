from datetime import datetime, timezone

from app.modules.travel_assistance.calendar.service import _parse_event_datetime, list_events


def test_parse_event_datetime_datetime_zulu() -> None:
    dt, all_day = _parse_event_datetime({"dateTime": "2026-04-18T10:30:00Z"})
    assert all_day is False
    assert dt == datetime(2026, 4, 18, 10, 30, tzinfo=timezone.utc)


def test_parse_event_datetime_all_day_date() -> None:
    dt, all_day = _parse_event_datetime({"date": "2026-04-18"})
    assert all_day is True
    assert dt == datetime(2026, 4, 18, 0, 0, 0)


class _FakeEventsList:
    def __init__(self, payload: dict) -> None:
        self._payload = payload

    def execute(self) -> dict:
        return self._payload


class _FakeEvents:
    def __init__(self, payload: dict) -> None:
        self._payload = payload
        self.last_kwargs: dict | None = None

    def list(self, **kwargs):
        self.last_kwargs = kwargs
        return _FakeEventsList(self._payload)


class _FakeService:
    def __init__(self, payload: dict) -> None:
        self._events = _FakeEvents(payload)

    def events(self):
        return self._events


def test_list_events_maps_google_payload() -> None:
    payload = {
        "items": [
            {
                "id": "evt1",
                "summary": "Meeting",
                "location": "Room 1",
                "htmlLink": "https://calendar.google.com/event?eid=evt1",
                "organizer": {"email": "org@example.com"},
                "start": {"dateTime": "2026-04-18T10:00:00Z"},
                "end": {"dateTime": "2026-04-18T11:00:00Z"},
            },
            {
                "id": "evt2",
                "summary": "Holiday",
                "start": {"date": "2026-04-19"},
                "end": {"date": "2026-04-20"},
            },
        ]
    }
    service = _FakeService(payload)
    tmin = datetime(2026, 4, 18, 0, 0, tzinfo=timezone.utc)
    tmax = datetime(2026, 4, 25, 0, 0, tzinfo=timezone.utc)

    items = list_events(service, calendar_id="primary", time_min=tmin, time_max=tmax, max_results=50)

    assert len(items) == 2
    assert items[0].id == "evt1"
    assert items[0].summary == "Meeting"
    assert items[0].all_day is False
    assert items[0].organizer == "org@example.com"
    assert items[1].id == "evt2"
    assert items[1].all_day is True

    assert service._events.last_kwargs is not None
    assert service._events.last_kwargs["calendarId"] == "primary"
    assert service._events.last_kwargs["maxResults"] == 50
    assert service._events.last_kwargs["singleEvents"] is True
    assert service._events.last_kwargs["orderBy"] == "startTime"

