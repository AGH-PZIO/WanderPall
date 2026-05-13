import { useNavigate } from "react-router";
import { useGuides } from "../hooks/guides/useGuides";
import { Guide } from "../types/Guide";
import "../ui/travel-assistance.css";

function BrowseGuides() {
  const { guides, loading, error } = useGuides("public");
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="ta-shell">
        <div className="ta-header">
          <div className="ta-header-left">
            <button type="button" className="btn-back" onClick={() => navigate("/travel-assistance")}>
              ← Back
            </button>
            <h2>Public travel guides</h2>
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
            <h2>Public travel guides</h2>
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
          <h2>Public travel guides</h2>
        </div>
      </div>

      <div className="ta-subnav">
        <button type="button" onClick={() => navigate("/travel-assistance/my-guides")}>
          My guides
        </button>
      </div>

      <div className="ta-stack">
        {guides.length === 0 ? (
          <div className="ta-empty-state" style={{ minHeight: 200 }}>
            <div className="ta-empty-icon">📖</div>
            <p>No public guides yet.</p>
          </div>
        ) : (
          guides.map((guide: Guide) => (
            <div
              key={guide.id}
              className="ta-stack-card"
              onClick={() => navigate(`/travel-assistance/read-guide/${guide.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(`/travel-assistance/read-guide/${guide.id}`);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="ta-stack-card__title">{guide.title}</div>
              <p className="ta-stack-card__preview">
                Updated {new Date(guide.updated_at || guide.created_at).toLocaleDateString()}
              </p>
              <div className="ta-stack-card__footer">
                <span className="ta-stack-card__meta">Open to read</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default BrowseGuides;
