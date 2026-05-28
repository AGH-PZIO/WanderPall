import { useEffect, useImperativeHandle, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import type {
  MapLayerId,
  MarkerCategoryValue,
  Marker as MapMarker,
  Route,
  RoutePoint,
} from "../types";
import { CATEGORY_DISPLAY, MAP_LAYERS } from "../types";

// ─── Helpers ─────────────────────────────────────────────────────────────

/** Pick black or white text to maximize WCAG contrast against the given hex. */
function contrastColor(hex: string): string {
  // Defensive parse — accept #rgb / #rrggbb.
  const clean = hex.replace("#", "");
  const expanded =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  if (expanded.length !== 6) return "#fff";
  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);
  // Relative luminance per sRGB definition (https://www.w3.org/TR/AERT/#color-contrast).
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#111827" : "#ffffff";
}

function buildCategoryDivIcon(
  category: string,
  visited: boolean,
  hasComment: boolean,
  selected: boolean,
): L.DivIcon {
  const emoji = CATEGORY_DISPLAY[category as keyof typeof CATEGORY_DISPLAY]?.emoji ?? "📍";
  const bg = visited ? "#22c55e" : "#2563eb";
  const ringStyle = selected
    ? "box-shadow: 0 0 0 3px rgba(37,99,235,0.6), 0 2px 6px rgba(0,0,0,0.3);"
    : "box-shadow: 0 2px 6px rgba(0,0,0,0.3);";
  const badge = hasComment
    ? `<span class="maps-marker-badge" title="Komentarze">💬</span>`
    : "";
  return L.divIcon({
    className: "maps-marker-icon",
    html: `<div class="maps-marker-pin" style="background:${bg}; ${ringStyle}">${emoji}${badge}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 28],
    popupAnchor: [0, -28],
  });
}

function buildPreviewDivIcon(category: string): L.DivIcon {
  const emoji = CATEGORY_DISPLAY[category as keyof typeof CATEGORY_DISPLAY]?.emoji ?? "📍";
  return L.divIcon({
    className: "maps-marker-icon maps-marker-icon-preview",
    html: `<div class="maps-marker-pin maps-marker-pin-preview">${emoji}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 28],
  });
}

