import { useCallback, useEffect, useState } from "react";

type CalendarEvent = {
  id?: string | null;
  summary?: string | null;
  description?: string | null;
  location?: string | null;
  html_link?: string | null;
  start?: string | null;
  end?: string | null;
  all_day?: boolean;
  organizer?: string | null;
};

type CalendarEventsResponse = {
  calendar_id: string;
  time_min: string;
  time_max?: string | null;
  items: CalendarEvent[];
};

type GmailStatusResponse = {
  connected: boolean;
  google_email?: string | null;
  last_sync_at?: string | null;
};

const DEV_USER_ID = "123e4567-e89b-12d3-a456-426614174000";
const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";

export function useCalendar() {
  const [connected, setConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [authorizeUrl, setAuthorizeUrl] = useState<string | null>(null);

  const [items, setItems] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = {
    "X-Dev-User-Id": DEV_USER_ID
  };

  const checkGoogleStatus = useCallback(async () => {
    const res = await fetch(`${baseUrl}/travel-assistance/gmail/status`, { headers });
    if (!res.ok) return;
    const status = (await res.json()) as GmailStatusResponse;
    setConnected(Boolean(status.connected));
    setGoogleEmail(status.google_email ?? null);
  }, []);

  const getAuthorizeUrl = useCallback(async () => {
    const res = await fetch(`${baseUrl}/travel-assistance/gmail/oauth/authorize-url`, { headers });
    if (!res.ok) return;
    const data = (await res.json()) as { url: string };
    setAuthorizeUrl(data.url);
  }, []);

  const connectToGoogle = () => {
    if (authorizeUrl) window.location.href = authorizeUrl;
  };

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/travel-assistance/calendar/events`, { headers });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as CalendarEventsResponse;
      setItems(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await checkGoogleStatus();
      await getAuthorizeUrl();
    };
    init();
  }, [checkGoogleStatus, getAuthorizeUrl]);

  useEffect(() => {
    if (!connected) return;
    fetchEvents();
  }, [connected, fetchEvents]);

  return {
    connected,
    googleEmail,
    authorizeUrl,
    connectToGoogle,
    items,
    loading,
    error,
    refresh: fetchEvents
  };
}

