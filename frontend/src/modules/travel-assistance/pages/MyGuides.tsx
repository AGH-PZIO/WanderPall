import { useGuides } from '../hooks/guides/useGuides';
import { useGuideAction } from '../hooks/guides/useGuideAction';
import { useNavigate } from 'react-router';
import { tokenStore } from '../../account/auth-runtime';
import { Guide } from '../types/Guide';

export default function MyGuides() {
    const navigate = useNavigate();
    const { guides, loading, error, refetch } = useGuides("all");
    const { deleteGuide, togglePublish } = useGuideAction();
    const tokens = tokenStore.get(); 
    const accessToken = tokens?.accessToken;

    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure?")) {
        try {
            await deleteGuide(id);
            await refetch();
        } catch (err: unknown) {
            if(err instanceof Error)
                alert("Error when deleting the guide " + err.message);
            else
                alert("Error when deleting the guide")
        }
        }
    };

    const handleTogglePublish = async (id: string, isPub: boolean) => {
        try {
            await togglePublish(id, isPub);
            await refetch();
        } catch (err: unknown) {
            if(err instanceof Error)
                alert("Error when toggling publicity of the guide " + err.message);
            else
                alert("Error when toggling publicity of the guide")
        }
    };

    function renderGuides() {
            return [...guides].sort((a: Guide, b: Guide) => 
                        new Date(b.created_at).getTime() -
                        new Date(a.created_at).getTime())
            .map((g: Guide) => 
            <>
                <div className="ta-note-item" key={g.id} >
                    <h3>{g.title}</h3>
                    <p style={{color: 'gray'}}>{new Date(g.created_at).toLocaleString()}</p>
                    <button className='create-btn' onClick={() => navigate(`/travel-assistance/read-guide/${g.id}`)}>Read</button>
                    <button className='create-btn' onClick={() => navigate(`/travel-assistance/guide/${g.id}`)}>Edit</button>
                    <button className='create-btn' onClick={() => handleTogglePublish(g.id, g.published)}>
                        {g.published ? 'Hide' : 'Publish'}
                    </button>
                    <button className='del-btn' onClick={() => handleDelete(g.id)}>Delete</button>
                </div>
            </>)
        }

    if (!accessToken) return <p style={{marginLeft: '20px'}} onClick={() => navigate('/account/login')}>Log in first!</p>
    if (loading) return <p style={{marginLeft: '20px'}}>Loading...</p>;
    if (error) return <p style={{marginLeft: '20px'}}>Error: {error}</p>;

    return (
        <div className="ta-shell">
            <div className="ta-header">
                <h2 onClick={() => navigate("/travel-assistance/my-guides")}>My Guides</h2>
            </div>

            <h3 style={{marginLeft: '20px'}} onClick={() => navigate("/travel-assistance")}>Back to travel assistance</h3>
            <div className="ta-notes">
                <button id="create-note" onClick={() => navigate("/travel-assistance/guide/new")}>+</button>
                {renderGuides()}
            </div>
        </div>
    );
}