import { useEffect, useState } from 'react';
import { useGuideAction } from '../hooks/guides/useGuideAction';
import { useNavigate, useParams } from 'react-router';
import { tokenStore } from '../../account/auth-runtime';
import { AuthRequiredGate } from '../ui/AuthRequiredGate';
import { Guide, GuideBlock } from '../types/Guide';
import { useGuides } from '../hooks/guides/useGuides';

export default function ReadGuide() {
    const BASE_URL = "http://localhost:8000";
    const navigate = useNavigate();
    const { id } = useParams();
    const { getGuide } = useGuideAction();
    const { guides } = useGuides("public");
    const [guide, setGuide] = useState<Guide>();
    const tokens = tokenStore.get(); 
    const accessToken = tokens?.accessToken;

    useEffect(() => {
        if (!id) return;

        getGuide(id).then((data) => {
            if (data) {
                setGuide(data);
            }
        });
    }, [id, getGuide]);

    function renderGuides() {
        return [...guides]
            .sort(
                (a: Guide, b: Guide) =>
                    new Date(b.updated_at ?? b.created_at).getTime() -
                    new Date(a.updated_at ?? a.created_at).getTime()
            )
            .map((guide: Guide) => (
            <div 
                key={guide.id} 
                className="ta-note-list-item"
                onClick={() => navigate(`/travel-assistance/read-guide/${guide.id}`)}
            >
                <h3>{guide.title}</h3>
                <p style={{color: 'gray'}}>
                    {new Date(guide.updated_at ?? guide.created_at).toLocaleString()}
                </p>
            </div>
            ))
    }

    if (!accessToken) return <AuthRequiredGate feature="this guide" />;
    if (!guide) return <p style={{marginLeft: '20px'}}>Loading...</p>;

    const renderBlock = (block: GuideBlock, idx: number) => {
        switch (block.type) {
        case 'heading': return <h2 key={idx}>{block.text}</h2>;
        case 'paragraph': return <p key={idx}>{block.text}</p>;
        case 'image': return <img key={idx} src={`${BASE_URL}/media/${block.url}`} alt="Poradnik" style={{maxWidth: '100%'}}/>;
        case 'video': return <video key={idx} src={`${BASE_URL}/media/${block.url}`} controls style={{maxWidth: '100%'}}/>;
        case 'audio': return <audio key={idx} src={`${BASE_URL}/media/${block.url}`} controls />;
        default: return null;
        }
    };

    return (
        <div className="ta-shell">
            <div className="ta-header">
                <h2 onClick={() => navigate("/travel-assistance/browse-guides")}>Browse public travel guides</h2>
            </div>

            <h3 style={{marginLeft: '20px'}} onClick={() => navigate("/travel-assistance")}>Back to travel assistance</h3>
            <h3 style={{marginLeft: '20px'}} onClick={() => navigate("/travel-assistance/my-guides")}>Browse your guides</h3>

            <div className="ta-note-container">
                <div style={{ maxWidth: '800px', margin: '0 auto', borderRight: '2px solid #f0f0f0' }}>
                    <h1>{guide.title}</h1>
                    <hr />
                    <div>
                        {guide.content.map((block, idx) => renderBlock(block, idx))}
                    </div>
                </div>
                <div className="ta-notes-list">
                    {renderGuides()}
                </div>
            </div>
            
        </div>
    );
}