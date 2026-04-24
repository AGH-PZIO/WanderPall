import { useEffect, useState, useCallback } from "react";
import {
  useMaps,
  type Marker,
  type Waypoint,
  type MarkerComment,
} from "../hooks/useMaps";
import { MapComponent, MAP_LAYERS } from "./MapComponent";
import "./maps.css";

type TabType = "markers" | "routes" | "groups" | "settings";

interface NewMarkerForm {
  name: string;
  description: string;
  latitude: string;
  longitude: string;
  group_id: string;
  is_visited: boolean;
}

interface NewRouteForm {
  name: string;
  description: string;
  color: string;
  waypoints: Waypoint[];
}

interface NewGroupForm {
  name: string;
  color: string;
}

export function MapsPage({ onClose }: { onClose?: () => void }) {
  const {
    markers,
    routes,
    markerGroups,
    settings,
    error,
    loadMarkers,
    createMarker,
    deleteMarker,
    markAsVisited,
    loadRoutes,
    createRoute,
    deleteRoute,
    loadMarkerGroups,
    createMarkerGroup,
    deleteMarkerGroup,
    loadComments,
    createComment,
    loadSettings,
    updateSettings,
  } = useMaps();

  const [activeTab, setActiveTab] = useState<TabType>("markers");
  const [selectedMarker, setSelectedMarker] = useState<Marker | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [newMarkerForm, setNewMarkerForm] = useState<NewMarkerForm>({
    name: "",
    description: "",
    latitude: "",
    longitude: "",
    group_id: "",
    is_visited: false,
  });
  const [newRouteForm, setNewRouteForm] = useState<NewRouteForm>({
    name: "",
    description: "",
    color: "#ff0000",
    waypoints: [],
  });
  const [newGroupForm, setNewGroupForm] = useState<NewGroupForm>({
    name: "",
    color: "#3388ff",
  });
  const [newComment, setNewComment] = useState("");
  const [markerComments, setMarkerComments] = useState<MarkerComment[]>([]);
  const [newRouteMode, setNewRouteMode] = useState(false);
  const [routePoints, setRoutePoints] = useState<Waypoint[]>([]);

  useEffect(() => {
    loadMarkers();
    loadRoutes();
    loadMarkerGroups();
    loadSettings();
  }, []);

  const handleMapClick = useCallback(
    async (lat: number, lng: number) => {
      if (newMarkerForm.name) {
        await createMarker({
          name: newMarkerForm.name,
          description: newMarkerForm.description || undefined,
          latitude: lat,
          longitude: lng,
          group_id: newMarkerForm.group_id || undefined,
          is_visited: newMarkerForm.is_visited,
        });
        setNewMarkerForm({
          name: "",
          description: "",
          latitude: "",
          longitude: "",
          group_id: "",
          is_visited: false,
        });
      } else if (newRouteMode) {
        setRoutePoints((prev) => [
          ...prev,
          { latitude: lat, longitude: lng, order: prev.length },
        ]);
      }
    },
    [newMarkerForm, createMarker, newRouteMode],
  );

  const handleMarkerClick = useCallback(
    async (marker: Marker) => {
      setSelectedMarker(marker);
      const comments = await loadComments(marker.id);
      setMarkerComments(comments);
    },
    [loadComments],
  );

  const handleDeleteMarker = async (markerId: string) => {
    await deleteMarker(markerId);
    if (selectedMarker?.id === markerId) {
      setSelectedMarker(null);
    }
  };

  const handleMarkVisited = async (markerId: string) => {
    await markAsVisited(markerId);
    if (selectedMarker?.id === markerId) {
      const updated = markers.find((m) => m.id === markerId);
      if (updated) setSelectedMarker(updated);
    }
  };

  const handleCreateRoute = async () => {
    await createRoute({
      name: newRouteForm.name,
      description: newRouteForm.description || undefined,
      color: newRouteForm.color,
      waypoints: routePoints,
    });
    setNewRouteForm({
      name: "",
      description: "",
      color: "#ff0000",
      waypoints: [],
    });
    setRoutePoints([]);
    setNewRouteMode(false);
  };

  const handleDeleteRoute = async (routeId: string) => {
    await deleteRoute(routeId);
  };

  const handleCreateGroup = async () => {
    await createMarkerGroup({
      name: newGroupForm.name,
      color: newGroupForm.color,
    });
    setNewGroupForm({ name: "", color: "#3388ff" });
  };

  const handleDeleteGroup = async (groupId: string) => {
    await deleteMarkerGroup(groupId);
  };

  const handleAddComment = async () => {
    if (!selectedMarker || !newComment) return;
    await createComment(selectedMarker.id, newComment);
    setNewComment("");
    const comments = await loadComments(selectedMarker.id);
    setMarkerComments(comments);
  };

  const handleLayerChange = async (layer: string) => {
    await updateSettings({ map_layer: layer });
  };

  const filteredMarkers = selectedGroup
    ? markers.filter((m) => m.group_id === selectedGroup)
    : markers;

  return (
    <div className="maps-container">
      <div className="maps-header">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {onClose && (
            <button onClick={onClose} className="btn-close" aria-label="Close">
              ✕
            </button>
          )}
          <h1 className="maps-title">Mapa podróży</h1>
        </div>
        <div className="maps-controls">
          <select
            className="maps-layer-select"
            value={settings?.map_layer || "OpenStreetMap"}
            onChange={(e) => handleLayerChange(e.target.value)}
          >
            {Object.keys(MAP_LAYERS).map((layer) => (
              <option key={layer} value={layer}>
                {layer}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="maps-content">
        <div className="maps-sidebar">
          <div className="maps-sidebar-section">
            <div className="maps-sidebar-title">Nawigacja</div>
            <div
              style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}
            >
              <button
                className={activeTab === "markers" ? "primary" : "secondary"}
                onClick={() => setActiveTab("markers")}
              >
                Znaczniki
              </button>
              <button
                className={activeTab === "routes" ? "primary" : "secondary"}
                onClick={() => setActiveTab("routes")}
              >
                Trasy
              </button>
              <button
                className={activeTab === "groups" ? "primary" : "secondary"}
                onClick={() => setActiveTab("groups")}
              >
                Grupy
              </button>
            </div>
          </div>

          {activeTab === "markers" && (
            <div className="maps-sidebar-section">
              <div className="maps-sidebar-title">Znaczniki</div>
              <div className="maps-form">
                <div className="maps-form-group">
                  <label>Nazwa znacznika</label>
                  <input
                    type="text"
                    value={newMarkerForm.name}
                    onChange={(e) =>
                      setNewMarkerForm({
                        ...newMarkerForm,
                        name: e.target.value,
                      })
                    }
                    placeholder="Kliknij na mapie..."
                  />
                </div>
                <div className="maps-form-group">
                  <label>Opis</label>
                  <textarea
                    value={newMarkerForm.description}
                    onChange={(e) =>
                      setNewMarkerForm({
                        ...newMarkerForm,
                        description: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="maps-form-group">
                  <label>Grupa</label>
                  <select
                    value={newMarkerForm.group_id}
                    onChange={(e) =>
                      setNewMarkerForm({
                        ...newMarkerForm,
                        group_id: e.target.value,
                      })
                    }
                  >
                    <option value="">Brak grupy</option>
                    {markerGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="maps-form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={newMarkerForm.is_visited}
                      onChange={(e) =>
                        setNewMarkerForm({
                          ...newMarkerForm,
                          is_visited: e.target.checked,
                        })
                      }
                    />{" "}
                    Odwiedzone
                  </label>
                </div>
              </div>

              <div className="maps-sidebar-title" style={{ marginTop: "1rem" }}>
                Grupy
              </div>
              <select
                value={selectedGroup || ""}
                onChange={(e) => setSelectedGroup(e.target.value || null)}
                style={{ width: "100%", padding: "0.5rem" }}
              >
                <option value="">Wszystkie</option>
                {markerGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>

              <ul className="maps-list" style={{ marginTop: "1rem" }}>
                {filteredMarkers.map((marker) => (
                  <li
                    key={marker.id}
                    className={`maps-list-item ${
                      selectedMarker?.id === marker.id ? "active" : ""
                    }`}
                    onClick={() => handleMarkerClick(marker)}
                  >
                    <div className="maps-list-item-name">
                      {marker.is_visited ? "✓ " : ""}
                      {marker.name}
                    </div>
                    <div className="maps-list-item-meta">
                      {marker.latitude.toFixed(4)},{" "}
                      {marker.longitude.toFixed(4)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activeTab === "routes" && (
            <div className="maps-sidebar-section">
              <div className="maps-sidebar-title">Trasy</div>
              <div className="maps-form">
                <button
                  className={newRouteMode ? "danger" : "secondary"}
                  onClick={() => {
                    setNewRouteMode(!newRouteMode);
                    setRoutePoints([]);
                  }}
                >
                  {newRouteMode ? "Anuluj" : "Rysuj trasę"}
                </button>
                {newRouteMode && (
                  <>
                    <div className="maps-form-group">
                      <label>Nazwa trasy</label>
                      <input
                        type="text"
                        value={newRouteForm.name}
                        onChange={(e) =>
                          setNewRouteForm({
                            ...newRouteForm,
                            name: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="maps-form-group">
                      <label>Kolor</label>
                      <input
                        type="color"
                        value={newRouteForm.color}
                        onChange={(e) =>
                          setNewRouteForm({
                            ...newRouteForm,
                            color: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="maps-form-group">
                      <label>Opis</label>
                      <textarea
                        value={newRouteForm.description}
                        onChange={(e) =>
                          setNewRouteForm({
                            ...newRouteForm,
                            description: e.target.value,
                          })
                        }
                      />
                    </div>
                    <button
                      className="primary"
                      onClick={handleCreateRoute}
                      disabled={!newRouteForm.name || routePoints.length < 2}
                    >
                      Zapisz trasę
                    </button>
                    <p style={{ fontSize: "0.75rem", color: "#666" }}>
                      Punkty: {routePoints.length}
                    </p>
                  </>
                )}
              </div>

              <ul className="maps-list" style={{ marginTop: "1rem" }}>
                {routes.map((route) => (
                  <li key={route.id} className="maps-list-item">
                    <div className="maps-list-item-name">{route.name}</div>
                    <div className="maps-list-item-meta">
                      {(route.waypoints ?? []).length} punktów
                    </div>
                    <button
                      className="danger"
                      style={{
                        marginTop: "0.25rem",
                        padding: "0.25rem 0.5rem",
                      }}
                      onClick={() => handleDeleteRoute(route.id)}
                    >
                      Usuń
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activeTab === "groups" && (
            <div className="maps-sidebar-section">
              <div className="maps-sidebar-title">Grupy znaczników</div>
              <div className="maps-form">
                <div className="maps-form-group">
                  <label>Nazwa grupy</label>
                  <input
                    type="text"
                    value={newGroupForm.name}
                    onChange={(e) =>
                      setNewGroupForm({ ...newGroupForm, name: e.target.value })
                    }
                  />
                </div>
                <div className="maps-form-group">
                  <label>Kolor</label>
                  <input
                    type="color"
                    value={newGroupForm.color}
                    onChange={(e) =>
                      setNewGroupForm({
                        ...newGroupForm,
                        color: e.target.value,
                      })
                    }
                  />
                </div>
                <button
                  className="primary"
                  onClick={handleCreateGroup}
                  disabled={!newGroupForm.name}
                >
                  Dodaj grupę
                </button>
              </div>

              <ul className="maps-list" style={{ marginTop: "1rem" }}>
                {markerGroups.map((group) => (
                  <li key={group.id} className="maps-list-item">
                    <div className="maps-list-item-name">
                      <span
                        style={{
                          display: "inline-block",
                          width: "12px",
                          height: "12px",
                          backgroundColor: group.color,
                          borderRadius: "50%",
                          marginRight: "0.5rem",
                        }}
                      />
                      {group.name}
                    </div>
                    <button
                      className="danger"
                      style={{
                        marginTop: "0.25rem",
                        padding: "0.25rem 0.5rem",
                      }}
                      onClick={() => handleDeleteGroup(group.id)}
                    >
                      Usuń
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selectedMarker && (
            <div
              className="maps-sidebar-section"
              style={{
                marginTop: "1rem",
                borderTop: "1px solid #e0e0e0",
                paddingTop: "1rem",
              }}
            >
              <div className="maps-sidebar-title">{selectedMarker.name}</div>
              <p>{selectedMarker.description || "Brak opisu"}</p>
              <button
                className={selectedMarker.is_visited ? "secondary" : "primary"}
                onClick={() => handleMarkVisited(selectedMarker.id)}
              >
                {selectedMarker.is_visited
                  ? "Odwiedzone"
                  : "Oznacz jako odwiedzone"}
              </button>
              <button
                className="danger"
                style={{ marginLeft: "0.5rem" }}
                onClick={() => handleDeleteMarker(selectedMarker.id)}
              >
                Usuń
              </button>

              <div className="maps-sidebar-title" style={{ marginTop: "1rem" }}>
                Komentarze
              </div>
              <div className="maps-form">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Dodaj komentarz..."
                />
                <button
                  className="primary"
                  onClick={handleAddComment}
                  disabled={!newComment}
                >
                  Dodaj
                </button>
              </div>

              {markerComments.map((comment) => (
                <div key={comment.id} className="maps-comment">
                  <div className="maps-comment-content">{comment.content}</div>
                  <div className="maps-comment-meta">
                    {new Date(comment.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="map-wrapper">
          <MapComponent
            markers={filteredMarkers}
            routes={routes}
            groups={markerGroups}
            settings={settings}
            onMarkerClick={handleMarkerClick}
            onMapClick={handleMapClick}
            selectedMarkerId={selectedMarker?.id}
            draftRoutePoints={newRouteMode ? routePoints : []}
            draftRouteColor={newRouteForm.color}
          />
        </div>
      </div>
    </div>
  );
}
