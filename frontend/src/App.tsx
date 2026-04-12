import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { accountModule } from "./modules/account";
import { journalModule } from "./modules/journal";
import { mapsModule } from "./modules/maps";
import { travelAssistanceModule } from "./modules/travel-assistance";
import { travelBuddiesModule } from "./modules/travel-buddies";

import { TravelAssistancePage } from "./modules/travel-assistance";
import { getTestStatus } from "./shared/api";
import type { FrontendModule } from "./shared/module";

const modules: FrontendModule[] = [
  accountModule,
  travelAssistanceModule,
  travelBuddiesModule,
  mapsModule,
  journalModule
];

function HomePage() {
  async function handleTestApi() {
    const result = await getTestStatus();
    window.alert(result.message);
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="eyebrow">WanderPall</p>
        <h1>Travel planning workspace</h1>

        <button
          className="api-test-button"
          type="button"
          onClick={handleTestApi}
        >
          Test API
        </button>
      </header>

      <section className="module-grid" aria-label="Project modules">
        {modules.map((module) => (
          <article
            className="module-card"
            key={module.id}
            onClick={() => window.location.href = `/${module.id}`}
          >
            <p className="module-number">{module.number}</p>
            <h2>{module.name}</h2>
            <p>{module.summary}</p>
            <p className="module-owner">{module.owner}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

export function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/travel-assistance/*" element={<TravelAssistancePage onClose={() => window.location.href = "/"} />} />
      </Routes>
    </Router>
  );
}