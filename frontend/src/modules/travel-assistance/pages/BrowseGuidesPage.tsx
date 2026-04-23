import { useNavigate } from "react-router";
import { useGuides } from "../hooks/guides/useGuides";
import { Guide } from "../types/Guide";

function BrowseGuides() {
    const { guides, loading, error } = useGuides("public");
    const navigate = useNavigate();

    function renderGuides() {
        return (
            guides.map((guide: Guide) => (
            <div key={guide.id} style={{ border: '1px solid #ccc', padding: '1rem' }}>
                <h3>{guide.title}</h3>
                <p>Published on: {new Date(guide.updated_at || guide.created_at).toLocaleDateString()}</p>
                <button className="create-btn" onClick={() => navigate(`/travel-assistance/read-guide/${guide.id}`)}>
                    Read guide
                </button>
            </div>
            ))
        )
    }

    if (loading) return <p style={{marginLeft: '20px'}}>Loading...</p>;
    if (error) return <p style={{marginLeft: '20px'}}>Error: {error}</p>;

    return (
        <div className="ta-shell">
            <div className="ta-header">
                <h2 onClick={() => navigate("/travel-assistance/browse-guides")}>Browse public travel guides</h2>
            </div>

            <h3 style={{marginLeft: '20px'}} onClick={() => navigate("/travel-assistance")}>Back to travel assistance</h3>
            <h3 style={{marginLeft: '20px'}} onClick={() => navigate("/travel-assistance/my-guides")}>Browse your guides</h3>

            <div style={{ display: 'grid', gap: '1rem' }}>
                {renderGuides()}
            </div>
        </div>
  );
};

export default BrowseGuides