import { Routes, Route } from "react-router-dom";

import { GroupsPage } from "../pages/GroupsPage";
import { GroupDetailPage } from "../pages/GroupDetailPage";
import { TravelBuddiesProvider } from "../hooks/useTravelBuddies";
import { PageHeader } from "../../../shared/layout/AppLayout";

function GroupsHome() {
  return (
    <>
      <PageHeader title="Groups" description="Współpodróżnicy, czat, ankiety i członkowie." />
      <main className="page-content">
        <GroupsPage />
      </main>
    </>
  );
}

export function GroupsRoutes() {
  return (
    <TravelBuddiesProvider>
      <Routes>
        <Route path="/" element={<GroupsHome />} />
        <Route path="/:groupId/*" element={<GroupDetailPage />} />
        <Route path="*" element={<GroupsPage />} />
      </Routes>
    </TravelBuddiesProvider>
  );
}
