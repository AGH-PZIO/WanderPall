import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "./modules/account/hooks/useAuth";
import { LoginPage } from "./modules/account/pages/LoginPage";
import { RegisterPage } from "./modules/account/pages/RegisterPage";
import { PasswordResetPage } from "./modules/account/pages/PasswordResetPage";
import { PasswordResetConfirmPage } from "./modules/account/pages/PasswordResetConfirmPage";
import { AccountRoutes } from "./modules/account/ui/AccountRoutes";
import { GuidesRoutes } from "./modules/travel-assistance/ui/GuidesRoutes";
import { ToolsRoutes } from "./modules/travel-assistance/ui/ToolsRoutes";
import { GroupsRoutes } from "./modules/travel-buddies/ui/GroupsRoutes";
import { TripsRoutes } from "./modules/maps/ui/TripsRoutes";
import { AppLayout } from "./shared/layout/AppLayout";
import { LandingPage } from "./pages/LandingPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { TravelAssistanceHubPage } from "./pages/dev/TravelAssistanceHubPage";
import { JournalDevPage } from "./pages/dev/JournalDevPage";
import { ToastProvider } from "./shared/ui/Toast";

function LegacyRedirect({ to }: { to: string }) {
  return <Navigate to={to} replace />;
}

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/travel-assistance" element={<TravelAssistanceHubPage />} />
            <Route path="/projects/journal" element={<JournalDevPage />} />

            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<LegacyRedirect to="/trips" />} />
              <Route path="/trips/*" element={<TripsRoutes />} />
              <Route path="/groups/*" element={<GroupsRoutes />} />
              <Route path="/guides/*" element={<GuidesRoutes />} />
              <Route path="/journal/*" element={<PlaceholderPage title="Journal" description="Wpisy z podróży — publiczne i prywatne dzienniki." />} />
              <Route path="/tools/*" element={<ToolsRoutes />} />
              <Route path="/account/*" element={<AccountRoutes />} />

              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/password-reset" element={<PasswordResetPage />} />
              <Route path="/password-reset/confirm" element={<PasswordResetConfirmPage />} />
            </Route>

            {/* Legacy URL redirects */}
            <Route path="/travel-assistance/*" element={<LegacyRedirect to="/guides" />} />
            <Route path="/travel-buddies/*" element={<LegacyRedirect to="/groups" />} />
            <Route path="/maps/*" element={<LegacyRedirect to="/trips" />} />
            <Route path="/account/login" element={<LegacyRedirect to="/login" />} />
            <Route path="/account/register" element={<LegacyRedirect to="/register" />} />
            <Route path="/account/password-reset/*" element={<LegacyRedirect to="/password-reset" />} />
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}
