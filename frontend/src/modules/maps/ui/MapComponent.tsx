import { useEffect, useCallback, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Marker as MarkerType, Route, MarkerGroup, MapSettings, Waypoint } from "../hooks/useMaps";

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface MapLayers {
  OpenStreetMap: string;
  OpenTopoMap: string;
  CartoDB: string;
}

export const MAP_LAYERS: MapLayers = {
  OpenStreetMap: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  OpenTopoMap: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
  CartoDB: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
};

export const MAP_LAYER_ATTRIBUTION: Record<keyof MapLayers, string> = {
  OpenStreetMap: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  OpenTopoMap:
    'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
  CartoDB:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
};

function createIcon(color?: string, visited?: boolean) {
  const fillColor = visited ? "#4caf50" : color || "#3388ff";
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="background-color: ${fillColor}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapCenterHandler({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    map.setView(center, zoom);
  }, [map, center[0], center[1], zoom]);
  return null;
}

interface MapComponentProps {
  markers: MarkerType[];
  routes: Route[];
  groups: MarkerGroup[];
  settings: MapSettings | null;
  onMarkerClick: (marker: MarkerType) => void;
  onMapClick: (lat: number, lng: number) => void;
  selectedMarkerId?: string;
  draftRoutePoints?: Waypoint[];
  draftRouteColor?: string;
}

export function MapComponent({
  markers,
  routes,
  groups,
  settings,
  onMarkerClick,
  onMapClick,
  selectedMarkerId,
  draftRoutePoints = [],
  draftRouteColor = "#ff0000",
}: MapComponentProps) {
  const getMarkerIcon = useCallback(
    (marker: MarkerType) => {
      const group = groups.find((g) => g.id === marker.group_id);
      return createIcon(group?.color, marker.is_visited);
    },
    [groups],
  );

  const mapCenter: [number, number] = useMemo(
    () => [settings?.center_latitude ?? 52.2297, settings?.center_longitude ?? 21.0122],
    [settings?.center_latitude, settings?.center_longitude],
  );

  const mapZoom = settings?.zoom_level ?? 6;

  const layerKey = (settings?.map_layer as keyof MapLayers) || "OpenStreetMap";
  const tileUrl = MAP_LAYERS[layerKey] || MAP_LAYERS.OpenStreetMap;
  const attribution = MAP_LAYER_ATTRIBUTION[layerKey] || MAP_LAYER_ATTRIBUTION.OpenStreetMap;

  const draftPositions: [number, number][] = draftRoutePoints.map(
    (wp) => [wp.latitude, wp.longitude] as [number, number],
  );

  return (
    <MapContainer
      center={mapCenter}
      zoom={mapZoom}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        key={layerKey}
        attribution={attribution}
        url={tileUrl}
      />

      <MapCenterHandler center={mapCenter} zoom={mapZoom} />
      <MapClickHandler onMapClick={onMapClick} />

      {routes.map((route) => {
        const positions: [number, number][] = (route.waypoints ?? []).map(
          (wp) => [wp.latitude, wp.longitude] as [number, number],
        );
        if (positions.length < 2) return null;
        return (
          <Polyline
            key={route.id}
            positions={positions}
            pathOptions={{ color: route.color, weight: 3, opacity: 0.7 }}
          >
            <Popup>
              <strong>{route.name}</strong>
              {route.description && <p>{route.description}</p>}
            </Popup>
          </Polyline>
        );
      })}

      {draftPositions.length >= 2 && (
        <Polyline
          positions={draftPositions}
          pathOptions={{ color: draftRouteColor, weight: 3, opacity: 0.6, dashArray: "6 8" }}
        />
      )}

      {draftPositions.map((position, index) => (
        <CircleMarker
          key={`draft-${index}`}
          center={position}
          radius={5}
          pathOptions={{ color: draftRouteColor, fillColor: draftRouteColor, fillOpacity: 0.9 }}
        />
      ))}

      {markers.map((marker) => (
        <Marker
          key={marker.id}
          position={[marker.latitude, marker.longitude]}
          icon={getMarkerIcon(marker)}
          eventHandlers={{
            click: () => onMarkerClick(marker),
          }}
        >
          <Popup>
            <strong>{marker.name}</strong>
            {marker.description && <p>{marker.description}</p>}
            <p>{marker.is_visited ? "✓ Odwiedzone" : "Nieodwiedzone"}</p>
            {selectedMarkerId === marker.id && <p style={{ fontSize: "0.75rem", opacity: 0.7 }}>Wybrany</p>}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
