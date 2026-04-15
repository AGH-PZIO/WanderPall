import { Routes, Route } from "react-router-dom";
import { Home } from "../pages/Home";
import { MailPage } from "../pages/MailPage";
import "./travel-assistance.css";

function TravelAssistanceContent({
  onClose
}: {
  onClose: () => void;
}) {
  return (
    <div className="ta-full-page">
      {/* TOP BAR */}
      <div className="ta-topbar">
        <button onClick={onClose} className="btn-close">✕</button>
      </div>

      {/* CONTENT */}
      <div className="ta-page-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/mail" element={<MailPage />} />
          {/* Add more routes here */}
          <Route path="*" element={<Home />} />
        </Routes>
      </div>
    </div>
  );
}

export function TravelAssistancePage({
  onClose
}: {
  onClose: () => void;
}) {
  return (
    <TravelAssistanceContent onClose={onClose} />
  );
}