function buildSearchPreviewDivIcon(): L.DivIcon {
  return L.divIcon({
    className: "maps-marker-icon maps-marker-icon-search",
    html: `<div class="maps-marker-pin maps-marker-pin-search">🔎</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 28],
  });
}

/**
 * Numbered draggable vertex with dynamic text contrast (point 4). Start/End
 * are also labelled. Used both for the draft polyline (drawing/editing) and
 * for read-only "show node numbers" overlay on saved routes (point 6 — but
 * non-draggable in the saved case).
 */
function buildRouteHandleIcon(
  color: string,
  number: number,
  total: number,
  isSelected: boolean,
  readOnly = false,
): L.DivIcon {
  const baseSize = readOnly ? 16 : 18;
  const size = isSelected ? 22 : baseSize;
  const fg = contrastColor(color);
  const role =
    !readOnly && number === 1
      ? `<span class="maps-route-handle-role start">START</span>`
      : !readOnly && number === total
      ? `<span class="maps-route-handle-role end">META</span>`
      : "";
  return L.divIcon({
    className: "maps-route-handle",
    html: `<div class="maps-route-handle-dot${isSelected ? " selected" : ""}" style="background:${color}; color:${fg}">${number}</div>${role}`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/**
 * Project a point onto the closest segment of a polyline. Returns the
 * projection point + the index of the segment START (so callers can insert
 * a vertex at index+1). Distances are computed in screen pixels via the
 * supplied map, so "closest" matches user intuition at the current zoom.
 */
function nearestSegmentProjection(
  map: L.Map,
  points: RoutePoint[],
  click: L.LatLng,
): { segmentIndex: number; latlng: L.LatLng; distancePx: number } | null {
  if (points.length < 2) return null;
  const clickPx = map.latLngToContainerPoint(click);
  let best: { segmentIndex: number; latlng: L.LatLng; distancePx: number } | null = null;
  for (let i = 0; i < points.length - 1; i++) {
    const a = map.latLngToContainerPoint([points[i].latitude, points[i].longitude]);
    const b = map.latLngToContainerPoint([
      points[i + 1].latitude,
      points[i + 1].longitude,
    ]);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) continue;
    let t = ((clickPx.x - a.x) * dx + (clickPx.y - a.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const projPx = L.point(a.x + t * dx, a.y + t * dy);
    const dist = clickPx.distanceTo(projPx);
    if (!best || dist < best.distancePx) {
      const latlng = map.containerPointToLatLng(projPx);
      best = { segmentIndex: i, latlng, distancePx: dist };
    }
  }
  return best;
}

const ROUTE_HIT_PX = 14;
const EDGE_HIT_PX = 18;

// ─── Exports ────────────────────────────────────────────────────────────

export type MapViewHandle = {
  flyTo: (lat: number, lng: number, zoom?: number) => void;
};

export type RouteDisplayOptions = {
  showNodes: boolean;
};

export type MapViewProps = {
  markers: MapMarker[];
  routes: Route[];
  layer: MapLayerId;
  selectedMarkerId: string | null;
  selectedRouteId: string | null;
  /** Route id currently hovered in the sidebar list — temporarily highlighted. */
  hoveredRouteId: string | null;
  commentCountsByMarker: Record<string, number>;
  categoryFilter: ReadonlySet<MarkerCategoryValue> | null;
  /** Per-route display options (UC: show numbered nodes on saved routes). */
  routeOptions: Record<string, RouteDisplayOptions>;
  fitToContent?: boolean;
  previewPoint: RoutePoint | null;
  previewCategory: string;
  /** Optional search-result preview pin (point 7). */
  searchPreviewPoint: RoutePoint | null;
  placementMode: boolean;
  drawingRouteMode: boolean;
  editingRouteId: string | null;
  draftRoutePoints: RoutePoint[];
  draftRouteColor: string;
  selectedDraftPointIndex: number | null;
  onMapClick: (lat: number, lng: number) => void;
  onMapBackgroundClick: () => void;
  onMapRightClick: (lat: number, lng: number, screenX: number, screenY: number) => void;
  onMarkerClick: (markerId: string) => void;
  onMarkerDragEnd: (markerId: string, lat: number, lng: number) => void;
  onRouteClick: (routeId: string) => void;
  onDraftPointSelect: (index: number) => void;
  onDraftPointDragEnd: (index: number, lat: number, lng: number) => void;
  /** Insert a point at the projection on the draft polyline (split edge). */
  onDraftEdgeSplit: (segmentIndex: number, lat: number, lng: number) => void;
  apiRef?: React.MutableRefObject<MapViewHandle | null>;
};

const FALLBACK_CENTER: [number, number] = [50.0617, 19.9373];
const FALLBACK_ZOOM = 12;

export function MapView({
  markers,
  routes,
  layer,
  selectedMarkerId,
  selectedRouteId,
  hoveredRouteId,
  commentCountsByMarker,
  categoryFilter,
  routeOptions,
  fitToContent,
  previewPoint,
  previewCategory,
  searchPreviewPoint,
  placementMode,
  drawingRouteMode,
  editingRouteId,
  draftRoutePoints,
  draftRouteColor,
  selectedDraftPointIndex,
  onMapClick,
  onMapBackgroundClick,
  onMapRightClick,
  onMarkerClick,
  onMarkerDragEnd,
  onRouteClick,
  onDraftPointSelect,
  onDraftPointDragEnd,
  onDraftEdgeSplit,
  apiRef,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const routeNodesLayerRef = useRef<L.LayerGroup | null>(null);
  const draftLayerRef = useRef<L.LayerGroup | null>(null);
  const draftPolylineRef = useRef<L.Polyline | null>(null);
  const draftHandlesRef = useRef<L.Marker[]>([]);
  const draftEdgePreviewRef = useRef<L.CircleMarker | null>(null);
  const previewMarkerRef = useRef<L.Marker | null>(null);
  const searchPreviewMarkerRef = useRef<L.Marker | null>(null);

  // Refs so handlers can read latest state without re-binding listeners.
  const draftPointsRef = useRef<RoutePoint[]>(draftRoutePoints);
  draftPointsRef.current = draftRoutePoints;
  const drawingModeRef = useRef(drawingRouteMode);
  drawingModeRef.current = drawingRouteMode;
  // True while ANY draft vertex handle is currently being dragged — used to
  // suppress the edge-add "+" preview, which would otherwise flicker on top
  // of the marker the user is holding (point 1).
  const isDraggingHandleRef = useRef(false);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: FALLBACK_CENTER,
      zoom: FALLBACK_ZOOM,
      zoomControl: true,
    });
    mapRef.current = map;
    markerLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    routeNodesLayerRef.current = L.layerGroup().addTo(map);
    draftLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useImperativeHandle(
    apiRef ?? { current: null },
    () => ({
      flyTo(lat, lng, zoom) {
        const map = mapRef.current;
        if (!map) return;
        map.flyTo([lat, lng], zoom ?? 14, { duration: 0.5 });
      },
    }),
    [apiRef],
  );

  // Map click + right-click + background-click + edge-split
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (placementMode || drawingRouteMode) {
        // 1) Snap to vertex
        if (drawingRouteMode && draftPointsRef.current.length > 0) {
          const clickPt = map.latLngToContainerPoint(e.latlng);
          for (let i = 0; i < draftPointsRef.current.length; i++) {
            const pt = draftPointsRef.current[i];
            const px = map.latLngToContainerPoint([pt.latitude, pt.longitude]);
            if (clickPt.distanceTo(px) <= ROUTE_HIT_PX) {
              onDraftPointSelect(i);
              return;
            }
          }
          // 2) Split an edge (point 1): if click lands near the polyline
          //    but not on a vertex, insert a new point at the projection.
          const proj = nearestSegmentProjection(
            map,
            draftPointsRef.current,
            e.latlng,
          );
          if (proj && proj.distancePx <= EDGE_HIT_PX) {
            onDraftEdgeSplit(proj.segmentIndex, proj.latlng.lat, proj.latlng.lng);
            return;
          }
        }
        // 3) Otherwise append a new point or place the marker
        onMapClick(e.latlng.lat, e.latlng.lng);
        return;
      }
      onMapBackgroundClick();
    };

    const handleContext = (e: L.LeafletMouseEvent) => {
      // Hand over to parent — it decides whether to undo a draft point,
      // cancel placement, or show a normal context menu.
      onMapRightClick(
        e.latlng.lat,
        e.latlng.lng,
        e.originalEvent.clientX,
        e.originalEvent.clientY,
      );
    };

    // Mousemove (drawing mode only): show a "+" preview if hovering near an
    // edge of the draft polyline — but NOT while a handle is being dragged
    // and NOT when the cursor is essentially on top of an existing vertex.
    const handleMove = (e: L.LeafletMouseEvent) => {
      const layerGroup = draftLayerRef.current;
      if (!layerGroup) return;

      const clearPreview = () => {
        if (draftEdgePreviewRef.current) {
          layerGroup.removeLayer(draftEdgePreviewRef.current);
          draftEdgePreviewRef.current = null;
        }
      };

      if (!drawingModeRef.current || draftPointsRef.current.length < 2) {
        clearPreview();
        return;
      }
      // Point 1: suppress while dragging any handle.
      if (isDraggingHandleRef.current) {
        clearPreview();
        return;
      }
      // Point 2: suppress when the cursor is within snap-to-vertex range of
      // any existing point — there we want the "select vertex" interaction,
      // not the "add new point" interaction.
      const cursorPx = map.latLngToContainerPoint(e.latlng);
      for (const pt of draftPointsRef.current) {
        const px = map.latLngToContainerPoint([pt.latitude, pt.longitude]);
        if (cursorPx.distanceTo(px) <= ROUTE_HIT_PX) {
          clearPreview();
          return;
        }
      }

      const proj = nearestSegmentProjection(map, draftPointsRef.current, e.latlng);
      if (!proj || proj.distancePx > EDGE_HIT_PX) {
        clearPreview();
        return;
      }
      if (!draftEdgePreviewRef.current) {
        const preview = L.marker(proj.latlng, {
          icon: L.divIcon({
            className: "maps-edge-add-preview-wrap",
            html: `<div class="maps-edge-add-preview">+</div>`,
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          }),
          interactive: false,
          keyboard: false,
          zIndexOffset: 900,
        });
        preview.addTo(layerGroup);
        draftEdgePreviewRef.current = preview as unknown as L.CircleMarker;
      } else {
        (draftEdgePreviewRef.current as unknown as L.Marker).setLatLng(proj.latlng);
      }
    };

    const handleMouseOut = () => {
      const layerGroup = draftLayerRef.current;
      if (!layerGroup) return;
      if (draftEdgePreviewRef.current) {
        layerGroup.removeLayer(draftEdgePreviewRef.current);
        draftEdgePreviewRef.current = null;
      }
    };

    map.on("click", handleClick);
    map.on("contextmenu", handleContext);
    map.on("mousemove", handleMove);
    map.on("mouseout", handleMouseOut);
    return () => {
      map.off("click", handleClick);
      map.off("contextmenu", handleContext);
      map.off("mousemove", handleMove);
      map.off("mouseout", handleMouseOut);
    };
  }, [
    placementMode,
    drawingRouteMode,
    onMapClick,
    onMapBackgroundClick,
    onMapRightClick,
    onDraftPointSelect,
    onDraftEdgeSplit,
  ]);

  // Tiles
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
    const cfg = MAP_LAYERS[layer];
    tileLayerRef.current = L.tileLayer(cfg.url, {
      maxZoom: 19,
      attribution: cfg.attribution,
    }).addTo(map);
  }, [layer]);

  // Cursor
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getContainer().style.cursor =
      placementMode || drawingRouteMode ? "crosshair" : "";
  }, [placementMode, drawingRouteMode]);

  // Markers
  useEffect(() => {
    const layerGroup = markerLayerRef.current;
    if (!layerGroup) return;
    layerGroup.clearLayers();
    for (const m of markers) {
      if (categoryFilter && !categoryFilter.has(m.category as MarkerCategoryValue)) continue;
      const hasComment = (commentCountsByMarker[m.id] ?? 0) > 0;
      const isSelected = m.id === selectedMarkerId;
      const icon = buildCategoryDivIcon(m.category, m.visited, hasComment, isSelected);
      // Point 7: only the currently selected marker is draggable. Otherwise
      // the user can accidentally yank a pin while panning the map.
      const marker = L.marker([m.latitude, m.longitude], {
        icon,
        draggable: isSelected,
      });
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onMarkerClick(m.id);
      });
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onMarkerDragEnd(m.id, pos.lat, pos.lng);
      });
      if (isSelected) marker.setZIndexOffset(1000);
      const tooltipText = hasComment
        ? `${m.name} · 💬 ${commentCountsByMarker[m.id]} komentarz(y)`
        : m.name;
      marker.bindTooltip(tooltipText, { direction: "top", offset: [0, -24] });
      layerGroup.addLayer(marker);
    }
  }, [
    markers,
    selectedMarkerId,
    commentCountsByMarker,
    categoryFilter,
    onMarkerClick,
    onMarkerDragEnd,
  ]);

  // Persisted routes (skip the one being edited)
  useEffect(() => {
    const layerGroup = routeLayerRef.current;
    if (!layerGroup) return;
    layerGroup.clearLayers();
    for (const r of routes) {
      if (editingRouteId && r.id === editingRouteId) continue;
      const isSelected = r.id === selectedRouteId;
      const isHovered = r.id === hoveredRouteId && !isSelected;
      // Hovered route in the sidebar list temporarily widens + grows on map
      // so the user can confirm which one they're about to click.
      const polyline = L.polyline(
        r.points.map((pt) => [pt.latitude, pt.longitude] as [number, number]),
        {
          color: r.color,
          weight: isSelected ? 6 : isHovered ? 7 : 4,
          opacity: isSelected ? 1 : isHovered ? 1 : 0.85,
          bubblingMouseEvents: false,
        },
      );
      polyline.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onRouteClick(r.id);
      });
      if (r.name) polyline.bindTooltip(r.name);
      layerGroup.addLayer(polyline);
    }
  }, [routes, editingRouteId, selectedRouteId, hoveredRouteId, onRouteClick]);

  // Read-only node numbers on saved routes (point 6)
  useEffect(() => {
    const layerGroup = routeNodesLayerRef.current;
    if (!layerGroup) return;
    layerGroup.clearLayers();
    for (const r of routes) {
      if (editingRouteId && r.id === editingRouteId) continue;
      if (!routeOptions[r.id]?.showNodes) continue;
      for (let i = 0; i < r.points.length; i++) {
        const pt = r.points[i];
        const icon = buildRouteHandleIcon(r.color, i + 1, r.points.length, false, true);
        const dot = L.marker([pt.latitude, pt.longitude], {
          icon,
          interactive: false,
          keyboard: false,
          zIndexOffset: 600,
        });
        layerGroup.addLayer(dot);
      }
    }
  }, [routes, routeOptions, editingRouteId]);

  // Draft layer (the live route being drawn/edited)
  useEffect(() => {
    const layerGroup = draftLayerRef.current;
    if (!layerGroup) return;
    layerGroup.clearLayers();
    draftPolylineRef.current = null;
    draftHandlesRef.current = [];
    draftEdgePreviewRef.current = null;

    if (!drawingRouteMode || draftRoutePoints.length === 0) return;

    if (draftRoutePoints.length >= 2) {
      const polyline = L.polyline(
        draftRoutePoints.map((pt) => [pt.latitude, pt.longitude] as [number, number]),
        {
          color: draftRouteColor,
          weight: 4,
          opacity: 0.85,
          dashArray: editingRouteId ? undefined : "6,8",
          interactive: false,
        },
      );
      layerGroup.addLayer(polyline);
      draftPolylineRef.current = polyline;
    }

    for (let i = 0; i < draftRoutePoints.length; i++) {
      const pt = draftRoutePoints[i];
      const isSelected = i === selectedDraftPointIndex;
      const icon = buildRouteHandleIcon(
        draftRouteColor,
        i + 1,
        draftRoutePoints.length,
        isSelected,
      );
      const handle = L.marker([pt.latitude, pt.longitude], {
        icon,
        draggable: true,
        zIndexOffset: 800,
        bubblingMouseEvents: false,
      });
      handle.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onDraftPointSelect(i);
      });
      handle.on("dragstart", () => {
        isDraggingHandleRef.current = true;
        // Remove any lingering "+" preview the instant the gesture starts.
        const layerGroup = draftLayerRef.current;
        if (layerGroup && draftEdgePreviewRef.current) {
          layerGroup.removeLayer(draftEdgePreviewRef.current);
          draftEdgePreviewRef.current = null;
        }
      });
      handle.on("drag", () => {
        const pos = handle.getLatLng();
        const poly = draftPolylineRef.current;
        if (!poly) return;
        const latlngs = poly.getLatLngs() as L.LatLng[];
        if (latlngs[i]) {
          latlngs[i] = pos;
          poly.setLatLngs(latlngs);
        }
      });
      handle.on("dragend", () => {
        isDraggingHandleRef.current = false;
        const pos = handle.getLatLng();
        onDraftPointDragEnd(i, pos.lat, pos.lng);
      });
      layerGroup.addLayer(handle);
      draftHandlesRef.current.push(handle);
    }
  }, [
    drawingRouteMode,
    draftRoutePoints.length,
    draftRouteColor,
    selectedDraftPointIndex,
    editingRouteId,
    onDraftPointSelect,
    onDraftPointDragEnd,
  ]);

  // Sync positions from props (skip the handle being dragged)
  useEffect(() => {
    const handles = draftHandlesRef.current;
    if (handles.length !== draftRoutePoints.length) return;
    for (let i = 0; i < draftRoutePoints.length; i++) {
      const pt = draftRoutePoints[i];
      const handle = handles[i];
      if (!handle) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dragging = (handle as any).dragging && (handle as any).dragging._draggable && (handle as any).dragging._draggable._moving;
      if (dragging) continue;
      const cur = handle.getLatLng();
      if (cur.lat !== pt.latitude || cur.lng !== pt.longitude) {
        handle.setLatLng([pt.latitude, pt.longitude]);
      }
    }
    const poly = draftPolylineRef.current;
    if (poly) {
      poly.setLatLngs(
        draftRoutePoints.map((pt) => [pt.latitude, pt.longitude] as [number, number]),
      );
    }
  }, [draftRoutePoints]);

  // Marker placement preview
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (previewMarkerRef.current) {
      map.removeLayer(previewMarkerRef.current);
      previewMarkerRef.current = null;
    }
    if (!previewPoint) return;
    const preview = L.marker([previewPoint.latitude, previewPoint.longitude], {
      icon: buildPreviewDivIcon(previewCategory),
      interactive: false,
      keyboard: false,
      zIndexOffset: 500,
    });
    preview.addTo(map);
    previewMarkerRef.current = preview;
  }, [previewPoint, previewCategory]);

  // Search-result preview pin (point 7)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (searchPreviewMarkerRef.current) {
      map.removeLayer(searchPreviewMarkerRef.current);
      searchPreviewMarkerRef.current = null;
    }
    if (!searchPreviewPoint) return;
    const pin = L.marker([searchPreviewPoint.latitude, searchPreviewPoint.longitude], {
      icon: buildSearchPreviewDivIcon(),
      interactive: false,
      keyboard: false,
      zIndexOffset: 700,
    });
    pin.addTo(map);
    searchPreviewMarkerRef.current = pin;
  }, [searchPreviewPoint]);

  // Fit bounds
  const bounds = useMemo(() => {
    const points: [number, number][] = [];
    for (const m of markers) points.push([m.latitude, m.longitude]);
    for (const r of routes) for (const pt of r.points) points.push([pt.latitude, pt.longitude]);
    return points;
  }, [markers, routes]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !fitToContent || bounds.length === 0) return;
    map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 15 });
  }, [bounds, fitToContent]);

  return <div ref={containerRef} className="maps-leaflet-container" />;
}
