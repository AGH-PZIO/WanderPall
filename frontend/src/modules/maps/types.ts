// Domain types for module 4 (Maps). Mirrors backend Pydantic schemas.
//
// Note: backend defines this contract via FastAPI; full typed paths live in
// `frontend/src/shared/api-types.ts`. These aliases are convenience exports
// for components and hooks.

export type MarkerCategoryValue =
  | "restaurant"
  | "hotel"
  | "sightseeing"
  | "transport"
  | "nature"
  | "shopping"
  | "other";

export type MarkerCategory = {
  value: MarkerCategoryValue;
  label: string;
};

export type Marker = {
  id: string;
  group_id: string;
  name: string;
  category: MarkerCategoryValue;
  latitude: number;
  longitude: number;
  visited: boolean;
  created_by: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export type RoutePoint = {
  latitude: number;
  longitude: number;
};

export type Route = {
  id: string;
  group_id: string;
  name?: string | null;
  color: string;
  points: RoutePoint[];
  created_by: string;
  created_at?: string | null;
};

export type MarkerComment = {
  id: string;
  marker_id: string;
  author_id: string;
  body: string;
  created_at?: string | null;
};

export type MapSnapshot = {
  group_id: string;
  markers: Marker[];
  routes: Route[];
  comments_by_marker: Record<string, MarkerComment[]>;
};

export type CreateMarkerRequest = {
  name: string;
  latitude: number;
  longitude: number;
  category: MarkerCategoryValue;
};

export type UpdateMarkerRequest = {
  name?: string | null;
  category?: MarkerCategoryValue | null;
  visited?: boolean | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type CreateRouteRequest = {
  name?: string | null;
  color: string;
  points: RoutePoint[];
};

export type UpdateRouteRequest = {
  name?: string | null;
  color?: string | null;
  points?: RoutePoint[] | null;
};

export type CreateMarkerCommentRequest = {
  body: string;
};

/** Localized + emoji labels for marker categories. Used in lists and badges
 *  so users see Polish names + an icon, not the raw enum value. */
export const CATEGORY_DISPLAY: Record<MarkerCategoryValue, { label: string; emoji: string }> = {
  restaurant: { label: "Restauracja", emoji: "🍽️" },
  hotel: { label: "Hotel / nocleg", emoji: "🏨" },
  sightseeing: { label: "Zabytek / atrakcja", emoji: "🏛️" },
  transport: { label: "Transport", emoji: "🚆" },
  nature: { label: "Natura", emoji: "🌳" },
  shopping: { label: "Zakupy", emoji: "🛍️" },
  other: { label: "Inne", emoji: "📍" },
};

/** Map layers (UC 4.8) — frontend-only, never persisted server-side. */
export const MAP_LAYERS = {
  standard: {
    label: "Standardowa",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors",
  },
  satellite: {
    label: "Satelitarna",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles © Esri",
  },
  terrain: {
    label: "Ukształtowanie terenu",
    url: "https://tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "© OpenTopoMap (CC-BY-SA)",
  },
} as const;

export type MapLayerId = keyof typeof MAP_LAYERS;
