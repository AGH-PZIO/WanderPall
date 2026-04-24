import { Routes, Route, useNavigate } from "react-router-dom";

import { AuthProvider, useAuth } from "../account/hooks/useAuth";
import { JournalHomePage } from "./pages/JournalHomePage";
import { MyJournalsPage } from "./pages/MyJournalsPage";
import { CreateJournalPage } from "./pages/CreateJournalPage";
import { EditJournalPage } from "./pages/EditJournalPage";
import { ExplorerFeedPage } from "./pages/ExplorerFeedPage";
import { MyPublicJournalsPage } from "./pages/MyPublicJournalsPage";
import "./ui/journal.css";

function JournalTopbar({ onClose }: { onClose: () => void }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/journal");
  }

  return (
    <div className="jr-topbar">
      <span className="jr-topbar-title">WanderPall · Journals</span>
      <div className="jr-actions">
        {user && (
          <>
            <span className="jr-muted">{user.email}</span>
            <button className="jr-btn-secondary jr-btn" type="button" onClick={handleSignOut}>
              Sign out
            </button>
          </>
        )}
        <button onClick={onClose} className="btn-close" aria-label="Close">✕</button>
      </div>
    </div>
  );
}

function JournalContent({ onClose }: { onClose: () => void }) {
  return (
    <div className="jr-full-page">
      <JournalTopbar onClose={onClose} />
      <div className="jr-page-content">
        <Routes>
          <Route path="/" element={<JournalHomePage />} />
          <Route path="/explorer" element={<ExplorerFeedPage />} />
          <Route path="/explorer/my-public" element={<MyPublicJournalsPage />} />
          <Route path="/my" element={<MyJournalsPage />} />
          <Route path="/my/new" element={<CreateJournalPage />} />
          <Route path="/my/:journalId" element={<EditJournalPage />} />
          <Route path="*" element={<JournalHomePage />} />
        </Routes>
      </div>
    </div>
  );
}

export function JournalPage({ onClose }: { onClose: () => void }) {
  return (
    <AuthProvider>
      <JournalContent onClose={onClose} />
    </AuthProvider>
  );
}
