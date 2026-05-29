import { Link } from "react-router-dom";
import { useAuth } from "../../account/hooks/useAuth";

export function JournalHomePage() {
  const { user, loading } = useAuth();

  return (
    <div className="jr-shell">
      <div className="jr-header">
        <div>
          <h2 style={{ margin: 0 }}>Travel journals</h2>
          <p className="jr-muted" style={{ margin: "6px 0 0" }}>
            Create and manage your own journals, or explore public journals from the community.
          </p>
        </div>
      </div>

      <div className="jr-card">
        {loading ? (
          <p className="jr-muted">Loading...</p>
        ) : user ? (
          <div className="jr-actions" style={{ justifyContent: "flex-start" }}>
            <Link className="jr-btn" to="/journal/explorer">Explore Journals</Link>
            <Link className="jr-btn-secondary jr-btn" to="/journal/explorer/my-public">My Public Journals</Link>
            <Link className="jr-btn-secondary jr-btn" to="/journal/my">My journals</Link>
            <Link className="jr-btn-secondary jr-btn" to="/journal/my/new">Create journal</Link>
          </div>
        ) : (
          <>
            <p className="jr-muted">
              You need to be signed in to create journals.
            </p>
            <div className="jr-actions" style={{ justifyContent: "flex-start" }}>
              <Link className="jr-btn" to="/account/login">Go to login</Link>
              <Link className="jr-btn-secondary jr-btn" to="/account/register">Create account</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
