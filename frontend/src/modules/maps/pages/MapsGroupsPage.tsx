import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../account/hooks/useAuth";
import { listGroups, type GroupResponse } from "../../travel-buddies/api/travel-buddies-api";

export function MapsGroupsPage() {
  const navigate = useNavigate();
  const { accessToken, loading: authLoading } = useAuth();
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !accessToken) return;
    setLoading(true);
    listGroups(accessToken, { limit: 100 })
      .then((data) => setGroups(data.items))
      .catch((err) => setError(err instanceof Error ? err.message : "Błąd pobierania grup"))
      .finally(() => setLoading(false));
  }, [accessToken, authLoading]);

  if (authLoading) {
    return <div className="maps-loading">Ładowanie...</div>;
  }

  if (!accessToken) {
    return (
      <div className="maps-empty">
        <div className="maps-empty-icon">🔐</div>
        <p>Zaloguj się, aby zobaczyć mapy swoich grup.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="maps-loading">Ładowanie grup...</div>;
  }

  if (error) {
    return <div className="maps-error">{error}</div>;
  }

  return (
    <div className="maps-groups-page">
      <header className="maps-header">
        <h2>Mapy podróży</h2>
        <p className="maps-subtitle">
          Wybierz grupę "Travel Buddies", aby otworzyć jej mapę wspólnej podróży.
        </p>
      </header>

      {groups.length === 0 ? (
        <div className="maps-empty">
          <div className="maps-empty-icon">🗺️</div>
          <p>Nie należysz jeszcze do żadnej grupy.</p>
          <button
            type="button"
            className="maps-btn-primary"
            onClick={() => navigate("/travel-buddies")}
          >
            Przejdź do Travel Buddies
          </button>
        </div>
      ) : (
        <ul className="maps-group-list">
          {groups.map((g) => (
            <li
              key={g.id}
              className="maps-group-card"
              onClick={() => navigate(`/maps/groups/${g.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) =>
                (e.key === "Enter" || e.key === " ") && navigate(`/maps/groups/${g.id}`)
              }
            >
              <div className="maps-group-card-icon">🗺️</div>
              <div className="maps-group-card-body">
                <div className="maps-group-card-name">{g.name}</div>
                {g.description && (
                  <div className="maps-group-card-desc">{g.description}</div>
                )}
                <div className="maps-group-card-meta">
                  {g.member_count}{" "}
                  {g.member_count === 1 ? "członek" : "członków"}
                </div>
              </div>
              <span className="maps-group-card-chevron">›</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
