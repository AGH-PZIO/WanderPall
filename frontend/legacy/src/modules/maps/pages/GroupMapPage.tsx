import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { ColorPicker } from "../../../shared/ui/ColorPicker";
import { ConfirmModal } from "../../../shared/ui/ConfirmModal";
import { useToast } from "../../../shared/ui/Toast";
import {
  addMarkerComment,
  createMarker,
  createRoute,
  deleteMarker,
  deleteMarkerComment,
  deleteRoute,
  updateMarker,
  updateMarkerComment,
  updateRoute,
} from "../api/maps-api";
import { useMapData } from "../hooks/useMapData";
import type {
  MapLayerId,
  Marker,
  MarkerCategoryValue,
  Route,
  RoutePoint,
} from "../types";
import { CATEGORY_DISPLAY, MAP_LAYERS } from "../types";
import { MapView, type MapViewHandle, type RouteDisplayOptions } from "../ui/MapView";

const DEFAULT_CATEGORY: MarkerCategoryValue = "other";
const DEFAULT_ROUTE_COLOR = "#2563eb";

type Mode = "view" | "place-marker" | "draw-route" | "edit-route";
type Selection =
  | { kind: "none" }
  | { kind: "marker"; markerId: string }
  | { kind: "route"; routeId: string };

type PendingConfirm =
  | { kind: "delete-marker"; markerId: string; name: string }
  | { kind: "delete-route"; routeId: string; name: string }
  | { kind: "delete-comment"; commentId: string }
  | { kind: "discard-route-edits" }
  | null;

type ContextMenu = {
  lat: number;
  lng: number;
  x: number;
  y: number;
} | null;

type SearchPreview = {
  lat: number;
  lng: number;
  label: string;
} | null;

type NominatimHit = {
  display_name: string;
  lat: string;
  lon: string;
};

