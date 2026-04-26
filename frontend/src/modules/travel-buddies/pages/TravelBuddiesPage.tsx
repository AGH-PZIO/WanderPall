import { useEffect, useState } from "react";
import { DEV_USER_ID, useTravelBuddies } from "../hooks/useTravelBuddies";
import "../ui/travel-buddies.css";

export function TravelBuddiesPage({ onClose }: { onClose: () => void }) {
  const {
    groups,
    selectedGroup,
    loading,
    error,
    fetchGroups,
    createGroup,
    selectGroup,
    deleteGroup,
    addMember,
    removeMember,
  } = useTravelBuddies();

  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [newMemberId, setNewMemberId] = useState("");

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  async function handleCreateGroup() {
    const name = newGroupName.trim();
    if (!name) return;
    await createGroup(name, newGroupDesc.trim() || undefined);
    setNewGroupName("");
    setNewGroupDesc("");
  }

  async function handleAddMember() {
    if (!selectedGroup || !newMemberId.trim()) return;
    await addMember(selectedGroup.id, newMemberId.trim());
    setNewMemberId("");
  }

  const isOwner = selectedGroup?.owner_id === DEV_USER_ID;

  return (
    <div className="tb-shell">
      <div className="tb-topbar">
        <button onClick={onClose} className="btn-close">✕</button>
        <h2>Travel Buddies</h2>
      </div>

      <div className="tb-body">
        {/* LEFT: group list */}
        <div className="tb-list">
          <div className="tb-create-form">
            <input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group name"
              onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
            />
            <input
              value={newGroupDesc}
              onChange={(e) => setNewGroupDesc(e.target.value)}
              placeholder="Description (optional)"
              onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
            />
            <button onClick={handleCreateGroup}>Create group</button>
          </div>

          {loading && <p className="tb-loading">Loading...</p>}
          {error && <p className="tb-error">{error}</p>}

          {!loading && groups.length === 0 && (
            <p className="tb-empty-list">No groups yet. Create one above.</p>
          )}

          {groups.map((g) => (
            <div
              key={g.id}
              className={`tb-group-card ${selectedGroup?.id === g.id ? "active" : ""}`}
              onClick={() => selectGroup(g.id)}
            >
              <p>{g.name}</p>
              {g.description && <small>{g.description}</small>}
            </div>
          ))}
        </div>

        {/* RIGHT: group detail */}
        <div className="tb-details">
          {!selectedGroup ? (
            <div className="tb-empty-state">
              <div className="tb-empty-icon">👥</div>
              <p>Select a group to view members</p>
            </div>
          ) : (
            <>
              <div className="tb-detail-header">
                <h3>{selectedGroup.name}</h3>
                {isOwner && (
                  <button
                    onClick={() => deleteGroup(selectedGroup.id)}
                    className="btn-danger"
                  >
                    Delete group
                  </button>
                )}
              </div>

              {selectedGroup.description && (
                <p className="tb-detail-desc">{selectedGroup.description}</p>
              )}

              <div className="tb-members-header">
                <h4>Members ({selectedGroup.members.length})</h4>
              </div>

              {selectedGroup.members.map((m) => (
                <div key={m.id} className="tb-member-row">
                  <div className="tb-member-info">
                    <span className="tb-member-uuid">{m.user_id}</span>
                    <span className="tb-member-role">{m.role}</span>
                  </div>
                  {isOwner && m.role !== "owner" && (
                    <button
                      onClick={() => removeMember(selectedGroup.id, m.id)}
                      className="btn-icon-danger"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}

              {isOwner && (
                <div className="tb-add-member">
                  <input
                    value={newMemberId}
                    onChange={(e) => setNewMemberId(e.target.value)}
                    placeholder="User UUID to add"
                    onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
                  />
                  <button onClick={handleAddMember}>Add member</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
