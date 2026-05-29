import { useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../../modules/account/hooks/useAuth";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

const PUBLIC_PATHS = ["/login", "/register", "/password-reset"];

export function AppLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isPublicAuth = PUBLIC_PATHS.some((path) => location.pathname.startsWith(path));

  if (loading) {
    return (
      <div className="app">
        <Topbar showMenu={false} />
        <div className="app-body">
          <main className="main">
            <div className="page-content">
              <p className="text-secondary">Ładowanie…</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!user && !isPublicAuth) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (isPublicAuth) {
    return (
      <div className="app">
        <Topbar />
        <div className="app-body app-body--auth">
          <main className="main main--auth">
            <div className="page-content page-content--auth">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Topbar showMenu onMenuClick={() => setSidebarOpen(true)} />
      <div className="app-body">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="main">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <header className="page-header">
      <h1>{title}</h1>
      {description && <p className="text-secondary">{description}</p>}
    </header>
  );
}