export function GroupMapPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { groupId } = useParams<{ groupId: string }>();
  const {
    snapshot,
    categories,
    loading,
    error,
    refresh,
    accessToken,
    authLoading,
    patchMarkerLocally,
  } = useMapData(groupId);

  const mapApiRef = useRef<MapViewHandle | null>(null);

  // UI state
  const [layer, setLayer] = useState<MapLayerId>("standard");
  const [mode, setMode] = useState<Mode>("view");
  const [selection, setSelection] = useState<Selection>({ kind: "none" });
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm>(null);

  const [activeFilters, setActiveFilters] = useState<Set<MarkerCategoryValue>>(new Set());

  // Per-route display options (point 6)
  const [routeOptions, setRouteOptions] = useState<Record<string, RouteDisplayOptions>>({});

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NominatimHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchPreview, setSearchPreview] = useState<SearchPreview>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  // Context menu
  const [contextMenu, setContextMenu] = useState<ContextMenu>(null);

  // Marker placement
  const [pendingPoint, setPendingPoint] = useState<RoutePoint | null>(null);
  const [newMarkerName, setNewMarkerName] = useState("");
  const [newMarkerCategory, setNewMarkerCategory] =
    useState<MarkerCategoryValue>(DEFAULT_CATEGORY);

  // Marker rename (inline)
  const [editingMarkerName, setEditingMarkerName] = useState(false);
  const [markerNameDraft, setMarkerNameDraft] = useState("");

  // Route draft
  const [draftRoutePoints, setDraftRoutePoints] = useState<RoutePoint[]>([]);
  const [draftRouteColor, setDraftRouteColor] = useState(DEFAULT_ROUTE_COLOR);
  const [draftRouteName, setDraftRouteName] = useState("");
  const [selectedDraftPointIndex, setSelectedDraftPointIndex] = useState<number | null>(null);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  // Route name inline edit (preview panel, mirrors marker rename UX)
  const [editingRouteDetailName, setEditingRouteDetailName] = useState(false);
  const [routeNameDraft, setRouteNameDraft] = useState("");

  // Marker list sort + filter visibility (point 8)
  type SortMode =
    | "created_desc"
    | "created_asc"
    | "name_asc"
    | "name_desc"
    | "category";
  const [markerSort, setMarkerSort] = useState<SortMode>("created_desc");

  // Route hovered in the sidebar list — temporarily highlighted on the map
  // so the user can identify which route they're about to click.
  const [hoveredRouteId, setHoveredRouteId] = useState<string | null>(null);

  // Comments
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState("");

  const selectedMarker = useMemo<Marker | null>(() => {
    if (selection.kind !== "marker" || !snapshot) return null;
    return snapshot.markers.find((m) => m.id === selection.markerId) ?? null;
  }, [snapshot, selection]);

  const selectedRoute = useMemo<Route | null>(() => {
    if (selection.kind !== "route" || !snapshot) return null;
    return snapshot.routes.find((r) => r.id === selection.routeId) ?? null;
  }, [snapshot, selection]);

  const commentCountsByMarker = useMemo<Record<string, number>>(() => {
    const out: Record<string, number> = {};
    if (!snapshot) return out;
    for (const [mid, list] of Object.entries(snapshot.comments_by_marker)) {
      out[mid] = list.length;
    }
    return out;
  }, [snapshot]);

  const categoryCounts = useMemo<Map<MarkerCategoryValue, number>>(() => {
    const m = new Map<MarkerCategoryValue, number>();
    if (!snapshot) return m;
    for (const marker of snapshot.markers) {
      const k = marker.category as MarkerCategoryValue;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [snapshot]);

  const visitedStats = useMemo(() => {
    if (!snapshot) return { visited: 0, total: 0 };
    const total = snapshot.markers.length;
    const visited = snapshot.markers.filter((m) => m.visited).length;
    return { visited, total };
  }, [snapshot]);

  // Helpers ---------------------------------------------------------------

  function clearTransient() {
    setPendingPoint(null);
    setNewMarkerName("");
    setNewMarkerCategory(DEFAULT_CATEGORY);
    setDraftRoutePoints([]);
    setSelectedDraftPointIndex(null);
    setDraftRouteName("");
    setDraftRouteColor(DEFAULT_ROUTE_COLOR);
    setEditingRouteId(null);
    setEditingRouteDetailName(false);
    setRouteNameDraft("");
    setEditingCommentId(null);
    setEditingCommentBody("");
    setEditingMarkerName(false);
    setMarkerNameDraft("");
    setContextMenu(null);
    setSearchPreview(null);
  }

  function enterMode(next: Mode) {
    clearTransient();
    setSelection({ kind: "none" });
    setMode(next);
  }

  function exitMode() {
    clearTransient();
    setMode("view");
  }

  function startEditRoute(route: Route) {
    clearTransient();
    setSelection({ kind: "none" });
    setEditingRouteId(route.id);
    setDraftRoutePoints(route.points.map((p) => ({ ...p })));
    setDraftRouteColor(route.color);
    setDraftRouteName(route.name ?? "");
    setMode("edit-route");
  }

  function handleMapClick(lat: number, lng: number) {
    setContextMenu(null);
    if (mode === "place-marker") {
      setPendingPoint({ latitude: lat, longitude: lng });
      return;
    }
    if (mode === "draw-route" || mode === "edit-route") {
      setDraftRoutePoints((prev) => [...prev, { latitude: lat, longitude: lng }]);
      setSelectedDraftPointIndex(null);
    }
  }

  function handleMapBackgroundClick() {
    setContextMenu(null);
    if (mode !== "view") return;
    if (selection.kind !== "none") setSelection({ kind: "none" });
    if (searchPreview) setSearchPreview(null);
  }

  // Right click does sensible thing in EVERY mode (point 2):
  //   view         → show context menu ("Add marker here")
  //   place-marker → cancel placement (back to main menu)
  //   draw-route   → undo last vertex; if none left, exit drawing mode
  function handleMapRightClick(lat: number, lng: number, x: number, y: number) {
    if (mode === "view") {
      setContextMenu({ lat, lng, x, y });
      return;
    }
    if (mode === "place-marker") {
      if (pendingPoint) {
        setPendingPoint(null);
        setNewMarkerName("");
        toast.info("Wycofano wybór miejsca.");
      } else {
        exitMode();
        toast.info("Anulowano dodawanie znacznika.");
      }
      return;
    }
    if (mode === "draw-route" || mode === "edit-route") {
      if (draftRoutePoints.length === 0) {
        if (mode === "draw-route") exitMode();
        return;
      }
      setDraftRoutePoints((prev) => prev.slice(0, -1));
      setSelectedDraftPointIndex(null);
      toast.info("Cofnięto ostatni punkt.");
    }
  }

  function startMarkerFromContext() {
    if (!contextMenu) return;
    clearTransient();
    setMode("place-marker");
    setPendingPoint({ latitude: contextMenu.lat, longitude: contextMenu.lng });
    setContextMenu(null);
  }

  function handleDraftEdgeSplit(segmentIndex: number, lat: number, lng: number) {
    setDraftRoutePoints((prev) => {
      const next = [...prev];
      next.splice(segmentIndex + 1, 0, { latitude: lat, longitude: lng });
      return next;
    });
    setSelectedDraftPointIndex(segmentIndex + 1);
    toast.ok("Wstawiono nowy punkt.");
  }

  // Filters ---------------------------------------------------------------

  function toggleFilter(cat: MarkerCategoryValue) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }
  function clearFilters() {
    setActiveFilters(new Set());
  }

  // Route display options (point 6) --------------------------------------

  function toggleRouteNodes(routeId: string) {
    setRouteOptions((prev) => {
      const current = prev[routeId]?.showNodes ?? false;
      return { ...prev, [routeId]: { ...prev[routeId], showNodes: !current } };
    });
  }

  // Search ---------------------------------------------------------------

  useEffect(() => {
    if (searchQuery.trim().length < 3) return;
    if (searchAbortRef.current) searchAbortRef.current.abort();
    const ctrl = new AbortController();
    searchAbortRef.current = ctrl;
    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.trim())}&limit=5`;
        const res = await fetch(url, {
          signal: ctrl.signal,
          headers: { "Accept-Language": "pl" },
        });
        const data = (await res.json()) as NominatimHit[];
        if (!ctrl.signal.aborted) setSearchResults(data);
      } catch {
        // Aborted / network error — silent.
      } finally {
        if (!ctrl.signal.aborted) setSearching(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [searchQuery]);

  function pickSearchResult(hit: NominatimHit) {
    const lat = parseFloat(hit.lat);
    const lng = parseFloat(hit.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;
    mapApiRef.current?.flyTo(lat, lng, 14);
    setSearchPreview({ lat, lng, label: hit.display_name });
    setSearchResults([]);
    setSearchQuery(hit.display_name.split(",")[0]);
  }

  function addMarkerFromSearchPreview() {
    if (!searchPreview) return;
    clearTransient();
    setMode("place-marker");
    setPendingPoint({ latitude: searchPreview.lat, longitude: searchPreview.lng });
    setNewMarkerName(searchPreview.label.split(",")[0]);
    setSearchPreview(null);
  }

  // Geolocation ----------------------------------------------------------

  function locateMe() {
    if (!navigator.geolocation) {
      toast.err("Geolokalizacja nie jest dostępna w tej przeglądarce.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapApiRef.current?.flyTo(pos.coords.latitude, pos.coords.longitude, 14);
        // Surface accuracy to set expectations (point 10): desktop usually
        // gets IP-level accuracy (~kilometers); phones with GPS get meters.
        const accMeters = Math.round(pos.coords.accuracy);
        const accStr =
          accMeters >= 1000 ? `${(accMeters / 1000).toFixed(1)} km` : `${accMeters} m`;
        toast.ok(`Wycentrowano (dokładność ok. ${accStr}).`);
      },
      (err) => {
        toast.err(`Nie udało się ustalić lokalizacji: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  // Print ----------------------------------------------------------------

  function printMap() {
    window.print();
  }

  // GPX export ------------------------------------------------------------

  function exportRouteGpx(route: Route) {
    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<gpx version="1.1" creator="WanderPall" xmlns="http://www.topografix.com/GPX/1/1">\n` +
      `  <trk>\n    <name>${escapeXml(route.name || "Trasa")}</name>\n    <trkseg>\n` +
      route.points
        .map((p) => `      <trkpt lat="${p.latitude}" lon="${p.longitude}"></trkpt>`)
        .join("\n") +
      `\n    </trkseg>\n  </trk>\n</gpx>\n`;
    const blob = new Blob([xml], { type: "application/gpx+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = (route.name || "trasa").replace(/[^\w\d-]+/g, "_");
    a.download = `${safeName}.gpx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.ok("Pobrano GPX.");
  }

  // Marker CRUD ---------------------------------------------------------

  async function handleSubmitMarker(e: React.FormEvent) {
    e.preventDefault();
    if (!groupId || !pendingPoint || !newMarkerName.trim()) return;
    try {
      const created = await createMarker(groupId, {
        name: newMarkerName.trim(),
        latitude: pendingPoint.latitude,
        longitude: pendingPoint.longitude,
        category: newMarkerCategory,
      });
      toast.ok("Znacznik dodany");
      await refresh();
      clearTransient();
      setMode("view");
      setSelection({ kind: "marker", markerId: created.id });
    } catch (err) {
      toast.err(err instanceof Error ? err.message : "Błąd");
    }
  }

  function requestDeleteMarker(marker: Marker) {
    setPendingConfirm({ kind: "delete-marker", markerId: marker.id, name: marker.name });
  }
  async function confirmDeleteMarker(markerId: string) {
    if (!groupId) return;
    try {
      await deleteMarker(groupId, markerId);
      toast.ok("Znacznik usunięty");
      setSelection({ kind: "none" });
      await refresh();
    } catch (err) {
      toast.err(err instanceof Error ? err.message : "Błąd");
    }
  }

  async function handleMarkerRename() {
    if (!groupId || !selectedMarker) return;
    const next = markerNameDraft.trim();
    if (!next) {
      toast.err("Nazwa nie może być pusta.");
      return;
    }
    if (next === selectedMarker.name) {
      setEditingMarkerName(false);
      return;
    }
    try {
      await updateMarker(groupId, selectedMarker.id, { name: next });
      toast.ok("Nazwa zaktualizowana");
      await refresh();
      setEditingMarkerName(false);
    } catch (err) {
      toast.err(err instanceof Error ? err.message : "Błąd");
    }
  }

  async function handleToggleVisited(markerId: string, next: boolean) {
    if (!groupId) return;
    try {
      await updateMarker(groupId, markerId, { visited: next });
      toast.ok(next ? "Oznaczone jako odwiedzone" : "Cofnięto odwiedzenie");
      await refresh();
    } catch (err) {
      toast.err(err instanceof Error ? err.message : "Błąd");
    }
  }

  async function handleChangeCategory(category: MarkerCategoryValue) {
    if (!groupId || !selectedMarker) return;
    try {
      await updateMarker(groupId, selectedMarker.id, { category });
      toast.ok("Kategoria zaktualizowana");
      await refresh();
    } catch (err) {
      toast.err(err instanceof Error ? err.message : "Błąd");
    }
  }

  async function handleMarkerDragEnd(markerId: string, lat: number, lng: number) {
    if (!groupId) return;
    // Optimistic update — Leaflet already painted the pin at the new spot
    // on dragend. Apply the same change to React state immediately so the
    // next markers-useEffect rerender (which clears and re-adds layers)
    // re-creates the pin at the new position rather than snapping it back
    // to the stale snapshot value for a frame (point 7 — glitch).
    patchMarkerLocally(markerId, { latitude: lat, longitude: lng });
    try {
      await updateMarker(groupId, markerId, { latitude: lat, longitude: lng });
      toast.ok("Pozycja znacznika zapisana");
      // No refresh() — local state is already correct. A full GET would
      // unselect the marker by replacing the snapshot reference.
    } catch (err) {
      toast.err(err instanceof Error ? err.message : "Błąd przesuwania znacznika");
      await refresh(); // rollback to authoritative state on failure
    }
  }

  // ─── Route name inline edit (preview panel) ────────────────────────────
  async function handleRouteRename() {
    if (!groupId || !selectedRoute) return;
    const next = routeNameDraft.trim();
    const previous = selectedRoute.name ?? "";
    if (next === previous) {
      setEditingRouteDetailName(false);
      return;
    }
    try {
      await updateRoute(groupId, selectedRoute.id, { name: next || null });
      toast.ok("Nazwa trasy zaktualizowana");
      await refresh();
      setEditingRouteDetailName(false);
    } catch (err) {
      toast.err(err instanceof Error ? err.message : "Błąd");
    }
  }

  // Route CRUD ----------------------------------------------------------

  async function handleSaveRoute() {
    if (!groupId) return;
    if (draftRoutePoints.length < 2) {
      toast.err("Trasa wymaga co najmniej 2 punktów.");
      return;
    }
    try {
      const name = draftRouteName.trim() || null;
      if (editingRouteId) {
        const updated = await updateRoute(groupId, editingRouteId, {
          name,
          color: draftRouteColor,
          points: draftRoutePoints,
        });
        toast.ok("Trasa zaktualizowana");
        await refresh();
        clearTransient();
        setMode("view");
        setSelection({ kind: "route", routeId: updated.id });
      } else {
        const created = await createRoute(groupId, {
          name,
          color: draftRouteColor,
          points: draftRoutePoints,
        });
        toast.ok("Trasa dodana");
        await refresh();
        clearTransient();
        setMode("view");
        setSelection({ kind: "route", routeId: created.id });
      }
    } catch (err) {
      toast.err(err instanceof Error ? err.message : "Błąd zapisu trasy");
    }
  }

  function requestDeleteRoute(route: Route) {
    setPendingConfirm({
      kind: "delete-route",
      routeId: route.id,
      name: route.name || "(bez nazwy)",
    });
  }
  async function confirmDeleteRoute(routeId: string) {
    if (!groupId) return;
    try {
      await deleteRoute(groupId, routeId);
      toast.ok("Trasa usunięta");
      if (selection.kind === "route" && selection.routeId === routeId) {
        setSelection({ kind: "none" });
      }
      await refresh();
    } catch (err) {
      toast.err(err instanceof Error ? err.message : "Błąd");
    }
  }

  function handleDraftPointSelect(index: number) {
    setSelectedDraftPointIndex((current) => (current === index ? null : index));
  }
  function handleDraftPointDragEnd(index: number, lat: number, lng: number) {
    setDraftRoutePoints((prev) => {
      const next = [...prev];
      next[index] = { latitude: lat, longitude: lng };
      return next;
    });
    setSelectedDraftPointIndex(index);
  }
  function handleRemoveSelectedDraftPoint() {
    if (selectedDraftPointIndex === null) return;
    setDraftRoutePoints((prev) => prev.filter((_, i) => i !== selectedDraftPointIndex));
    setSelectedDraftPointIndex(null);
  }

  // Comments ------------------------------------------------------------

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!groupId || !selectedMarker || !newComment.trim()) return;
    try {
      await addMarkerComment(groupId, selectedMarker.id, { body: newComment.trim() });
      setNewComment("");
      toast.ok("Komentarz dodany");
      await refresh();
    } catch (err) {
      toast.err(err instanceof Error ? err.message : "Błąd");
    }
  }
  function startEditComment(commentId: string, body: string) {
    setEditingCommentId(commentId);
    setEditingCommentBody(body);
  }
  async function handleSaveCommentEdit() {
    if (!groupId || !selectedMarker || !editingCommentId) return;
    if (!editingCommentBody.trim()) {
      toast.err("Komentarz nie może być pusty.");
      return;
    }
    try {
      await updateMarkerComment(groupId, selectedMarker.id, editingCommentId, {
        body: editingCommentBody.trim(),
      });
      setEditingCommentId(null);
      setEditingCommentBody("");
      toast.ok("Komentarz zaktualizowany");
      await refresh();
    } catch (err) {
      toast.err(err instanceof Error ? err.message : "Błąd");
    }
  }
  function requestDeleteComment(commentId: string) {
    setPendingConfirm({ kind: "delete-comment", commentId });
  }
  async function confirmDeleteComment(commentId: string) {
    if (!groupId || !selectedMarker) return;
    try {
      await deleteMarkerComment(groupId, selectedMarker.id, commentId);
      toast.ok("Komentarz usunięty");
      await refresh();
    } catch (err) {
      toast.err(err instanceof Error ? err.message : "Błąd");
    }
  }

  function runConfirm() {
    const c = pendingConfirm;
    setPendingConfirm(null);
    if (!c) return;
    switch (c.kind) {
      case "delete-marker":
        return confirmDeleteMarker(c.markerId);
      case "delete-route":
        return confirmDeleteRoute(c.routeId);
      case "delete-comment":
        return confirmDeleteComment(c.commentId);
      case "discard-route-edits":
        clearTransient();
        setMode("view");
        return;
    }
  }

  // Render ---------------------------------------------------------------

  if (authLoading) return <div className="maps-loading">Ładowanie...</div>;
  if (!accessToken) {
    return (
      <div className="maps-empty">
        <div className="maps-empty-icon">🔐</div>
        <p>Zaloguj się, aby zobaczyć mapę.</p>
      </div>
    );
  }
  if (loading && !snapshot) return <div className="maps-loading">Ładowanie mapy...</div>;
  if (error) return <div className="maps-error">{error}</div>;
  if (!snapshot) return <div className="maps-error">Nie udało się pobrać mapy.</div>;

  const selectedComments =
    (selectedMarker && snapshot.comments_by_marker[selectedMarker.id]) || [];

  const isDrawingMode = mode === "draw-route" || mode === "edit-route";
  const showRouteForm = isDrawingMode;
  const showMarkerForm = !!pendingPoint;
  const showDetailMarker = !!selectedMarker && !pendingPoint;
  const showDetailRoute = !!selectedRoute && !pendingPoint;
  const showSearchPanel = !!searchPreview && !showRouteForm && !showMarkerForm;
  const showMainSidebar =
    !showRouteForm &&
    !showMarkerForm &&
    !showDetailMarker &&
    !showDetailRoute &&
    !showSearchPanel;

  const filtersOn = activeFilters.size > 0;
  const categoryFilter = filtersOn ? activeFilters : null;

  return (
    <div className="maps-page">
      <div className="maps-toolbar">
        <button type="button" className="maps-btn-secondary" onClick={() => navigate("/maps")}>
          ← Grupy
        </button>

        <div className="maps-toolbar-section">
          <button
            type="button"
            className={`maps-btn ${mode === "place-marker" ? "active" : ""}`}
            onClick={() => (mode === "place-marker" ? exitMode() : enterMode("place-marker"))}
            title="Kliknij potem w mapę, by wybrać miejsce"
          >
            📍 Dodaj znacznik
          </button>
          <button
            type="button"
            className={`maps-btn ${mode === "draw-route" ? "active" : ""}`}
            onClick={() => (mode === "draw-route" ? exitMode() : enterMode("draw-route"))}
            title="Kliknij kolejne punkty na mapie"
          >
            ✏️ Narysuj trasę
          </button>
        </div>

        <div className="maps-toolbar-section maps-toolbar-grow">
          <div className="maps-search">
            <input
              type="text"
              placeholder="🔎 Szukaj miejsca (OSM)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="maps-text-input"
            />
            {searchResults.length > 0 && searchQuery.trim().length >= 3 && (
              <ul className="maps-search-results">
                {searching && <li className="maps-search-loading">Szukam...</li>}
                {searchResults.map((hit, i) => (
                  <li
                    key={i}
                    onClick={() => pickSearchResult(hit)}
                    role="button"
                    tabIndex={0}
                  >
                    {hit.display_name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="maps-toolbar-section">
          <button type="button" className="maps-btn" onClick={locateMe} title="Wycentruj na Twojej lokalizacji">
            📡 Moja lokalizacja
          </button>
          <button type="button" className="maps-btn" onClick={printMap} title="Drukuj mapę">
            🖨 Drukuj
          </button>
          <label className="maps-layer-label">
            Warstwa:
            <select
              value={layer}
              onChange={(e) => setLayer(e.target.value as MapLayerId)}
              className="maps-select"
            >
              {(Object.keys(MAP_LAYERS) as MapLayerId[]).map((id) => (
                <option key={id} value={id}>
                  {MAP_LAYERS[id].label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="maps-content">
        <div className="maps-map-wrap">
          {mode === "place-marker" && !pendingPoint && (
            <div className="maps-hint-overlay">
              Kliknij w mapę w miejscu, gdzie chcesz postawić znacznik. (PPM = anuluj)
            </div>
          )}
          {isDrawingMode && draftRoutePoints.length === 0 && (
            <div className="maps-hint-overlay">
              Kliknij kolejne punkty na mapie, aby{" "}
              {mode === "edit-route" ? "edytować" : "narysować"} trasę. (PPM = cofnij)
            </div>
          )}
          {isDrawingMode && draftRoutePoints.length >= 2 && (
            <div className="maps-hint-overlay maps-hint-overlay-bottom">
              Najedź na trasę, by dodać punkt (znak "+"). PPM = cofnij ostatni.
            </div>
          )}

          <MapView
            apiRef={mapApiRef}
            markers={snapshot.markers}
            routes={snapshot.routes}
            layer={layer}
            selectedMarkerId={selectedMarker?.id ?? null}
            selectedRouteId={selectedRoute?.id ?? null}
            hoveredRouteId={hoveredRouteId}
            commentCountsByMarker={commentCountsByMarker}
            categoryFilter={categoryFilter}
            routeOptions={routeOptions}
            fitToContent={
              selection.kind === "none" &&
              !pendingPoint &&
              !isDrawingMode &&
              !searchPreview
            }
            previewPoint={mode === "place-marker" ? pendingPoint : null}
            previewCategory={newMarkerCategory}
            searchPreviewPoint={
              searchPreview ? { latitude: searchPreview.lat, longitude: searchPreview.lng } : null
            }
            placementMode={mode === "place-marker"}
            drawingRouteMode={isDrawingMode}
            editingRouteId={editingRouteId}
            draftRoutePoints={draftRoutePoints}
            draftRouteColor={draftRouteColor}
            selectedDraftPointIndex={selectedDraftPointIndex}
            onMapClick={handleMapClick}
            onMapBackgroundClick={handleMapBackgroundClick}
            onMapRightClick={handleMapRightClick}
            onMarkerClick={(id) => {
              if (isDrawingMode) return;
              setSelection({ kind: "marker", markerId: id });
            }}
            onMarkerDragEnd={handleMarkerDragEnd}
            onRouteClick={(routeId) => {
              if (isDrawingMode) return;
              setSelection({ kind: "route", routeId });
            }}
            onDraftPointSelect={handleDraftPointSelect}
            onDraftPointDragEnd={handleDraftPointDragEnd}
            onDraftEdgeSplit={handleDraftEdgeSplit}
          />

          {contextMenu && (
            <div
              className="maps-context-menu"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onContextMenu={(e) => e.preventDefault()}
            >
              <button type="button" onClick={startMarkerFromContext}>
                📍 Dodaj znacznik tutaj
              </button>
              <div className="maps-context-coords">
                {contextMenu.lat.toFixed(5)}, {contextMenu.lng.toFixed(5)}
              </div>
            </div>
          )}
        </div>

        <aside className="maps-sidebar">
          {/* Search preview panel (point 7) */}
          {showSearchPanel && searchPreview && (
            <section className="maps-sidebar-section">
              <h3>Znaleziono miejsce</h3>
              <p className="maps-search-preview-label">{searchPreview.label}</p>
              <p className="maps-coords">
                {searchPreview.lat.toFixed(5)}, {searchPreview.lng.toFixed(5)}
              </p>
              <div className="maps-form-actions">
                <button
                  type="button"
                  className="maps-btn-primary"
                  onClick={addMarkerFromSearchPreview}
                >
                  📍 Dodaj jako znacznik
                </button>
                <button
                  type="button"
                  className="maps-btn-secondary"
                  onClick={() => setSearchPreview(null)}
                >
                  Zamknij
                </button>
              </div>
            </section>
          )}

          {/* Route create / edit form */}
          {showRouteForm && (
            <section className="maps-sidebar-section">
              <div className="maps-section-heading">
                {mode === "edit-route" ? "Edycja trasy" : "Nowa trasa"}
              </div>
              <div className="maps-form">
                <label>
                  Nazwa
                  <input
                    type="text"
                    value={draftRouteName}
                    onChange={(e) => setDraftRouteName(e.target.value)}
                    maxLength={100}
                    className="maps-text-input"
                    placeholder="Trasa bez nazwy"
                  />
                </label>
                <label className="maps-inline-field">
                  Kolor:
                  <ColorPicker value={draftRouteColor} onChange={setDraftRouteColor} />
                </label>

                <div className="maps-route-status">
                  <div>
                    <strong>Punkty:</strong> {draftRoutePoints.length}
                    {draftRoutePoints.length < 2 && (
                      <span className="maps-route-warning"> · min. 2</span>
                    )}
                  </div>
                  <div className="maps-drag-hint">
                    Klikaj w mapę, aby dodać punkty. Przeciągaj uchwyty, aby je
                    przesuwać. Najedź na trasę, aby wstawić punkt po środku.
                  </div>
                </div>

                {selectedDraftPointIndex !== null && (
                  <div className="maps-selected-point-actions">
                    <span>
                      Punkt <strong>{selectedDraftPointIndex + 1}</strong> /{" "}
                      {draftRoutePoints.length}
                    </span>
                    <button
                      type="button"
                      className="maps-btn-danger"
                      onClick={handleRemoveSelectedDraftPoint}
                    >
                      <span className="maps-icon-trash" aria-hidden /> Usuń punkt
                    </button>
                  </div>
                )}

                <div className="maps-form-actions">
                  <button
                    type="button"
                    className="maps-btn-primary"
                    onClick={handleSaveRoute}
                    disabled={draftRoutePoints.length < 2}
                  >
                    ✓ {mode === "edit-route" ? "Zapisz zmiany" : "Utwórz trasę"}
                  </button>
                  <button
                    type="button"
                    className="maps-btn-secondary"
                    onClick={() => {
                      if (mode === "edit-route") {
                        setPendingConfirm({ kind: "discard-route-edits" });
                      } else {
                        exitMode();
                      }
                    }}
                  >
                    Anuluj
                  </button>
                  {mode === "draw-route" && draftRoutePoints.length > 0 && (
                    <button
                      type="button"
                      className="maps-btn-secondary"
                      onClick={() => {
                        setDraftRoutePoints([]);
                        setSelectedDraftPointIndex(null);
                      }}
                    >
                      Wyczyść punkty
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Marker create form */}
          {showMarkerForm && (
            <section className="maps-sidebar-section">
              <h3>Nowy znacznik</h3>
              <form className="maps-form" onSubmit={handleSubmitMarker}>
                <label>
                  Nazwa
                  <input
                    type="text"
                    value={newMarkerName}
                    onChange={(e) => setNewMarkerName(e.target.value)}
                    maxLength={100}
                    minLength={1}
                    required
                    autoFocus
                    className="maps-text-input"
                  />
                </label>
                <label>
                  Kategoria
                  <select
                    value={newMarkerCategory}
                    onChange={(e) =>
                      setNewMarkerCategory(e.target.value as MarkerCategoryValue)
                    }
                    className="maps-select"
                  >
                    {categories.map((c) => (
                      <option key={c.value} value={c.value}>
                        {CATEGORY_DISPLAY[c.value as MarkerCategoryValue]?.emoji}{" "}
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                {pendingPoint && (
                  <p className="maps-coords">
                    {pendingPoint.latitude.toFixed(5)}, {pendingPoint.longitude.toFixed(5)}
                  </p>
                )}
                <div className="maps-form-actions">
                  <button type="submit" className="maps-btn-primary">
                    Dodaj
                  </button>
                  <button
                    type="button"
                    className="maps-btn-secondary"
                    onClick={exitMode}
                  >
                    Anuluj
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* Marker detail */}
          {showDetailMarker && selectedMarker && (
            <section className="maps-sidebar-section">
              <div className="maps-marker-detail-header">
                {editingMarkerName ? (
                  <input
                    type="text"
                    value={markerNameDraft}
                    onChange={(e) => setMarkerNameDraft(e.target.value)}
                    onBlur={handleMarkerRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleMarkerRename();
                      }
                      if (e.key === "Escape") setEditingMarkerName(false);
                    }}
                    maxLength={100}
                    autoFocus
                    className="maps-text-input maps-name-input"
                  />
                ) : (
                  <h3
                    className="maps-detail-title"
                    onClick={() => {
                      setMarkerNameDraft(selectedMarker.name);
                      setEditingMarkerName(true);
                    }}
                    title="Kliknij, aby zmienić nazwę"
                  >
                    {selectedMarker.name}{" "}
                    <span className="maps-edit-hint" aria-hidden>✎</span>
                  </h3>
                )}
                <button
                  type="button"
                  className="maps-icon-btn"
                  onClick={() => setSelection({ kind: "none" })}
                  aria-label="Zamknij"
                  title="Zamknij"
                >
                  ✕
                </button>
              </div>

              <div className="maps-marker-meta">
                <div>
                  <strong>Kategoria:</strong>{" "}
                  {CATEGORY_DISPLAY[selectedMarker.category]?.emoji}{" "}
                  {CATEGORY_DISPLAY[selectedMarker.category]?.label}
                </div>
                <div>
                  <strong>Współrzędne:</strong>{" "}
                  <span className="maps-mono">
                    {selectedMarker.latitude.toFixed(5)},{" "}
                    {selectedMarker.longitude.toFixed(5)}
                  </span>
                </div>
                <div className="maps-drag-hint">
                  Przeciągnij pinezkę na mapie, aby zmienić jej pozycję.
                </div>
              </div>

              <div className="maps-marker-actions">
                <label className="maps-switch-row">
                  <span>Odwiedzone</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={selectedMarker.visited}
                    className={`maps-switch ${selectedMarker.visited ? "on" : ""}`}
                    onClick={() => handleToggleVisited(selectedMarker.id, !selectedMarker.visited)}
                  >
                    <span className="maps-switch-thumb" />
                  </button>
                </label>

                <label className="maps-category-pick">
                  Kategoria:
                  <select
                    value={selectedMarker.category}
                    onChange={(e) =>
                      handleChangeCategory(e.target.value as MarkerCategoryValue)
                    }
                    className="maps-select"
                  >
                    {categories.map((c) => (
                      <option key={c.value} value={c.value}>
                        {CATEGORY_DISPLAY[c.value as MarkerCategoryValue]?.emoji}{" "}
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  className="maps-btn-danger"
                  onClick={() => requestDeleteMarker(selectedMarker)}
                >
                  <span className="maps-icon-trash" aria-hidden /> Usuń znacznik
                </button>
              </div>

              <h4>Komentarze ({selectedComments.length})</h4>
              <ul className="maps-comments">
                {selectedComments.length === 0 && (
                  <li className="maps-comments-empty">Brak komentarzy.</li>
                )}
                {selectedComments.map((c) => {
                  const isEditing = editingCommentId === c.id;
                  return (
                    <li key={c.id} className="maps-comment">
                      {isEditing ? (
                        <div className="maps-comment-edit">
                          <textarea
                            value={editingCommentBody}
                            onChange={(e) => setEditingCommentBody(e.target.value)}
                            maxLength={1000}
                            autoFocus
                          />
                          <div className="maps-comment-edit-actions">
                            <button
                              type="button"
                              className="maps-btn-primary maps-btn-small"
                              onClick={handleSaveCommentEdit}
                            >
                              Zapisz
                            </button>
                            <button
                              type="button"
                              className="maps-btn-secondary maps-btn-small"
                              onClick={() => {
                                setEditingCommentId(null);
                                setEditingCommentBody("");
                              }}
                            >
                              Anuluj
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="maps-comment-body">{c.body}</div>
                          <div className="maps-comment-meta">
                            <span>
                              {c.created_at &&
                                new Date(c.created_at).toLocaleString("pl-PL")}
                            </span>
                            <div className="maps-comment-tools">
                              <button
                                type="button"
                                className="maps-comment-tool"
                                onClick={() => startEditComment(c.id, c.body)}
                                title="Edytuj"
                              >
                                ✎
                              </button>
                              <button
                                type="button"
                                className="maps-comment-tool maps-comment-tool-danger"
                                onClick={() => requestDeleteComment(c.id)}
                                title="Usuń"
                              >
                                <span className="maps-icon-trash" aria-hidden />
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>

              <form className="maps-comment-form" onSubmit={handleSubmitComment}>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Dodaj komentarz pod znacznikiem..."
                  maxLength={1000}
                />
                <button
                  type="submit"
                  className="maps-btn-primary"
                  disabled={!newComment.trim()}
                >
                  Dodaj komentarz
                </button>
              </form>
            </section>
          )}

          {/* Route detail */}
          {showDetailRoute && selectedRoute && (
            <section className="maps-sidebar-section">
              <div className="maps-marker-detail-header">
                {editingRouteDetailName ? (
                  <input
                    type="text"
                    value={routeNameDraft}
                    onChange={(e) => setRouteNameDraft(e.target.value)}
                    onBlur={handleRouteRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleRouteRename();
                      }
                      if (e.key === "Escape") setEditingRouteDetailName(false);
                    }}
                    maxLength={100}
                    autoFocus
                    placeholder="Trasa bez nazwy"
                    className="maps-text-input maps-name-input"
                  />
                ) : (
                  <h3
                    className="maps-detail-title"
                    onClick={() => {
                      setRouteNameDraft(selectedRoute.name ?? "");
                      setEditingRouteDetailName(true);
                    }}
                    title="Kliknij, aby zmienić nazwę"
                  >
                    {selectedRoute.name || "Trasa bez nazwy"}{" "}
                    <span className="maps-edit-hint" aria-hidden>✎</span>
                  </h3>
                )}
                <button
                  type="button"
                  className="maps-icon-btn"
                  onClick={() => setSelection({ kind: "none" })}
                  aria-label="Zamknij"
                  title="Zamknij"
                >
                  ✕
                </button>
              </div>
              <div className="maps-marker-meta">
                <div>
                  <span
                    className="maps-route-swatch"
                    style={{ background: selectedRoute.color }}
                  />{" "}
                  <span className="maps-mono">{selectedRoute.color}</span>
                </div>
                <div>
                  <strong>Liczba punktów:</strong> {selectedRoute.points.length}
                </div>
              </div>

              {/* Per-route display options (point 6) */}
              <div className="maps-marker-actions">
                <label className="maps-switch-row">
                  <span>Numery punktów na mapie</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={routeOptions[selectedRoute.id]?.showNodes ?? false}
                    className={`maps-switch ${
                      routeOptions[selectedRoute.id]?.showNodes ? "on" : ""
                    }`}
                    onClick={() => toggleRouteNodes(selectedRoute.id)}
                  >
                    <span className="maps-switch-thumb" />
                  </button>
                </label>

                <button
                  type="button"
                  className="maps-btn-primary"
                  onClick={() => startEditRoute(selectedRoute)}
                >
                  ✎ Edytuj trasę
                </button>
                <button
                  type="button"
                  className="maps-btn"
                  onClick={() => exportRouteGpx(selectedRoute)}
                  title="Pobierz jako plik GPX"
                >
                  ⬇ Eksportuj GPX
                </button>
                <button
                  type="button"
                  className="maps-btn-danger"
                  onClick={() => requestDeleteRoute(selectedRoute)}
                >
                  <span className="maps-icon-trash" aria-hidden /> Usuń trasę
                </button>
              </div>
            </section>
          )}

          {/* Main menu */}
          {showMainSidebar && (
            <section className="maps-sidebar-section">
              <h3>Trasy ({snapshot.routes.length})</h3>
              {snapshot.routes.length === 0 ? (
                <p className="maps-empty-text">Brak tras. Narysuj pierwszą trasę.</p>
              ) : (
                <ul className="maps-route-list">
                  {snapshot.routes.map((r: Route) => (
                    <li
                      key={r.id}
                      className="maps-route-row"
                      onClick={() => setSelection({ kind: "route", routeId: r.id })}
                      onMouseEnter={() => setHoveredRouteId(r.id)}
                      onMouseLeave={() =>
                        setHoveredRouteId((cur) => (cur === r.id ? null : cur))
                      }
                      role="button"
                      tabIndex={0}
                    >
                      <span
                        className="maps-route-swatch"
                        style={{ background: r.color }}
                      />
                      <div className="maps-route-info">
                        <div className="maps-route-name">
                          {r.name || "Trasa bez nazwy"}
                        </div>
                        <div className="maps-route-meta">{r.points.length} punktów</div>
                      </div>
                      <button
                        type="button"
                        className="maps-icon-btn maps-icon-btn-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          requestDeleteRoute(r);
                        }}
                        title="Usuń trasę"
                      >
                        <span className="maps-icon-trash" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Markers section: header + progress + filters + sort + list (point 8) */}
              <div className="maps-markers-header">
                <h3>
                  Znaczniki ({snapshot.markers.length}
                  {filtersOn ? ` · filtr: ${activeFilters.size} kat.` : ""})
                </h3>
                {snapshot.markers.length > 0 && (
                  <select
                    value={markerSort}
                    onChange={(e) => setMarkerSort(e.target.value as SortMode)}
                    className="maps-select maps-sort-select"
                    title="Sortuj listę"
                  >
                    <option value="created_desc">Najnowsze</option>
                    <option value="created_asc">Najstarsze</option>
                    <option value="name_asc">Nazwa A→Z</option>
                    <option value="name_desc">Nazwa Z→A</option>
                    <option value="category">Kategoria</option>
                  </select>
                )}
              </div>

              {visitedStats.total > 0 && (
                <div className="maps-progress-wrap">
                  <div className="maps-progress-row">
                    <span>Odwiedzone</span>
                    <span className="maps-progress-count">
                      {visitedStats.visited} / {visitedStats.total}
                    </span>
                  </div>
                  <div className="maps-progress-bar">
                    <div
                      className="maps-progress-fill"
                      style={{
                        width: `${
                          visitedStats.total > 0
                            ? Math.round(
                                (visitedStats.visited / visitedStats.total) * 100,
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {categoryCounts.size > 0 && (
                <div className="maps-chips">
                  {Array.from(categoryCounts.entries()).map(([cat, count]) => {
                    const active = activeFilters.has(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        className={`maps-chip ${active ? "active" : ""}`}
                        onClick={() => toggleFilter(cat)}
                      >
                        {CATEGORY_DISPLAY[cat]?.emoji} {CATEGORY_DISPLAY[cat]?.label}{" "}
                        <span className="maps-chip-count">{count}</span>
                      </button>
                    );
                  })}
                  {filtersOn && (
                    <button
                      type="button"
                      className="maps-chip maps-chip-clear"
                      onClick={clearFilters}
                    >
                      Wyczyść filtry
                    </button>
                  )}
                </div>
              )}

              {snapshot.markers.length === 0 ? (
                <p className="maps-empty-text">
                  Brak znaczników. Kliknij "Dodaj znacznik" i wybierz miejsce na mapie.
                </p>
              ) : (
                <ul className="maps-marker-list">
                  {sortMarkers(
                    snapshot.markers.filter(
                      (m) =>
                        !filtersOn ||
                        activeFilters.has(m.category as MarkerCategoryValue),
                    ),
                    markerSort,
                  ).map((m) => (
                    <li key={m.id} className="maps-marker-row">
                      <button
                        type="button"
                        className="maps-marker-row-main"
                        onClick={() => setSelection({ kind: "marker", markerId: m.id })}
                      >
                        <span className="maps-marker-name">
                          {CATEGORY_DISPLAY[m.category]?.emoji} {m.name}
                        </span>
                        <span className="maps-marker-cat">
                          {CATEGORY_DISPLAY[m.category]?.label}
                        </span>
                      </button>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={m.visited}
                        className={`maps-mini-switch ${m.visited ? "on" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleVisited(m.id, !m.visited);
                        }}
                        title={m.visited ? "Odznacz odwiedzone" : "Oznacz odwiedzone"}
                      >
                        <span className="maps-mini-switch-thumb" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </aside>
      </div>

      <ConfirmModal
        open={pendingConfirm !== null}
        title={
          pendingConfirm?.kind === "delete-marker"
            ? "Usunąć znacznik?"
            : pendingConfirm?.kind === "delete-route"
            ? "Usunąć trasę?"
            : pendingConfirm?.kind === "delete-comment"
            ? "Usunąć komentarz?"
            : "Odrzucić zmiany trasy?"
        }
        body={
          pendingConfirm?.kind === "delete-marker"
            ? `Znacznik "${pendingConfirm.name}" zostanie usunięty wraz z komentarzami.`
            : pendingConfirm?.kind === "delete-route"
            ? `Trasa "${pendingConfirm.name}" zostanie usunięta.`
            : pendingConfirm?.kind === "delete-comment"
            ? "Komentarz zostanie nieodwracalnie usunięty."
            : "Wprowadzone zmiany nie zostaną zapisane."
        }
        confirmLabel={
          pendingConfirm?.kind === "discard-route-edits" ? "Odrzuć" : "Usuń"
        }
        cancelLabel="Anuluj"
        variant="danger"
        onConfirm={runConfirm}
        onCancel={() => setPendingConfirm(null)}
      />
    </div>
  );
}

type SortModeValue =
  | "created_desc"
  | "created_asc"
  | "name_asc"
  | "name_desc"
  | "category";

function sortMarkers(list: Marker[], mode: SortModeValue): Marker[] {
  const copy = [...list];
  const byName = (a: Marker, b: Marker) =>
    a.name.localeCompare(b.name, "pl", { sensitivity: "base" });
  const byCreated = (a: Marker, b: Marker) => {
    const ta = a.created_at ? Date.parse(a.created_at) : 0;
    const tb = b.created_at ? Date.parse(b.created_at) : 0;
    return ta - tb;
  };
  switch (mode) {
    case "name_asc":
      return copy.sort(byName);
    case "name_desc":
      return copy.sort((a, b) => -byName(a, b));
    case "created_asc":
      return copy.sort(byCreated);
    case "category":
      return copy.sort((a, b) => {
        const c = a.category.localeCompare(b.category);
        return c !== 0 ? c : byName(a, b);
      });
    case "created_desc":
    default:
      return copy.sort((a, b) => -byCreated(a, b));
  }
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
