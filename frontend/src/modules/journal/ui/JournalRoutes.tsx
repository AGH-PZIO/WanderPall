import { Routes, Route } from "react-router-dom";

import { JournalHomePage } from "../pages/JournalHomePage";
import { MyJournalsPage } from "../pages/MyJournalsPage";
import { CreateJournalPage } from "../pages/CreateJournalPage";
import { EditJournalPage } from "../pages/EditJournalPage";
import { ExplorerFeedPage } from "../pages/ExplorerFeedPage";
import { MyPublicJournalsPage } from "../pages/MyPublicJournalsPage";
import { PublicJournalDetailPage } from "../pages/PublicJournalDetailPage";
import "../ui/journal.css";

export function JournalRoutes() {
  return (
    <Routes>
      <Route path="/" element={<JournalHomePage />} />
      <Route path="/explorer" element={<ExplorerFeedPage />} />
      <Route path="/explorer/my-public" element={<MyPublicJournalsPage />} />
      <Route path="/explorer/:journalId" element={<PublicJournalDetailPage />} />
      <Route path="/my" element={<MyJournalsPage />} />
      <Route path="/my/new" element={<CreateJournalPage />} />
      <Route path="/my/:journalId" element={<EditJournalPage />} />
      <Route path="*" element={<JournalHomePage />} />
    </Routes>
  );
}
