import { Link } from "react-router-dom";

import { PageHeader } from "../../shared/layout/AppLayout";
import { Topbar } from "../../shared/layout/Topbar";
import { Icon } from "../../shared/ui/Icon";
import type { IconName } from "../../shared/ui/icons";

type HubItem = {
  to: string;
  icon: IconName;
  title: string;
  description: string;
};

const HUB_ITEMS: HubItem[] = [
  {
    to: "/guides/mail",
    icon: "compass",
    title: "Email Documents",
    description: "Zarządzaj i synchronizuj dokumenty podróży z poczty."
  },
  {
    to: "/guides/browse",
    icon: "book",
    title: "Travel Guides",
    description: "Przeglądaj przewodniki dla swoich destynacji."
  },
  {
    to: "/tools/translator",
    icon: "languages",
    title: "Translator",
    description: "Tłumacz tekst na potrzeby podróży."
  },
  {
    to: "/tools/calendar",
    icon: "calendar",
    title: "Calendar",
    description: "Synchronizacja z Google Calendar."
  },
  {
    to: "/guides/notes",
    icon: "pen-line",
    title: "Notes",
    description: "Przeglądaj i zarządzaj notatkami."
  },
  {
    to: "/tools/calculator",
    icon: "calculator",
    title: "Calculator",
    description: "Kalkulator kosztów i lista obliczeń."
  }
];

export function TravelAssistanceHubPage() {
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
              title="Travel Assistance"
              description="Tryb deweloperski — wybierz narzędzie modułu Travel Assistance."
            />

            <section className="module-grid" aria-label="Travel Assistance tools">
              {HUB_ITEMS.map((item) => (
                <Link key={item.to} to={item.to} className="module-card module-card--link">
                  <div className="stat-card__icon" style={{ marginBottom: 12 }}>
                    <Icon name={item.icon} size="icon-md" />
                  </div>
                  <h2>{item.title}</h2>
                  <p>{item.description}</p>
                </Link>
              ))}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
