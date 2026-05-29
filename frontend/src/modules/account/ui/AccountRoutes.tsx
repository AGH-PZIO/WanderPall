import { Routes, Route } from "react-router-dom";

import { HomePage } from "../pages/HomePage";
import { ProfilePage } from "../pages/ProfilePage";
import { ThemePage } from "../pages/ThemePage";
import { DeleteAccountPage } from "../pages/DeleteAccountPage";
import { PageHeader } from "../../../shared/layout/AppLayout";

function AccountHome() {
  return (
    <>
      <PageHeader title="Account" description="Profil, motyw i ustawienia konta." />
      <main className="page-content">
        <HomePage />
      </main>
    </>
  );
}

export function AccountRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AccountHome />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/theme" element={<ThemePage />} />
      <Route path="/delete" element={<DeleteAccountPage />} />
      <Route path="*" element={<HomePage />} />
    </Routes>
  );
}

export function AccountPageHeader({ title, description }: { title: string; description?: string }) {
  return <PageHeader title={title} description={description} />;
}
