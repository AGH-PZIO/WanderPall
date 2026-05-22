import { useEffect, useState } from "react";
import { useGuideAction } from "../hooks/guides/useGuideAction";
import { useNavigate, useParams } from "react-router";
import { tokenStore } from "../../account/auth-runtime";
import { AuthRequiredGate } from "../ui/AuthRequiredGate";
import { Guide, GuideBlock } from "../types/Guide";
import { useGuides } from "../hooks/guides/useGuides";
import "../ui/travel-assistance.css";

const MEDIA_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/api\/?$/, "") || "http://localhost:8000";

export default function ReadGuide() {
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
      .map((g: Guide) => (
        <div
          key={g.id}
          className="ta-note-list-item"
          onClick={() => navigate(`/travel-assistance/read-guide/${g.id}`)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate(`/travel-assistance/read-guide/${g.id}`);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <h3>{g.title}</h3>
          <p>{new Date(g.updated_at ?? g.created_at).toLocaleString()}</p>
        </div>
      ));
  }

  if (!accessToken) return <AuthRequiredGate feature="this guide" />;
  if (!guide) {
    return (
      <div className="ta-shell">
        <div className="ta-header">
          <div className="ta-header-left">
            <button type="button" className="btn-back" onClick={() => navigate("/travel-assistance/browse-guides")}>
              ← Back
            </button>
            <h2>Guide</h2>
          </div>
        </div>
        <p className="ta-loading">Loading…</p>
      </div>
    );
  }

  const renderBlock = (block: GuideBlock, idx: number) => {
    switch (block.type) {
      case "heading":
        return (
          <h2 key={idx} className="ta-read-heading">
            {block.text}
          </h2>
        );
      case "paragraph":
        return (
          <p key={idx} className="ta-read-paragraph">
            {block.text}
          </p>
        );
      case "image":
        return (
          <img
            key={idx}
            src={`${MEDIA_BASE}/media/${block.url}`}
            alt=""
            className="ta-read-media"
          />
        );
      case "video":
        return (
          <video key={idx} src={`${MEDIA_BASE}/media/${block.url}`} controls className="ta-read-media" />
        );
      case "audio":
        return <audio key={idx} src={`${MEDIA_BASE}/media/${block.url}`} controls className="ta-read-audio" />;
      default:
        return null;
    }
  };

  return (
    <div className="ta-shell">
      <div className="ta-header">
        <div className="ta-header-left">
          <button type="button" className="btn-back" onClick={() => navigate("/travel-assistance/browse-guides")}>
            ← Back
          </button>
          <h2>{guide.title}</h2>
        </div>
      </div>

      <div className="ta-subnav">
        <button type="button" onClick={() => navigate("/travel-assistance")}>
          Travel assistance
        </button>
        <button type="button" onClick={() => navigate("/travel-assistance/my-guides")}>
          My guides
        </button>
      </div>

      <div className="ta-note-container">
        <div className="ta-note-editor">
          <div className="ta-read-pane">
            <div className="ta-read-body">{guide.content.map((block, idx) => renderBlock(block, idx))}</div>
          </div>
        </div>
        <div className="ta-notes-list">{renderGuides()}</div>
      </div>
    </div>
  );
}
