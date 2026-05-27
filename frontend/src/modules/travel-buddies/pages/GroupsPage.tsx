import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTravelBuddies } from "../hooks/useTravelBuddies";
import { createGroup } from "../api/travel-buddies-api";

export function GroupsPage() {
  const { groups, refreshGroups, loading, error, accessToken } = useTravelBuddies();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  function handleGroupClick(group: { id: string }) {
    navigate(`/travel-buddies/groups/${group.id}`);
  }

  useEffect(() => {
    refreshGroups();
  }, [refreshGroups]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !newName.trim()) return;
    setCreating(true);
    try {
      await createGroup(accessToken, {
        name: newName.trim(),
        description: newDesc.trim() || undefined,
      });
      setNewName("");
      setNewDesc("");
      setShowCreate(false);
      refreshGroups();
    } finally {
      setCreating(false);
    }
  }

  if (!accessToken) {
    return (
      <div className="tb-empty">
        <div className="tb-empty-icon">🔐</div>
        Zaloguj się, aby zobaczyć swoje grupy.
      </div>
    );
  }

  if (loading) {
    return <div className="tb-loading">Ładowanie grup...</div>;
  }

  if (error) {
    return <div className="tb-error">{error}</div>;
  }

  return (
    <div className="tb-groups-page">
      <div className="tb-header">
        <h1>Moje grupy</h1>
        <button type="button" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? "Anuluj" : "+ Nowa grupa"}
        </button>
      </div>

      {showCreate && (
        <form className="tb-create-form" onSubmit={handleCreate}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nazwa grupy"
            minLength={2}
            maxLength={100}
            required
            autoFocus
          />
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Opis (opcjonalnie)"
            maxLength={500}
          />
          <div className="tb-form-actions">
            <button type="submit" disabled={creating}>
              {creating ? "Tworzenie..." : "Utwórz"}
            </button>
            <button type="button" onClick={() => setShowCreate(false)}>
              Anuluj
            </button>
          </div>
        </form>
      )}

      {groups.length === 0 ? (
        <div className="tb-empty">
          <div className="tb-empty-icon">✈️</div>
          Brak grup – utwórz pierwszą i zaproś znajomych!
        </div>
      ) : (
        <ul className="tb-group-list">
          {groups.map((group) => (
            <li
              key={group.id}
              className="tb-group-item"
              onClick={() => handleGroupClick(group)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleGroupClick(group)}
            >
              <div className="tb-group-item-body">
                <div className="tb-group-name">{group.name}</div>
                {group.description && (
                  <div className="tb-group-desc">{group.description}</div>
                )}
                <div className="tb-group-meta">
                  <span>
                    {group.member_count}{" "}
                    {group.member_count === 1 ? "członek" : "członków"}
                  </span>
                  {group.created_at && (
                    <span>
                      {new Date(group.created_at).toLocaleDateString("pl-PL")}
                    </span>
                  )}
                </div>
              </div>
              <span className="tb-group-chevron">›</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
