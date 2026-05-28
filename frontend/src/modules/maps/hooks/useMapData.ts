import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../../account/hooks/useAuth";
import { getGroupMap, listCategories } from "../api/maps-api";
import type { MapSnapshot, Marker, MarkerCategory } from "../types";

export function useMapData(groupId: string | undefined) {
  // We still read auth state to gate the UI (show "log in" empty state),
  // but we no longer pass accessToken into API calls — the shared middleware
  // attaches a fresh token on every request and handles 401-retry.
  const { accessToken, loading: authLoading } = useAuth();
  const [snapshot, setSnapshot] = useState<MapSnapshot | null>(null);
  const [categories, setCategories] = useState<MarkerCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!groupId || !accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getGroupMap(groupId);
      setSnapshot(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd pobierania mapy");
    } finally {
      setLoading(false);
    }
  }, [groupId, accessToken]);

  /**
   * Optimistic mutation hook. Caller passes a function that produces the
   * new snapshot from the current one (or null). Used to avoid the
   * "marker teleports back, then forward" flicker after dragend: we apply
   * the new position locally before the PATCH/refresh round-trip lands.
   */
  const patchSnapshot = useCallback(
    (mutate: (current: MapSnapshot) => MapSnapshot) => {
      setSnapshot((prev) => (prev ? mutate(prev) : prev));
    },
    [],
  );

  /** Common helper: optimistic marker patch + immediate UI sync. */
  const patchMarkerLocally = useCallback(
    (markerId: string, changes: Partial<Marker>) => {
      patchSnapshot((current) => ({
        ...current,
        markers: current.markers.map((m) =>
          m.id === markerId ? { ...m, ...changes } : m,
        ),
      }));
    },
    [patchSnapshot],
  );

  useEffect(() => {
    let cancelled = false;
    if (!accessToken) return;
    listCategories()
      .then((cats) => {
        if (!cancelled) setCategories(cats);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    snapshot,
    categories,
    loading,
    error,
    refresh,
    accessToken,
    authLoading,
    patchMarkerLocally,
  };
}
