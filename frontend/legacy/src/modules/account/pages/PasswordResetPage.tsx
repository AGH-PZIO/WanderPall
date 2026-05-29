import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";

import { requestPasswordReset } from "../api/account-api";

export function PasswordResetPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      setSuccess("If the email exists, a reset link was sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="acc-container">
      <h2 className="acc-heading">Forgot password</h2>
      <p className="acc-subheading">Enter your account email to get a reset link.</p>

      <div className="acc-card">
        <form className="acc-form" onSubmit={handleSubmit}>
          {success && <p className="acc-success">{success}</p>}
          {error && <p className="acc-error">{error}</p>}

          <div className="acc-field">
            <label htmlFor="reset-email">Email</label>
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <button className="acc-btn-primary" type="submit" disabled={submitting}>
            {submitting ? "Sending…" : "Send reset link"}
          </button>

          <p className="acc-muted">
            Have a token?{" "}
            <Link to="/account/password-reset/confirm" className="acc-link-button">
              Enter it here
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
