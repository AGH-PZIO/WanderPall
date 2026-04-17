import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate("/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="acc-container">
      <h2 className="acc-heading">Sign in</h2>
      <p className="acc-subheading">Welcome back to WanderPall.</p>

      <div className="acc-card">
        <form className="acc-form" onSubmit={handleSubmit}>
          {error && <p className="acc-error">{error}</p>}

          <div className="acc-field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="acc-field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button className="acc-btn-primary" type="submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>

          <p className="acc-muted">
            New here? <Link to="/account/register" className="acc-link-button">Create an account</Link>
          </p>
          <p className="acc-muted">
            Forgot password?{" "}
            <Link to="/account/password-reset" className="acc-link-button">Reset it</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
