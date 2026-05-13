import { useNavigate } from "react-router-dom";
import { Note } from "../types/Note";
import { useNotes } from "../hooks/notes/useNotes";
import { useDeleteNote } from "../hooks/notes/useDeleteNote";
import { tokenStore } from "../../account/auth-runtime";
import { AuthRequiredGate } from "../ui/AuthRequiredGate";

function NotesPage() {
    const navigate = useNavigate();
    const { notes, loading, refetch } = useNotes();
    const { remove } = useDeleteNote(refetch);
    const tokens = tokenStore.get(); 
    const accessToken = tokens?.accessToken;

    function renderNotes() {
        return [...notes].sort((a: Note, b: Note) => 
                    new Date(b.updated_at ?? b.created_at).getTime() -
                    new Date(a.updated_at ?? a.created_at).getTime())
        .map((n: Note) => 
        <>
            <div className="ta-note-item" key={n.id} >
                <h3 onClick={() => navigate(`/travel-assistance/note/${n.id}`)} style={{cursor: "pointer"}}>{n.title}</h3>
                <p>{n.content.slice(0,70)}...</p>
                <div className="ta-note-item-controls">
                    <p style={{color: 'gray'}}>{new Date(n.updated_at ?? n.created_at).toLocaleString()}</p>
                    <button className="delete-button" onClick={(e) => {e.stopPropagation(); remove(n.id)}}>🗑</button>
                </div>
            </div>
        </>)
    }

    if (!accessToken) return <AuthRequiredGate feature="Notes" />;
    if (loading) return <p style={{marginLeft: '20px'}} >Loading...</p>;

    return (
        <>
            <div className="ta-shell">
                <div className="ta-header">
                    <h2 onClick={() => navigate("/travel-assistance/notes")}>My Notes</h2>
                </div>

                <h3 style={{marginLeft: '20px'}} onClick={() => navigate("/travel-assistance")}> Back to travel assistance</h3>
                <div className="ta-notes">
                    <button id="create-note" onClick={() => navigate("/travel-assistance/note/new")}>+</button>
                    {renderNotes()}
                </div>
            </div>
        </>
    )
}

export default NotesPage