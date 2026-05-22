import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCalendar } from "../hooks/useCalendar";
import "../ui/travel-assistance.css";
import { AuthRequiredGate } from "../ui/AuthRequiredGate";
import { tokenStore } from "../../account/auth-runtime";

import { Calendar as BigCalendar, dateFnsLocalizer, type Event as RBCEvent, type View } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale/en-US";

function formatWhen(iso: string | null | undefined, allDay?: boolean) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  if (allDay) return d.toLocaleDateString();
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export function CalendarPage() {
  const navigate = useNavigate();
  const tokens = tokenStore.get();
  const accessToken = tokens?.accessToken;
  const { connected, googleEmail, connectToGoogle, items, loading, error, refresh } = useCalendar();

  const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales: { "en-US": enUS }
  });

  type CalendarResource = { url?: string | null; location?: string | null; organizer?: string | null };
  type CalendarEvent = RBCEvent & {
    resource?: CalendarResource;
    allDay?: boolean;
  };

  const events: CalendarEvent[] = items
    .map((ev) => {
      const start = ev.start ? new Date(ev.start) : null;
      if (!start || Number.isNaN(start.getTime())) return null;
      let end = ev.end ? new Date(ev.end) : null;
      if (end && Number.isNaN(end.getTime())) end = null;

      const allDay = Boolean(ev.all_day);
      if (!end) {
        end = allDay ? new Date(start.getTime() + 24 * 60 * 60 * 1000) : new Date(start.getTime() + 60 * 60 * 1000);
      }

      return {
        title: ev.summary || "(No title)",
        start,
        end,
        allDay,
        resource: { url: ev.html_link, location: ev.location, organizer: ev.organizer }
      };
    })
    .filter(Boolean) as CalendarEvent[];

  const onSelectEvent = (ev: CalendarEvent) => {
    const url = ev.resource?.url;
    if (url) window.open(url, "_blank", "noreferrer");
  };

  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState<Date>(new Date());

  if (!accessToken) {
    return <AuthRequiredGate feature="Calendar" />;
  }

  if (!connected) {
    return (
      <div className="ta-shell">
        <div className="ta-header">
          <h2>Calendar</h2>
        </div>

        <div className="ta-disconnected">
          <p>Connect Google to show your calendar</p>
          <button onClick={connectToGoogle} className="btn-primary">
            Connect with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ta-shell">
      <div className="ta-header">
        <div className="ta-header-left">
          <button onClick={() => navigate("/travel-assistance")} className="btn-back">
            ← Back
          </button>
          <h2>Calendar</h2>
          <small>{googleEmail}</small>
        </div>

        <div className="ta-actions">
          <button onClick={refresh} disabled={loading} className={loading ? "btn-syncing" : ""}>
            {loading ? (
              <>
                <span className="spinner"></span>
                Loading...
              </>
            ) : (
              "Refresh"
            )}
          </button>
        </div>
      </div>

      <div className="ta-calendar">
        {error && <div className="ta-error">Failed to load events: {error}</div>}

        <div className="ta-calendar-grid">
          <BigCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            view={view}
            onView={setView}
            date={date}
            onNavigate={setDate}
            style={{ height: 680 }}
            onSelectEvent={onSelectEvent}
            popup
            messages={{
              showMore: (total: number) => `+${total} more`
            }}
          />
        </div>

        {!loading && items.length === 0 && !error && (
          <p className="ta-empty">No upcoming events found.</p>
        )}

        <div className="ta-calendar-list ta-calendar-list-compact">
          {items.map((ev) => (
            <div key={ev.id ?? `${ev.summary}-${ev.start}`} className="ta-event">
              <div className="ta-event-main">
                <div className="ta-event-title">{ev.summary || "(No title)"}</div>
                <div className="ta-event-time">
                  {formatWhen(ev.start, ev.all_day)}{" "}
                  {ev.end ? `→ ${formatWhen(ev.end, ev.all_day)}` : ""}
                </div>
                {(ev.location || ev.organizer) && (
                  <div className="ta-event-meta">
                    {ev.location ? <span>📍 {ev.location}</span> : null}
                    {ev.organizer ? <span>• {ev.organizer}</span> : null}
                  </div>
                )}
              </div>

              {ev.html_link ? (
                <a className="ta-event-link" href={ev.html_link} target="_blank" rel="noreferrer">
                  Open
                </a>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

