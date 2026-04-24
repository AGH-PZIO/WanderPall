import { useState, useCallback } from "react";
import { apiClient } from "../../../shared/api-client";

export interface Waypoint {
  latitude: number;
  longitude: number;
  order: number;
}

export interface MarkerGroup {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string | null;
  created_at: string;
  updated_at: string;
}

export interface Marker {
  id: string;
  user_id: string;
  group_id: string | null;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  is_visited: boolean;
  created_at: string;
  updated_at: string;
}

export interface Route {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  waypoints: Waypoint[];
  created_at: string;
  updated_at: string;
}

export interface MarkerComment {
  id: string;
  user_id: string;
  marker_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface MapSettings {
  id: string;
  user_id: string;
  map_layer: string;
  center_latitude: number;
  center_longitude: number;
  zoom_level: number;
  created_at: string;
  updated_at: string;
}

interface MarkerGroupListResponse {
  items: MarkerGroup[];
  total: number;
}

interface MarkerListResponse {
  items: Marker[];
  total: number;
}

interface RouteListResponse {
  items: Route[];
  total: number;
}

interface MarkerCommentListResponse {
  items: MarkerComment[];
  total: number;
}

export function useMaps() {
  const [markerGroups, setMarkerGroups] = useState<MarkerGroup[]>([]);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [settings, setSettings] = useState<MapSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMarkerGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await apiClient.GET("/maps/marker-groups");
      if (error || !data) throw error;
      setMarkerGroups(data.items);
    } catch (e: any) {
      setError(e.message || "Failed to load marker groups");
    } finally {
      setLoading(false);
    }
  }, []);

  const createMarkerGroup = useCallback(
    async (group: { name: string; color?: string; icon?: string }) => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await apiClient.POST("/maps/marker-groups", {
          body: group,
        });
        if (error || !data) throw error;
        setMarkerGroups((prev) => [data, ...prev]);
        return data;
      } catch (e: any) {
        setError(e.message || "Failed to create marker group");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const updateMarkerGroup = useCallback(
    async (
      groupId: string,
      group: { name?: string; color?: string; icon?: string },
    ) => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await apiClient.PATCH(
          `/maps/marker-groups/{group_id}`,
          {
            params: { path: { group_id: groupId } },
            body: group,
          },
        );
        if (error || !data) throw error;
        setMarkerGroups((prev) =>
          prev.map((g) => (g.id === groupId ? data : g)),
        );
        return data;
      } catch (e: any) {
        setError(e.message || "Failed to update marker group");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const deleteMarkerGroup = useCallback(async (groupId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await apiClient.DELETE(
        `/maps/marker-groups/{group_id}`,
        {
          params: { path: { group_id: groupId } },
        },
      );
      if (error) throw error;
      setMarkerGroups((prev) => prev.filter((g) => g.id !== groupId));
    } catch (e: any) {
      setError(e.message || "Failed to delete marker group");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMarkers = useCallback(async (groupId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = groupId ? { query: { group_id: groupId } } : {};
      const { data, error } = await apiClient.GET("/maps/markers", params);
      if (error || !data) throw error;
      setMarkers(data.items);
    } catch (e: any) {
      setError(e.message || "Failed to load markers");
    } finally {
      setLoading(false);
    }
  }, []);

  const createMarker = useCallback(
    async (marker: {
      name: string;
      description?: string;
      latitude: number;
      longitude: number;
      group_id?: string;
      is_visited?: boolean;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await apiClient.POST("/maps/markers", {
          body: marker,
        });
        if (error || !data) throw error;
        setMarkers((prev) => [data, ...prev]);
        return data;
      } catch (e: any) {
        setError(e.message || "Failed to create marker");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const updateMarker = useCallback(
    async (
      markerId: string,
      marker: {
        name?: string;
        description?: string;
        latitude?: number;
        longitude?: number;
        group_id?: string;
        is_visited?: boolean;
      },
    ) => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await apiClient.PATCH(
          `/maps/markers/{marker_id}`,
          {
            params: { path: { marker_id: markerId } },
            body: marker,
          },
        );
        if (error || !data) throw error;
        setMarkers((prev) => prev.map((m) => (m.id === markerId ? data : m)));
        return data;
      } catch (e: any) {
        setError(e.message || "Failed to update marker");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const deleteMarker = useCallback(async (markerId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await apiClient.DELETE(`/maps/markers/{marker_id}`, {
        params: { path: { marker_id: markerId } },
      });
      if (error) throw error;
      setMarkers((prev) => prev.filter((m) => m.id !== markerId));
    } catch (e: any) {
      setError(e.message || "Failed to delete marker");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsVisited = useCallback(async (markerId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await apiClient.POST(
        `/maps/markers/{marker_id}/visited`,
        {
          params: { path: { marker_id: markerId } },
        },
      );
      if (error || !data) throw error;
      setMarkers((prev) => prev.map((m) => (m.id === markerId ? data : m)));
      return data;
    } catch (e: any) {
      setError(e.message || "Failed to mark as visited");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRoutes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await apiClient.GET("/maps/routes");
      if (error || !data) throw error;
      setRoutes(data.items);
    } catch (e: any) {
      setError(e.message || "Failed to load routes");
    } finally {
      setLoading(false);
    }
  }, []);

  const createRoute = useCallback(
    async (route: {
      name: string;
      description?: string;
      color?: string;
      waypoints: Waypoint[];
    }) => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await apiClient.POST("/maps/routes", {
          body: route,
        });
        if (error || !data) throw error;
        setRoutes((prev) => [data, ...prev]);
        return data;
      } catch (e: any) {
        setError(e.message || "Failed to create route");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const updateRoute = useCallback(
    async (
      routeId: string,
      route: {
        name?: string;
        description?: string;
        color?: string;
        waypoints?: Waypoint[];
      },
    ) => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await apiClient.PATCH(
          `/maps/routes/{route_id}`,
          {
            params: { path: { route_id: routeId } },
            body: route,
          },
        );
        if (error || !data) throw error;
        setRoutes((prev) => prev.map((r) => (r.id === routeId ? data : r)));
        return data;
      } catch (e: any) {
        setError(e.message || "Failed to update route");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const deleteRoute = useCallback(async (routeId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await apiClient.DELETE(`/maps/routes/{route_id}`, {
        params: { path: { route_id: routeId } },
      });
      if (error) throw error;
      setRoutes((prev) => prev.filter((r) => r.id !== routeId));
    } catch (e: any) {
      setError(e.message || "Failed to delete route");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadComments = useCallback(async (markerId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await apiClient.GET(
        `/maps/markers/{marker_id}/comments`,
        {
          params: { path: { marker_id: markerId } },
        },
      );
      if (error || !data) throw error;
      return data.items;
    } catch (e: any) {
      setError(e.message || "Failed to load comments");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const createComment = useCallback(
    async (markerId: string, content: string) => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await apiClient.POST(
          `/maps/markers/{marker_id}/comments`,
          {
            params: { path: { marker_id: markerId } },
            body: { marker_id: markerId, content },
          },
        );
        if (error || !data) throw error;
        return data;
      } catch (e: any) {
        setError(e.message || "Failed to create comment");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const deleteComment = useCallback(
    async (markerId: string, commentId: string) => {
      setLoading(true);
      setError(null);
      try {
        const { error } = await apiClient.DELETE(
          `/maps/markers/{marker_id}/comments/{comment_id}`,
          { params: { path: { marker_id: markerId, comment_id: commentId } } },
        );
        if (error) throw error;
      } catch (e: any) {
        setError(e.message || "Failed to delete comment");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await apiClient.GET("/maps/settings");
      if (error || !data) throw error;
      setSettings(data);
      return data;
    } catch (e: any) {
      setError(e.message || "Failed to load settings");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(
    async (mapSettings: {
      map_layer?: string;
      center_latitude?: number;
      center_longitude?: number;
      zoom_level?: number;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await apiClient.PATCH("/maps/settings", {
          body: mapSettings,
        });
        if (error || !data) throw error;
        setSettings(data);
        return data;
      } catch (e: any) {
        setError(e.message || "Failed to update settings");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    markerGroups,
    markers,
    routes,
    settings,
    loading,
    error,
    loadMarkerGroups,
    createMarkerGroup,
    updateMarkerGroup,
    deleteMarkerGroup,
    loadMarkers,
    createMarker,
    updateMarker,
    deleteMarker,
    markAsVisited,
    loadRoutes,
    createRoute,
    updateRoute,
    deleteRoute,
    loadComments,
    createComment,
    deleteComment,
    loadSettings,
    updateSettings,
  };
}
