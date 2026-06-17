import { Link, Routes, Route } from "react-router-dom";

import MyCalculations from "../pages/MyCalculations";
import Calculation from "../pages/Calculation";
import { TranslatorPage } from "../pages/TranslatorPage";
import { CalendarPage } from "../pages/CalendarPage";
import { PageHeader } from "../../../shared/layout/AppLayout";

function ToolsHome() {
  return (
    <>
      <PageHeader title="Narzędzia" description="Kalkulator, tłumacz i kalendarz — szybkie narzędzia podróżnicze." />
      <main className="page-content">
        <div className="module-grid">
          <Link to="/tools/calculator" className="module-card module-card--link">
            <h2>Kalkulator</h2>
            <p>Oblicz koszty podróży.</p>
          </Link>
          <Link to="/tools/translator" className="module-card module-card--link">
            <h2>Tłumacz</h2>
            <p>Tłumacz tekst na potrzeby podróży.</p>
          </Link>
          <Link to="/tools/calendar" className="module-card module-card--link">
            <h2>Kalendarz</h2>
            <p>Synchronizacja z Google Calendar.</p>
          </Link>
        </div>
      </main>
    </>
  );
}

export function ToolsRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ToolsHome />} />
      <Route path="/calculator" element={<MyCalculations />} />
      <Route path="/calculator/:id" element={<Calculation />} />
      <Route path="/translator" element={<TranslatorPage />} />
      <Route path="/calendar" element={<CalendarPage />} />
      <Route path="*" element={<ToolsHome />} />
    </Routes>
  );
}
