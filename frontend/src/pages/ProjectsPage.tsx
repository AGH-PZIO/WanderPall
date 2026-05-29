import { getTestStatus } from "../shared/api";
import type { FrontendModule } from "../shared/module";
import { accountModule } from "../modules/account";
import { journalModule } from "../modules/journal";
import { mapsModule } from "../modules/maps";
import { travelAssistanceModule } from "../modules/travel-assistance";
import { travelBuddiesModule } from "../modules/travel-buddies";
import { PageHeader } from "../shared/layout/AppLayout";
import { Topbar } from "../shared/layout/Topbar";

const modules: FrontendModule[] = [
  accountModule,
  travelAssistanceModule,
  travelBuddiesModule,
  mapsModule,
  journalModule
];

const MODULE_ROUTES: Record<string, string> = {
  account: "/account",
  "travel-assistance": "/guides",
  "travel-buddies": "/groups",
  maps: "/trips",
  journal: "/journal"
};

export function ProjectsPage() {
  async function handleTestApi() {
    const result = await getTestStatus();
    window.alert(result.message);
  }

  return (
    <div className="app">
      <Topbar />
      <div className="app-body app-body--landing">
        <main className="main main--landing">
          <div className="page-content page-content--wide projects-page">
            <PageHeader
              title="Travel planning workspace"
              description="Tryb deweloperski — lista modułów projektu i autorów."
            />

            <p className="eyebrow">WanderPall</p>

            <button className="btn btn--primary btn--sm" type="button" onClick={handleTestApi} style={{ marginBottom: 24 }}>
              Test API
            </button>

            <section className="module-grid" aria-label="Project modules">
              {modules.map((module) => (
                <article
                  className="module-card"
                  key={module.id}
                  onClick={() => {
                    window.location.href = MODULE_ROUTES[module.id] ?? `/${module.id}`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      window.location.href = MODULE_ROUTES[module.id] ?? `/${module.id}`;
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <p className="module-number">{module.number}</p>
                  <h2>{module.name}</h2>
                  <p>{module.summary}</p>
                  <p className="module-owner">{module.owner}</p>
                </article>
              ))}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
