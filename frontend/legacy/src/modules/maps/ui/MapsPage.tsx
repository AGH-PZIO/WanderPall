import { Route, Routes } from "react-router-dom";

import { GroupMapPage } from "../pages/GroupMapPage";
import { MapsGroupsPage } from "../pages/MapsGroupsPage";
import "./maps.css";

export function MapsPage({ onClose }: { onClose: () => void }) {
  return (
    <div className="maps-full-page">
      <div className="maps-topbar">
        <span className="maps-topbar-title">Mapy podróży</span>
        <button onClick={onClose} className="btn-close" aria-label="Close">
          ✕
        </button>
      </div>
      <div className="maps-page-content">
        <Routes>
          <Route path="/" element={<MapsGroupsPage />} />
          <Route path="/groups/:groupId" element={<GroupMapPage />} />
          <Route path="*" element={<MapsGroupsPage />} />
        </Routes>
      </div>
    </div>
  );
}
