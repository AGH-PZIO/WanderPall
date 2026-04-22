import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTravelBuddies } from "../hooks/useTravelBuddies";
import { createGroup } from "../api/travel-buddies-api";

export function GroupsPage() {
  const { groups, accessToken, refreshGroups, setCurrentGroup, loading, error } = useTravelBuddies();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  function handleGroupClick(group: { id: string }) {
    navigate(`/travel-buddies/groups/${group.id}`);
  }

  useEffect(() => {
    refreshGroups();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !newName.trim()) return;
    await createGroup(accessToken, {
      name: newName,
      description: newDesc || undefined,
    });
    setNewName("");
    setNewDesc("");
    setShowCreate(false);
    refreshGroups();
  }

  if (!accessToken) {
    return (
      <div className="tb-empty">
        Please sign in to view your groups.
      </div>
    );
  }

  if (loading) {
    return <div className="tb-loading">Loading groups...</div>;
  }

  if (error) {
    return <div className="tb-error">{error}</div>;
  }

  return (
    <div className="tb-groups-page">
      <div className="tb-header">
        <h1>My Groups</h1>
        <button type="button" onClick={() => setShowCreate(true)}>
          + New Group
        </button>
      </div>

      {showCreate && (
        <form className="tb-create-form" onSubmit={handleCreate}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Group name"
            minLength={2}
            maxLength={100}
            required
          />
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            maxLength={500}
          />
          <div className="tb-form-actions">
            <button type="submit">Create</button>
            <button type="button" onClick={() => setShowCreate(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {groups.length === 0 ? (
        <div className="tb-empty">No groups yet. Create one to get started!</div>
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
              <div className="tb-group-name">{group.name}</div>
              {group.description && (
                <div className="tb-group-desc">{group.description}</div>
              )}
              <div className="tb-group-meta">
                {group.member_count} member{group.member_count !== 1 ? "s" : ""}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}