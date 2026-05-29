import { PageHeader } from "../shared/layout/AppLayout";
import { Icon } from "../shared/ui/Icon";

export function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" description="Najbliższy wyjazd, zadania i ostatnia aktywność." />
      <main className="page-content">
        <div className="dashboard-grid">
          <article className="card">
            <div className="stat-card__icon">
              <Icon name="map-pin" size="icon-md" />
            </div>
            <p className="text-muted dashboard-stat-label">Najbliższy wyjazd</p>
            <h2 className="dashboard-stat-accent">Lofoty 2026</h2>
            <p className="text-secondary dashboard-stat-detail">14–28 czerwca · 4 osoby</p>
          </article>

          <article className="card">
            <div className="stat-card__icon">
              <Icon name="list-checks" size="icon-md" />
            </div>
            <p className="text-muted dashboard-stat-label">Zadania</p>
            <h2>3 do zrobienia</h2>
            <p className="text-secondary dashboard-stat-detail">
              Rezerwacja promu, ubezpieczenie, lista pakowania
            </p>
          </article>

          <article className="card">
            <div className="stat-card__icon stat-card__icon--brown">
              <Icon name="activity" size="icon-md" />
            </div>
            <h2 className="dashboard-stat-brown">Anna dodała pin</h2>
            <p className="text-secondary dashboard-stat-detail">Reinebringen · 2 godz. temu</p>
          </article>
        </div>
      </main>
    </>
  );
}
