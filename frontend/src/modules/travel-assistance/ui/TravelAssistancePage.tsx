import { Routes, Route } from "react-router-dom";
import { Home } from "../pages/Home";
import { MailPage } from "../pages/MailPage";
import "./travel-assistance.css";
import NotesPage from "../pages/NotesPage";
import BrowseGuides from "../pages/BrowseGuidesPage";
import NotePage from "../pages/NotePage";
import MyGuides from "../pages/MyGuides";
import ReadGuide from "../pages/ReadGuide";
import MyCalculations from "../pages/MyCalculations";
import Calculation from "../pages/Calculation";
import GuideEditor from "../pages/Guide";
import { TranslatorPage } from "../pages/TranslatorPage";
import { CalendarPage } from "../pages/CalendarPage";

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
          <Route path="mail" element={<MailPage />} />
          <Route path="translator" element={<TranslatorPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          {/* Add more routes here */}
          <Route path="*" element={<Home />} />

          <Route path="/notes" element={<NotesPage />} />
          <Route path="/note/:id" element={<NotePage />} />

          <Route path="/browse-guides" element={<BrowseGuides />} />
          <Route path="/my-guides" element={<MyGuides />} />
          <Route path="/read-guide/:id" element={<ReadGuide />} />
          <Route path="/guide/:id" element={<GuideEditor />} />
          
          <Route path="/my-calculations" element={<MyCalculations />} />
          <Route path="/calculation/:id" element={<Calculation />} />
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
