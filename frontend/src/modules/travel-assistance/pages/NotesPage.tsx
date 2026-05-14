import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Note } from "../types/Note";
import { useNotes } from "../hooks/notes/useNotes";
import { useDeleteNote } from "../hooks/notes/useDeleteNote";
import { tokenStore } from "../../account/auth-runtime";
import { AuthRequiredGate } from "../ui/AuthRequiredGate";
import "../ui/travel-assistance.css";

function NotesPage() {
  const navigate = useNavigate();
  const { notes, loading, refetch } = useNotes();
  const { remove } = useDeleteNote(refetch);
  const tokens = tokenStore.get();
  const accessToken = tokens?.accessToken;

  const sorted = useMemo(
    () =>
      [...notes].sort(
        (a: Note, b: Note) =>
          new Date(b.updated_at ?? b.created_at).getTime() -
          new Date(a.updated_at ?? a.created_at).getTime()
      ),
    [notes]
  );

  if (!accessToken) return <AuthRequiredGate feature="Notes" />;
  if (loading) {
    return (
      <div className="ta-shell">
        <div className="ta-header">
          <div className="ta-header-left">
            <button type="button" className="btn-back" onClick={() => navigate("/travel-assistance")}>
              ← Back
            </button>
            <h2>My notes</h2>
          </div>
        </div>
        <p className="ta-loading">Loading…</p>
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
          <h2>My notes</h2>
        </div>
        <div className="ta-actions">
          <button type="button" className="btn-primary" onClick={() => navigate("/travel-assistance/note/new")}>
            + New note
          </button>
        </div>
      </div>

      <div className="ta-stack">
        {sorted.length === 0 ? (
          <div className="ta-empty-state" style={{ minHeight: 200 }}>
            <div className="ta-empty-icon">🗒️</div>
            <p>No notes yet. Create your first note.</p>
            <button type="button" className="btn-primary" onClick={() => navigate("/travel-assistance/note/new")}>
              New note
            </button>
          </div>
        ) : (
          sorted.map((n: Note) => (
            <div
              key={n.id}
              className="ta-stack-card"
              onClick={() => navigate(`/travel-assistance/note/${n.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(`/travel-assistance/note/${n.id}`);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="ta-stack-card__title">{n.title}</div>
              <p className="ta-stack-card__preview">{n.content.length ? `${n.content.slice(0, 140)}…` : "Empty note"}</p>
              <div className="ta-stack-card__footer">
                <span className="ta-stack-card__meta">{new Date(n.updated_at ?? n.created_at).toLocaleString()}</span>
                <div className="ta-stack-card__actions">
                  <button
                    type="button"
                    className="ta-btn-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(n.id);
                    }}
                  >
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

export default NotesPage;
