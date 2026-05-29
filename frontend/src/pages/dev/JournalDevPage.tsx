import { Link } from "react-router-dom";

import { journalModule } from "../../modules/journal";
import { PageHeader } from "../../shared/layout/AppLayout";
import { Topbar } from "../../shared/layout/Topbar";

export function JournalDevPage() {
  return (
    <div className="app">
      <Topbar />
      <div className="app-body app-body--landing">
        <main className="main main--landing">
          <div className="page-content page-content--wide projects-page">
            <p className="text-muted" style={{ marginBottom: 16 }}>
              <Link to="/projects">← Wróć do listy modułów</Link>
            </p>

            <PageHeader
              title={journalModule.name}
              description="Tryb deweloperski — moduł dzienników podróży."
            />

            <p className="eyebrow">{journalModule.number}</p>
            <p className="text-secondary" style={{ marginBottom: 24 }}>
              {journalModule.summary}
            </p>
            <p className="module-owner">{journalModule.owner}</p>

            <div className="card placeholder-page" style={{ marginTop: 24 }}>
              <p>
                Moduł Journal jest dostępny pod <Link to="/journal">/journal</Link>.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
