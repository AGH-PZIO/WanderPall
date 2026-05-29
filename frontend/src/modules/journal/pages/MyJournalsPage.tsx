import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../../account/hooks/useAuth";
import { deleteJournal, listMyJournals } from "../api/journal-api";

export function MyJournalsPage() {
  const { user, accessToken } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<{ id: string; title: string; visibility: string; updated_at: string }[]>([]);

  const canLoad = useMemo(() => Boolean(user && accessToken), [user, accessToken]);

  async function load() {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listMyJournals(accessToken, 50, 0);
      setItems(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load journals");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canLoad) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canLoad]);

  async function handleDelete(journalId: string) {
    if (!accessToken) return;
    if (!window.confirm("Delete this journal? This will delete its entries and images.")) return;
    try {
      await deleteJournal(accessToken, journalId);
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Delete failed");
    }
  }

  if (!user) {
    return (
      <div className="jr-shell">
        <p className="jr-muted">Please sign in to view your journals.</p>
        <div className="jr-actions" style={{ justifyContent: "flex-start" }}>
          <Link className="jr-btn" to="/account/login">Go to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="jr-shell">
      <div className="jr-header">
        <div>
          <h2 style={{ margin: 0 }}>My journals</h2>
          <p className="jr-muted" style={{ margin: "6px 0 0" }}>
            Create, edit and delete journals.
          </p>
        </div>
        <div className="jr-actions">
          <button className="jr-btn-secondary jr-btn" type="button" onClick={() => navigate("/journal")}>
            Back
          </button>
          <button className="jr-btn" type="button" onClick={() => navigate("/journal/my/new")}>
            Create journal
          </button>
        </div>
      </div>

      {error && <div className="jr-card" style={{ borderColor: "#ffcdd2" }}><p>{error}</p></div>}

      <div className="jr-list">
        {loading ? (
          <div className="jr-card"><p className="jr-muted">Loading...</p></div>
        ) : items.length === 0 ? (
          <div className="jr-card">
            <p className="jr-muted">No journals yet.</p>
            <div className="jr-actions" style={{ justifyContent: "flex-start" }}>
              <button className="jr-btn" type="button" onClick={() => navigate("/journal/my/new")}>
                Create your first journal
              </button>
            </div>
          </div>
        ) : (
          items.map((j) => (
            <div className="jr-card" key={j.id}>
              <div className="jr-row">
                <div>
                  <h3>{j.title}</h3>
                  <div className="jr-muted">Visibility: {j.visibility} · Updated: {new Date(j.updated_at).toLocaleString()}</div>
                </div>
                <div className="jr-actions">
                  <button className="jr-btn-secondary jr-btn" type="button" onClick={() => navigate(`/journal/my/${j.id}`)}>
                    Edit
                  </button>
                  <button className="jr-btn-danger jr-btn" type="button" onClick={() => void handleDelete(j.id)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
