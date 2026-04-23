import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGuideAction } from '../hooks/guides/useGuideAction';
import { GuideBlock, CreateGuideDTO } from '../types/Guide';

export default function GuideEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getGuide, saveGuide, uploadFile, loading } = useGuideAction();
    
    const isNew = id === 'new';
    
    const [title, setTitle] = useState('');
    const [content, setContent] = useState<GuideBlock[]>([]);
    const [published, setPublished] = useState(false);

    useEffect(() => {
        if (!isNew && id) {
            getGuide(id).then(g => {
                if (g) {
                    setTitle(g.title);
                    setContent(typeof g.content === 'string' ? JSON.parse(g.content) : g.content);
                    setPublished(g.published);
                }
            });
        }
    }, [id, isNew, getGuide]);

    const addBlock = (type: GuideBlock['type']) => {
        setContent([...content, { type, text: '', url: '' }]);
    };

    const updateBlock = (index: number, field: keyof GuideBlock, value: string) => {
        const newContent = [...content];
        
        const updatedBlock = { 
            ...newContent[index], 
            [field]: value 
        } as GuideBlock;
        
        newContent[index] = updatedBlock;
        setContent(newContent);
    };

    const removeBlock = (index: number) => {
        setContent(content.filter((_, i) => i !== index));
    };

    const handleFileUpload = async (index: number, file: File | undefined) => {
        if (!file) return;
        try {
            const response = await uploadFile(file);
            updateBlock(index, 'url', response.file_id);
        } catch (err: unknown) {
            if(err instanceof Error)
                alert("Error uploading file! " + err.message);
            else
                alert("Error uploading file!");
        }
    };

    const handleSave = async () => {
        if (!title.trim()) return alert("Title cannot be empty");

        const payload: CreateGuideDTO = { 
            title, 
            content, 
            published 
        };

        try {
            await saveGuide(isNew ? null : id!, payload);
            alert(isNew ? "Guide created!" : "Changes saved!");
            navigate('/travel-assistance/my-guides');
        } catch (err: unknown) {
            if(err instanceof Error)
                alert("Error when saving the file!" + err.message);
            else
                alert("Error when saving the file!")
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '40px auto', fontFamily: 'sans-serif' }}>
        <h1>{isNew ? 'New guide' : 'Edit guide'}</h1>
        
        <input 
            type="text" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            placeholder="Title"
            style={{ width: '100%', fontSize: '1.5rem', padding: '10px', marginBottom: '20px', boxSizing: 'border-box' }}
        />

        <div style={{ marginBottom: '20px', border: '1px dashed #ccc', padding: '15px', borderRadius: '8px', background: '#f9f9f9' }}>
            <strong style={{ marginRight: '10px' }}>Add section:</strong>
            <button onClick={() => addBlock('heading')}>Heading</button>
            <button onClick={() => addBlock('paragraph')}>Paragraph</button>
            <button onClick={() => addBlock('image')}>Image</button>
            <button onClick={() => addBlock('video')}>Video</button>
            <button onClick={() => addBlock('audio')}>Audio</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {content.map((block, index) => (
            <div key={index} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', position: 'relative', background: '#fff' }}>
                <button 
                    onClick={() => removeBlock(index)} 
                    style={{ position: 'absolute', right: 10, top: 10, background: '#ff4d4d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '2px 8px' }}>
                    Delete
                </button>
                <small style={{ color: '#888', textTransform: 'uppercase', fontWeight: 'bold' }}>{block.type}</small>
                
                {['heading', 'paragraph'].includes(block.type) && (
                <textarea 
                    value={block.text || ''} 
                    onChange={(e) => updateBlock(index, 'text', e.target.value)}
                    placeholder={block.type === 'heading' ? "Type title..." : "Type content..."}
                    style={{ width: '100%', minHeight: block.type === 'heading' ? '40px' : '100px', marginTop: '10px', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }}
                />
                )}

                {['image', 'video', 'audio'].includes(block.type) && (
                <div style={{ marginTop: '10px' }}>
                    <input 
                        type="file" 
                        accept={`${block.type}/*`} 
                        onChange={(e) => handleFileUpload(index, e.target.files?.[0])} 
                        style={{ display: 'block', marginBottom: '10px' }}
                    />
                    {block.url && (
                    <div style={{ padding: '8px', background: '#e6fffa', border: '1px solid #38b2ac', borderRadius: '4px' }}>
                        <p style={{ color: '#2c7a7b', margin: 0, fontSize: '0.9rem' }}>✓ File saved successfully</p>
                    </div>
                    )}
                </div>
                )}
            </div>
            ))}
        </div>

        <div style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px', display: 'flex', gap: '10px' }}>
            <button 
                onClick={handleSave} 
                disabled={loading}
                style={{ 
                    padding: '12px 24px', 
                    fontSize: '1rem', 
                    background: '#3182ce', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '6px', 
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1
                }}
            >
            {loading ? 'Saving...' : 'Save guide'}
            </button>
            
            <button 
                onClick={() => navigate('/travel-assistance/my-guides')}
                style={{ padding: '12px 24px', background: 'transparent', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer' }}
            >
                Cancel
            </button>
        </div>
        </div>
    );
}