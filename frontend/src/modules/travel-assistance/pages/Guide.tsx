import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGuideAction } from "../hooks/guides/useGuideAction";
import { GuideBlock, CreateGuideDTO } from "../types/Guide";
import "../ui/travel-assistance.css";

export default function GuideEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getGuide, saveGuide, uploadFile, loading } = useGuideAction();

  const isNew = id === "new";

  const [title, setTitle] = useState("");
  const [content, setContent] = useState<GuideBlock[]>([]);
  const [published, setPublished] = useState(false);

  useEffect(() => {
    if (!isNew && id) {
      getGuide(id).then((g) => {
        if (g) {
          setTitle(g.title);
          setContent(typeof g.content === "string" ? JSON.parse(g.content) : g.content);
          setPublished(g.published);
        }
      });
    }
  }, [id, isNew, getGuide]);

  const addBlock = (type: GuideBlock["type"]) => {
    setContent([...content, { type, text: "", url: "" }]);
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
      updateBlock(index, "url", response.file_id);
    } catch (err: unknown) {
      if (err instanceof Error) alert(`Error uploading file: ${err.message}`);
      else alert("Error uploading file");
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert("Title cannot be empty");
      return;
    }

    const payload: CreateGuideDTO = {
      title,
      content,
      published
    };

    try {
      await saveGuide(isNew ? null : id!, payload);
      alert(isNew ? "Guide created!" : "Changes saved!");
      navigate("/travel-assistance/my-guides");
    } catch (err: unknown) {
      if (err instanceof Error) alert(`Error when saving: ${err.message}`);
      else alert("Error when saving");
    }
  };

  return (
    <div className="ta-shell">
      <div className="ta-header">
        <div className="ta-header-left">
          <button type="button" className="btn-back" onClick={() => navigate("/travel-assistance/my-guides")}>
            ← Back
          </button>
          <h2>{isNew ? "New guide" : "Edit guide"}</h2>
        </div>
        <div className="ta-actions">
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.9rem", color: "#555" }}>
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            Published
          </label>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? "Saving…" : "Save guide"}
          </button>
        </div>
      </div>

      <div className="ta-guide-shell">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Guide title"
          className="ta-guide-title-input"
        />

        <div className="ta-guide-toolbar">
          <strong>Add block</strong>
          <button type="button" onClick={() => addBlock("heading")}>
            Heading
          </button>
          <button type="button" onClick={() => addBlock("paragraph")}>
            Paragraph
          </button>
          <button type="button" onClick={() => addBlock("image")}>
            Image
          </button>
          <button type="button" onClick={() => addBlock("video")}>
            Video
          </button>
          <button type="button" onClick={() => addBlock("audio")}>
            Audio
          </button>
        </div>

        <div>
          {content.map((block, index) => (
            <div key={`${block.type}-${index}`} className="ta-guide-block">
              <button type="button" className="ta-guide-block-remove" onClick={() => removeBlock(index)}>
                Remove
              </button>
              <div className="ta-guide-block-type">{block.type}</div>

              {["heading", "paragraph"].includes(block.type) && (
                <textarea
                  value={block.text || ""}
                  onChange={(e) => updateBlock(index, "text", e.target.value)}
                  placeholder={block.type === "heading" ? "Heading text…" : "Paragraph text…"}
                  rows={block.type === "heading" ? 2 : 6}
                />
              )}

              {["image", "video", "audio"].includes(block.type) && (
                <div>
                  <input
                    type="file"
                    accept={`${block.type}/*`}
                    onChange={(e) => handleFileUpload(index, e.target.files?.[0])}
                    className="ta-guide-upload"
                  />
                  {block.url ? <div className="ta-guide-upload-ok">File attached</div> : null}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="ta-guide-footer-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate("/travel-assistance/my-guides")}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
