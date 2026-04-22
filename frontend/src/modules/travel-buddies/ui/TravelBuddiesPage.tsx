import { Routes, Route, useNavigate } from "react-router-dom";
import { TravelBuddiesProvider, useTravelBuddies } from "../hooks/useTravelBuddies";
import { GroupsPage } from "../pages/GroupsPage";
import { GroupDetailPage } from "../pages/GroupDetailPage";
import { ChatPage } from "../pages/ChatPage";
import "./travel-buddies.css";

function TravelBuddiesTopbar({ onClose }: { onClose: () => void }) {
  const { currentGroup } = useTravelBuddies();
  const navigate = useNavigate();

  return (
    <div className="tb-topbar">
      <span className="tb-topbar-title">
        {currentGroup ? `Travel Buddies · ${currentGroup.name}` : "Travel Buddies"}
      </span>
      <div className="tb-topbar-right">
        {currentGroup && (
          <button
            type="button"
            className="tb-btn-secondary"
            onClick={() => navigate("/travel-buddies")}
          >
            Back
          </button>
        )}
        <button onClick={onClose} className="btn-close" aria-label="Close">
          ✕
        </button>
      </div>
    </div>
  );
}

function TravelBuddiesContent({ onClose }: { onClose: () => void }) {
  return (
    <div className="tb-full-page">
      <TravelBuddiesTopbar onClose={onClose} />
      <div className="tb-page-content">
        <Routes>
          <Route path="/" element={<GroupsPage />} />
          <Route path="/groups/:groupId/*" element={<GroupDetailPage />} />
          <Route path="*" element={<GroupsPage />} />
        </Routes>
      </div>
    </div>
  );
}

export function TravelBuddiesPage({ onClose }: { onClose: () => void }) {
  return (
    <TravelBuddiesProvider>
      <TravelBuddiesContent onClose={onClose} />
    </TravelBuddiesProvider>
  );
}