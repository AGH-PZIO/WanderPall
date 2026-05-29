import { useParams, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { useNotes } from "../hooks/notes/useNotes";
import { Note } from "../types/Note";
import { useCreateNote } from "../hooks/notes/useCreateNote";
import { useDeleteNote } from "../hooks/notes/useDeleteNote";
import { useUpdateNote } from "../hooks/notes/useUpdateNote";
import { useAuth } from "../../account/hooks/useAuth";
import type { User } from "../../account/api/account-api";
import { tokenStore } from "../../account/auth-runtime";
import { AuthRequiredGate } from "../ui/AuthRequiredGate";
import "../ui/travel-assistance.css";

type NoteViewerProps = {
  note: Note | null;
  noteId: string | undefined;
  isNew: boolean;
  user: User | null;
  notes: Note[];
  navigate: ReturnType<typeof useNavigate>;
  create: ReturnType<typeof useCreateNote>["create"];
  update: ReturnType<typeof useUpdateNote>["update"];
  remove: ReturnType<typeof useDeleteNote>["remove"];
};

function NoteViewer({
  note,
  noteId,
  isNew,
  notes,
  navigate,
  remove
}: NoteViewerProps) {
  const title = note?.title ?? "";
  const content = note?.content ?? "";

  function renderNotes() {
    return [...notes]
      .sort(
        (a: Note, b: Note) =>
          new Date(b.updated_at ?? b.created_at).getTime() -
          new Date(a.updated_at ?? a.created_at).getTime()
      )
      .map((n: Note) => (
        <div
          key={n.id}
          className="ta-note-list-item"
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
          <h3>{n.title}</h3>
          <p>{new Date(n.updated_at ?? n.created_at).toLocaleString()}</p>
        </div>
      ));
  }

  return (
    <div className="ta-shell">
      <div className="ta-header">
        <div className="ta-header-left">
          <button type="button" className="btn-back" onClick={() => navigate("/travel-assistance/notes")}>
            ← Back
          </button>
          <h2>Browse note</h2>
        </div>
        <div className="ta-actions">
          <button type="button" onClick={() => navigate(`/travel-assistance/edit-note/${noteId}`)} className="btn-primary">
            Edit
          </button>
          {!isNew && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                remove(noteId ?? "");
                navigate("/travel-assistance/notes");
              }}
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="ta-note-container">
        <div className="ta-note-editor">
          <h2>{title}</h2>
          <p style={{ whiteSpace: 'pre-line' }}>{content}</p>
        </div>

        <div className="ta-notes-list">{renderNotes()}</div>
      </div>
    </div>
  );
}

function NotePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { notes, loading, refetch } = useNotes();
  const navigate = useNavigate();
  const { create } = useCreateNote(refetch);
  const { remove } = useDeleteNote(refetch);
  const { update } = useUpdateNote(refetch);
  const isNew = id === "new";
  const tokens = tokenStore.get();
  const accessToken = tokens?.accessToken;

  const currentNote = useMemo(() => {
    if (isNew) return null;
    return notes.find((n: Note) => n.id === id) ?? null;
  }, [notes, id, isNew]);

  if (!accessToken) return <AuthRequiredGate feature="Notes" />;
  if (loading) {
    return (
      <div className="ta-shell">
        <div className="ta-header">
          <div className="ta-header-left">
            <button type="button" className="btn-back" onClick={() => navigate("/travel-assistance/notes")}>
              ← Back
            </button>
            <h2>{isNew ? "New note" : "Edit note"}</h2>
          </div>
        </div>
        <p className="ta-loading">Loading…</p>
      </div>
    );
  }

  return (
    <NoteViewer
      key={isNew ? "new" : (id ?? "")}
      note={currentNote}
      noteId={id}
      isNew={isNew}
      user={user}
      notes={notes}
      navigate={navigate}
      create={create}
      update={update}
      remove={remove}
    />
  );
}

export default NotePage;