import { Routes, Route } from "react-router-dom";

import BrowseGuides from "../pages/BrowseGuidesPage";
import NotePage from "../pages/NotePage";
import EditNotePage from "../pages/EditNotePage";
import MyGuides from "../pages/MyGuides";
import ReadGuide from "../pages/ReadGuide";
import GuideEditor from "../pages/Guide";
import NotesPage from "../pages/NotesPage";
import { MailPage } from "../pages/MailPage";
import { PageHeader } from "../../../shared/layout/AppLayout";
import { Link } from "react-router-dom";

function GuidesHome() {
  return (
    <>
      <PageHeader title="Guides" description="Przewodniki podróżnicze — przeglądaj, twórz i edytuj." />
      <main className="page-content">
        <div className="module-grid">
          <Link to="/guides/browse" className="module-card module-card--link">
            <h2>Przeglądaj przewodniki</h2>
            <p>Przeglądaj przewodniki dla swoich destynacji.</p>
          </Link>
          <Link to="/guides/mine" className="module-card module-card--link">
            <h2>Moje przewodniki</h2>
            <p>Twórz i zarządzaj własnymi przewodnikami.</p>
          </Link>
          <Link to="/guides/notes" className="module-card module-card--link">
            <h2>Notatki</h2>
            <p>Prywatne notatki podróżnicze.</p>
          </Link>
          <Link to="/guides/mail" className="module-card module-card--link">
            <h2>Email Documents</h2>
            <p>Zarządzaj dokumentami podróży z poczty.</p>
          </Link>
        </div>
      </main>
    </>
  );
}

export function GuidesRoutes() {
  return (
    <Routes>
      <Route path="/" element={<GuidesHome />} />
      <Route path="/browse" element={<BrowseGuides />} />
      <Route path="/mine" element={<MyGuides />} />
      <Route path="/read/:id" element={<ReadGuide />} />
      <Route path="/edit/:id" element={<GuideEditor />} />
      <Route path="/notes" element={<NotesPage />} />
      <Route path="/note/:id" element={<NotePage />} />
      <Route path="/edit-note/:id" element={<EditNotePage />} />
      <Route path="/mail" element={<MailPage />} />
      <Route path="*" element={<GuidesHome />} />
    </Routes>
  );
}
