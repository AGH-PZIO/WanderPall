import { apiClient } from "../../../shared/api-client";
import type {
  CreateMarkerCommentRequest,
  CreateMarkerRequest,
  CreateRouteRequest,
  MapSnapshot,
  Marker,
  MarkerCategory,
  MarkerComment,
  Route,
  UpdateMarkerRequest,
  UpdateRouteRequest,
} from "../types";

// We intentionally do NOT attach Authorization headers here. The shared
// auth middleware (installed in AuthProvider, see modules/account/auth-runtime.ts)
// reads the token from `tokenStore.get()` on every request and handles
// 401-then-refresh-then-retry. Passing the header ourselves bypasses the
// retry logic and causes a 401 race when the access token has just expired.
//
// Bug previously fixed here: GroupMapPage called refresh() right after a
// PATCH; the second GET reused a stale accessToken from a useCallback
// closure (the AuthProvider had refreshed but React hadn't propagated yet),
// landed a 401, and surfaced "Invalid access token" to the user.

function describeError(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "detail" in error) {
    const detail = (error as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as { msg?: string };
      if (first?.msg) return first.msg;
    }
  }
  return fallback;
}

export async function listCategories(): Promise<MarkerCategory[]> {
  const { data, error } = await apiClient.GET("/maps/categories", {});
  if (error || !data) throw new Error(describeError(error, "Nie udało się pobrać kategorii"));
  return data.items as MarkerCategory[];
}

export async function getGroupMap(groupId: string): Promise<MapSnapshot> {
  const { data, error } = await apiClient.GET("/maps/groups/{group_id}", {
    params: { path: { group_id: groupId } },
  });
  if (error || !data) throw new Error(describeError(error, "Nie udało się pobrać mapy"));
  return data as MapSnapshot;
}

// ─── Markers ─────────────────────────────────────────────────────────────

export async function createMarker(
  groupId: string,
  body: CreateMarkerRequest,
): Promise<Marker> {
  const { data, error } = await apiClient.POST("/maps/groups/{group_id}/markers", {
    body,
    params: { path: { group_id: groupId } },
  });
  if (error || !data) throw new Error(describeError(error, "Nie udało się dodać znacznika"));
  return data as Marker;
}

export async function updateMarker(
  groupId: string,
  markerId: string,
  body: UpdateMarkerRequest,
): Promise<Marker> {
  const { data, error } = await apiClient.PATCH(
    "/maps/groups/{group_id}/markers/{marker_id}",
    {
      body,
      params: { path: { group_id: groupId, marker_id: markerId } },
    },
  );
  if (error || !data) throw new Error(describeError(error, "Nie udało się zaktualizować znacznika"));
  return data as Marker;
}

export async function deleteMarker(
  groupId: string,
  markerId: string,
): Promise<void> {
  const { error } = await apiClient.DELETE(
    "/maps/groups/{group_id}/markers/{marker_id}",
    {
      params: { path: { group_id: groupId, marker_id: markerId } },
    },
  );
  if (error) throw new Error(describeError(error, "Nie udało się usunąć znacznika"));
}

// ─── Marker comments ─────────────────────────────────────────────────────

export async function addMarkerComment(
  groupId: string,
  markerId: string,
  body: CreateMarkerCommentRequest,
): Promise<MarkerComment> {
  const { data, error } = await apiClient.POST(
    "/maps/groups/{group_id}/markers/{marker_id}/comments",
    {
      body,
      params: { path: { group_id: groupId, marker_id: markerId } },
    },
  );
  if (error || !data) throw new Error(describeError(error, "Nie udało się dodać komentarza"));
  return data as MarkerComment;
}

export async function updateMarkerComment(
  groupId: string,
  markerId: string,
  commentId: string,
  body: CreateMarkerCommentRequest,
): Promise<MarkerComment> {
  const { data, error } = await apiClient.PATCH(
    "/maps/groups/{group_id}/markers/{marker_id}/comments/{comment_id}",
    {
      body,
      params: {
        path: { group_id: groupId, marker_id: markerId, comment_id: commentId },
      },
    },
  );
  if (error || !data) throw new Error(describeError(error, "Nie udało się zaktualizować komentarza"));
  return data as MarkerComment;
}

export async function deleteMarkerComment(
  groupId: string,
  markerId: string,
  commentId: string,
): Promise<void> {
  const { error } = await apiClient.DELETE(
    "/maps/groups/{group_id}/markers/{marker_id}/comments/{comment_id}",
    {
      params: {
        path: { group_id: groupId, marker_id: markerId, comment_id: commentId },
      },
    },
  );
  if (error) throw new Error(describeError(error, "Nie udało się usunąć komentarza"));
}

// ─── Routes ──────────────────────────────────────────────────────────────

export async function createRoute(
  groupId: string,
  body: CreateRouteRequest,
): Promise<Route> {
  const { data, error } = await apiClient.POST("/maps/groups/{group_id}/routes", {
    body,
    params: { path: { group_id: groupId } },
  });
  if (error || !data) throw new Error(describeError(error, "Nie udało się dodać trasy"));
  return data as Route;
}

export async function updateRoute(
  groupId: string,
  routeId: string,
  body: UpdateRouteRequest,
): Promise<Route> {
  const { data, error } = await apiClient.PATCH(
    "/maps/groups/{group_id}/routes/{route_id}",
    {
      body,
      params: { path: { group_id: groupId, route_id: routeId } },
    },
  );
  if (error || !data) throw new Error(describeError(error, "Nie udało się zaktualizować trasy"));
  return data as Route;
}

export async function deleteRoute(
  groupId: string,
  routeId: string,
): Promise<void> {
  const { error } = await apiClient.DELETE(
    "/maps/groups/{group_id}/routes/{route_id}",
    {
      params: { path: { group_id: groupId, route_id: routeId } },
    },
  );
  if (error) throw new Error(describeError(error, "Nie udało się usunąć trasy"));
}
