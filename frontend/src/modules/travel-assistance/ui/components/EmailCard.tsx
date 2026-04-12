import type { components } from "../../../../shared/api-types";

type TravelDocument = components["schemas"]["TravelDocumentResponse"];

export function EmailCard({ doc }: { doc: TravelDocument }) {
  return (
    <article className="email-card">
      <header>
        <h3>{doc.subject}</h3>
        <span>{doc.category} • {doc.confidence}</span>
      </header>

      <p>{doc.snippet}</p>

      <footer>
        <small>{doc.from_addr}</small>
      </footer>
    </article>
  );
}