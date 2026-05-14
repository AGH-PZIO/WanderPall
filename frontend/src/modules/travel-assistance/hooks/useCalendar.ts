import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../../shared/api-client";
import type { components } from "../../../shared/api-types";
import { tokenStore } from "../../account/auth-runtime";

type CalendarEvent = components["schemas"]["CalendarEventResponse"];
type CalendarEventsResponse = components["schemas"]["CalendarEventsResponse"];
type GmailStatusResponse = components["schemas"]["GmailStatusResponse"];

export function useCalendar() {
  const [connected, setConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [authorizeUrl, setAuthorizeUrl] = useState<string | null>(null);

  const [items, setItems] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkGoogleStatus = useCallback(async () => {
    const res = await apiClient.GET("/travel-assistance/gmail/status", {});
    if (res.error || !res.data) return;
    const status = res.data as GmailStatusResponse;
    setConnected(Boolean(status.connected));
    setGoogleEmail(status.google_email ?? null);
  }, []);

  const getAuthorizeUrl = useCallback(async () => {
    const res = await apiClient.GET("/travel-assistance/gmail/oauth/authorize-url", {});
    if (res.error || !res.data) return;
    const data = res.data as { url: string };
    setAuthorizeUrl(data.url);
  }, []);

  const connectToGoogle = () => {
    if (authorizeUrl) window.location.href = authorizeUrl;
  };

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.GET("/travel-assistance/calendar/events", {});
      if (res.error) {
        const msg =
          typeof res.error === "object" && res.error !== null && "detail" in res.error
            ? String((res.error as { detail?: unknown }).detail)
            : JSON.stringify(res.error);
        throw new Error(msg || `HTTP error`);
      }
      const data = res.data as CalendarEventsResponse;
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
      if (!tokenStore.get()?.accessToken) return;
      await checkGoogleStatus();
      await getAuthorizeUrl();
    };
    init();
  }, [checkGoogleStatus, getAuthorizeUrl]);

  useEffect(() => {
    if (!tokenStore.get()?.accessToken) return;
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
