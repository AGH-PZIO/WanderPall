import { useMemo } from "react";
import { useGuides } from "../hooks/guides/useGuides";
import { useGuideAction } from "../hooks/guides/useGuideAction";
import { useNavigate } from "react-router";
import { tokenStore } from "../../account/auth-runtime";
import { AuthRequiredGate } from "../ui/AuthRequiredGate";
import { Guide } from "../types/Guide";
import "../ui/travel-assistance.css";

export default function MyGuides() {
  const navigate = useNavigate();
  const { guides, loading, error, refetch } = useGuides("all");
  const { deleteGuide, togglePublish } = useGuideAction();
  const tokens = tokenStore.get();
  const accessToken = tokens?.accessToken;

  const sorted = useMemo(
    () =>
      [...guides].sort(
        (a: Guide, b: Guide) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [guides]
  );

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this guide?")) return;
    try {
      await deleteGuide(id);
      await refetch();
    } catch (err: unknown) {
      if (err instanceof Error) alert(`Error when deleting the guide: ${err.message}`);
      else alert("Error when deleting the guide");
    }
  };

  const handleTogglePublish = async (id: string, isPub: boolean) => {
    try {
      await togglePublish(id, isPub);
      await refetch();
    } catch (err: unknown) {
      if (err instanceof Error) alert(`Error when toggling publicity: ${err.message}`);
      else alert("Error when toggling publicity");
    }
  };

  if (!accessToken) return <AuthRequiredGate feature="My guides" />;
  if (loading) {
    return (
      <div className="ta-shell">
        <div className="ta-header">
          <div className="ta-header-left">
            <button type="button" className="btn-back" onClick={() => navigate("/travel-assistance")}>
              ← Back
            </button>
            <h2>My guides</h2>
          </div>
        </div>
        <p className="ta-loading">Loading…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="ta-shell">
        <div className="ta-header">
          <div className="ta-header-left">
            <button type="button" className="btn-back" onClick={() => navigate("/travel-assistance")}>
              ← Back
            </button>
            <h2>My guides</h2>
          </div>
        </div>
        <div className="ta-error" style={{ margin: 20 }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="ta-shell">
      <div className="ta-header">
        <div className="ta-header-left">
          <button type="button" className="btn-back" onClick={() => navigate("/travel-assistance")}>
            ← Back
          </button>
          <h2>My guides</h2>
        </div>
        <div className="ta-actions">
          <button type="button" className="btn-primary" onClick={() => navigate("/travel-assistance/guide/new")}>
            + New guide
          </button>
        </div>
      </div>

      <div className="ta-subnav">
        <button type="button" onClick={() => navigate("/travel-assistance/browse-guides")}>
          Browse public guides
        </button>
      </div>

      <div className="ta-stack">
        {sorted.length === 0 ? (
          <div className="ta-empty-state" style={{ minHeight: 200 }}>
            <div className="ta-empty-icon">📖</div>
            <p>You have no guides yet.</p>
            <button type="button" className="btn-primary" onClick={() => navigate("/travel-assistance/guide/new")}>
              Create guide
            </button>
          </div>
        ) : (
          sorted.map((g: Guide) => (
            <div key={g.id} className="ta-stack-card" style={{ cursor: "default" }}>
              <div className="ta-stack-card__title">{g.title}</div>
              <p className="ta-stack-card__preview">
                {g.published ? "Published" : "Draft"} · {new Date(g.created_at).toLocaleString()}
              </p>
              <div className="ta-stack-card__actions" style={{ marginTop: 12 }}>
                <button type="button" onClick={() => navigate(`/travel-assistance/read-guide/${g.id}`)}>
                  Read
                </button>
                <button type="button" onClick={() => navigate(`/travel-assistance/guide/${g.id}`)}>
                  Edit
                </button>
                <button type="button" onClick={() => handleTogglePublish(g.id, g.published)}>
                  {g.published ? "Unpublish" : "Publish"}
                </button>
                <button type="button" className="ta-btn-danger" onClick={() => handleDelete(g.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
