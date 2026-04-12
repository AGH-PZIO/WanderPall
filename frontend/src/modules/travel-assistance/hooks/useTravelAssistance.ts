import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../../shared/api-client";
import type { components } from "../../../shared/api-types";

type TravelDocument = components["schemas"]["TravelDocumentResponse"];
type GmailStatusResponse = components["schemas"]["GmailStatusResponse"];

const DEV_USER_ID = "123e4567-e89b-12d3-a456-426614174000";
const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";

export function useTravelAssistance() {
  const [items, setItems] = useState<TravelDocument[]>([]);
  const [selected, setSelected] = useState<TravelDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [authorizeUrl, setAuthorizeUrl] = useState<string | null>(null);

  const headers = {
    "X-Dev-User-Id": DEV_USER_ID
  };

  const checkGmailStatus = useCallback(async () => {
    const res = await apiClient.GET("/travel-assistance/gmail/status", {
      headers
    });

    if (!res.error && res.data) {
      const status = res.data as GmailStatusResponse;
      setConnected(status.connected ?? false);
      setGoogleEmail(status.google_email ?? null);
    }
  }, []);

  const getAuthorizeUrl = useCallback(async () => {
    const res = await apiClient.GET("/travel-assistance/gmail/oauth/authorize-url", {
      headers
    });

    if (!res.error && res.data) {
      const data = res.data as { url: string };
      setAuthorizeUrl(data.url);
    }
  }, []);

  const fetchDocs = useCallback(async () => {
    setLoading(true);

    const res = await apiClient.GET("/travel-assistance/travel-documents", {
      headers
    });

    if (!res.error && res.data) {
      setItems(res.data.items);
    }

    setLoading(false);
  }, []);

  const sync = async () => {
    setSyncing(true);

    await apiClient.POST("/travel-assistance/gmail/sync", {
      headers
    });

    await fetchDocs();
    setSyncing(false);
  };

  const disconnect = async () => {
    await apiClient.DELETE("/travel-assistance/gmail/connection", {
      headers
    });

    setConnected(false);
    setGoogleEmail(null);
    setItems([]);
    setSelected(null);
    await checkGmailStatus();
  };

  const connectToGoogle = () => {
    if (authorizeUrl) {
      window.location.href = authorizeUrl;
    }
  };

  const downloadAttachment = async (documentId: string, attachmentId: string) => {
    const res = await fetch(
      `${baseUrl}/travel-assistance/travel-documents/${documentId}/attachments/${attachmentId}`,
      {
        headers
      }
    );

    if (!res.ok) return;

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = attachmentId;
    a.click();

    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const init = async () => {
      await checkGmailStatus();
      await getAuthorizeUrl();
    };

    init();
  }, [checkGmailStatus, getAuthorizeUrl]);

  useEffect(() => {
    if (!connected) return;

    const load = async () => {
      await fetchDocs();
    };

    load();
  }, [connected, fetchDocs]);

  return {
    items,
    selected,
    setSelected,
    loading,
    syncing,
    connected,
    googleEmail,
    authorizeUrl,
    sync,
    disconnect,
    connectToGoogle,
    downloadAttachment,
    checkGmailStatus
  };
}