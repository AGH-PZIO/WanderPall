import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../../shared/api-client";
import type { components } from "../../../shared/api-types";

type TravelDocument = components["schemas"]["TravelDocumentResponse"];
type GmailStatusResponse = components["schemas"]["GmailStatusResponse"];
type SyncResult = components["schemas"]["SyncResponse"];

const DEV_USER_ID = "123e4567-e89b-12d3-a456-426614174000";

export function useTravelAssistance() {
  const [items, setItems] = useState<TravelDocument[]>([]);
  const [selected, setSelected] = useState<TravelDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [authorizeUrl, setAuthorizeUrl] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

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
    setSyncResult(null);

    const res = await apiClient.POST("/travel-assistance/gmail/sync", {
      headers
    });

    if (!res.error && res.data) {
      setSyncResult(res.data as SyncResult);
    }

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
    setSyncResult(null);
    await checkGmailStatus();
  };

  const connectToGoogle = () => {
    if (authorizeUrl) {
      window.location.href = authorizeUrl;
    }
  };

  const deleteDocument = async (id: string) => {
    await apiClient.DELETE("/travel-assistance/travel-documents/{document_id}", {
      headers,
      params: { path: { document_id: id } }
    });
    setSelected(null);
    await fetchDocs();
  };

  const downloadAttachment = async (
    documentId: string,
    attachmentId: string,
    filename?: string | null
  ): Promise<{ ok: boolean; error?: string }> => {
    setDownloadError(null);

    const res = await apiClient.GET(
      "/travel-assistance/travel-documents/{document_id}/attachments/{attachment_id}",
      {
        params: {
          path: {
            document_id: documentId,
            attachment_id: attachmentId
          }
        },
        headers,
        parseAs: "blob"
      }
    );

    if (res.error || !res.data) {
      const msg = "Failed to download attachment";
      setDownloadError(msg);
      return { ok: false, error: msg };
    }

    const blob = res.data as unknown as Blob;
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename ?? attachmentId;
    a.click();

    URL.revokeObjectURL(url);
    return { ok: true };
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
    syncResult,
    downloadError,
    sync,
    disconnect,
    connectToGoogle,
    downloadAttachment,
    deleteDocument,
    checkGmailStatus
  };
}
