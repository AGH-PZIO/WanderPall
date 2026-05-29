import { EmailCard } from "./EmailCard";
import type { components } from "../../../../shared/api-types";

type TravelDocument = components["schemas"]["TravelDocumentResponse"];

export function EmailList({ items }: { items: TravelDocument[] }) {
  if (!items.length) return <p>No emails</p>;

  return (
    <section className="email-list">
      {items.map((doc) => (
        <EmailCard key={doc.id} doc={doc} />
      ))}
    </section>
  );
}