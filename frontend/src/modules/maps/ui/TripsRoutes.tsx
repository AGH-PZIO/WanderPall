import { Routes, Route } from "react-router-dom";

import { GroupMapPage } from "../pages/GroupMapPage";
import { MapsGroupsPage } from "../pages/MapsGroupsPage";
import { PageHeader } from "../../../shared/layout/AppLayout";

function TripsHome() {
  return (
    <>
      <PageHeader title="Trips" description="Twoje podróże — mapy, trasy i miejsca." />
      <main className="page-content">
        <MapsGroupsPage />
      </main>
    </>
  );
}

export function TripsRoutes() {
  return (
    <Routes>
      <Route path="/" element={<TripsHome />} />
      <Route path="/groups/:groupId" element={<GroupMapPage />} />
      <Route path="*" element={<TripsHome />} />
    </Routes>
  );
}
