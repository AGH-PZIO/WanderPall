import { PageHeader } from "../shared/layout/AppLayout";

type PlaceholderPageProps = {
  title: string;
  description?: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <main className="page-content">
        <div className="placeholder-page card">
          <p>Ta sekcja jest w przygotowaniu. Wkrótce pojawi się tutaj pełna funkcjonalność modułu.</p>
        </div>
      </main>
    </>
  );
}
