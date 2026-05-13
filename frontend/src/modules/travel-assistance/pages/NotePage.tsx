import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState, useRef } from "react";
import { useNotes } from "../hooks/notes/useNotes";
import { Note } from "../types/Note";
import { useCreateNote } from "../hooks/notes/useCreateNote";
import { useDeleteNote } from "../hooks/notes/useDeleteNote";
import { useUpdateNote } from "../hooks/notes/useUpdateNote";
import { useAuth } from "../../account/hooks/useAuth";
import { tokenStore } from "../../account/auth-runtime";
import { AuthRequiredGate } from "../ui/AuthRequiredGate";

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
    const lastInitializedId = useRef<string | null>(null);

    const currentNote = useMemo(() => {
        if (isNew) return null;
        return notes.find((n: Note) => n.id === id) ?? null;
    }, [notes, id, isNew]);

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");

    useEffect(() => {
        if (currentNote && currentNote.id !== lastInitializedId.current) {
            // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
            setTitle(currentNote.title);
            setContent(currentNote.content);
            lastInitializedId.current = currentNote.id;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentNote]);

    function handleSave() {
        if (!user) {
            alert("You have to be logged in!");
            return;
        }

        const noteData = {
            title: title,
            content: content,
            user_id: user.id 
        };

        if (isNew) {
            create(noteData); 
        } else {
            update(id ? id : "", noteData);
        }

        navigate('/travel-assistance/notes');
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
                >
                    <h3>{n.title}</h3>
                    <p style={{color: 'gray'}}>
                        {new Date(n.updated_at ?? n.created_at).toLocaleString()}
                    </p>
                </div>
        ));
    }

    if (!accessToken) return <AuthRequiredGate feature="Notes" />;
    if (loading) return <p style={{marginLeft: '20px'}}>Loading...</p>;

    return (
        <div className="ta-shell">

        <div className="ta-header">
            <h2 onClick={() => navigate("/travel-assistance/notes")}>
            {isNew ? "Create note" : "Edit note"}
            </h2>
        </div>

        <h3 style={{marginLeft: '20px'}} onClick={() => navigate("/travel-assistance")}> Back to travel assistance</h3>
        <div className="ta-note-container">
            <div className="ta-note-editor">
            <label>
                <h2>Title</h2>
            </label>

            <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
            />

            <label>
                <h3>Content</h3>
            </label>

            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
            /> <br />

            <div className="control-buttons">
                <button id="save" onClick={handleSave}>
                    {isNew ? "Create" : "Save"}
                </button>
                {
                    !isNew &&
                    <button id="del" onClick={() => { remove(id ? id : ""); navigate("/travel-assistance/notes") }}>Delete</button>
                }
            </div>

            </div>

            <div className="ta-notes-list">{renderNotes()}</div>
        </div>
        </div>
    );
}

export default NotePage;