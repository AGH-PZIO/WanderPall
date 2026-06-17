import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return <p className="acc-muted">Loading…</p>;
  }

  return (
    <div className="acc-container-wide">
      <h2 className="acc-heading">Account</h2>
      <p className="acc-subheading">
        {user
          ? `Signed in as ${user.first_name} ${user.last_name}`
          : "Sign in or create a new WanderPall account."}
      </p>

      <div className="acc-home-grid">
        {user ? (
          <>
            <Link to="/account/profile" className="acc-home-card">
              <h3>Profile</h3>
              <p>View and edit your personal details.</p>
            </Link>
            <Link to="/account/theme" className="acc-home-card">
              <h3>Theme</h3>
              <p>Switch between light and dark appearance.</p>
            </Link>
            <Link to="/account/delete" className="acc-home-card">
              <h3>Delete account</h3>
              <p>Permanently remove your account.</p>
            </Link>
          </>
        ) : (
          <>
            <Link to="/account/login" className="acc-home-card">
              <h3>Sign in</h3>
              <p>Access your WanderPall workspace.</p>
            </Link>
            <Link to="/account/register" className="acc-home-card">
              <h3>Create account</h3>
              <p>Register with email verification.</p>
            </Link>
            <Link to="/account/password-reset" className="acc-home-card">
              <h3>Forgot password?</h3>
              <p>Request a reset link by email.</p>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
