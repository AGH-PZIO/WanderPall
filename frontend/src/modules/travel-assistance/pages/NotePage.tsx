import { useParams, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
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

type NoteEditorProps = {
  defaultTitle: string;
  defaultContent: string;
  noteId: string | undefined;
  isNew: boolean;
  user: User | null;
  notes: Note[];
  navigate: ReturnType<typeof useNavigate>;
  create: ReturnType<typeof useCreateNote>["create"];
  update: ReturnType<typeof useUpdateNote>["update"];
  remove: ReturnType<typeof useDeleteNote>["remove"];
};

function NoteEditor({
  defaultTitle,
  defaultContent,
  noteId,
  isNew,
  user,
  notes,
  navigate,
  create,
  update,
  remove
}: NoteEditorProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [content, setContent] = useState(defaultContent);

  function handleSave() {
    if (!user) {
      alert("You have to be logged in!");
      return;
    }

    const noteData = {
      title,
      content,
      user_id: user.id
    };

    if (isNew) {
      create(noteData);
    } else {
      update(noteId ? noteId : "", noteData);
    }

    navigate("/travel-assistance/notes");
  }

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
          <h2>{isNew ? "New note" : "Edit note"}</h2>
        </div>
        <div className="ta-actions">
          <button type="button" onClick={handleSave} className="btn-primary">
            {isNew ? "Create" : "Save"}
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
          <label className="ta-field-label" htmlFor="note-title">
            Title
          </label>
          <input
            id="note-title"
            type="text"
            className="ta-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title"
          />

          <label className="ta-field-label" htmlFor="note-content">
            Content
          </label>
          <textarea
            id="note-content"
            className="ta-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={14}
            placeholder="Write your note…"
          />
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
    <NoteEditor
      key={isNew ? "new" : (id ?? "")}
      defaultTitle={isNew ? "" : (currentNote?.title ?? "")}
      defaultContent={isNew ? "" : (currentNote?.content ?? "")}
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
