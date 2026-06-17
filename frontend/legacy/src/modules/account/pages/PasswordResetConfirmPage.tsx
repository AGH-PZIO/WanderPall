import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { confirmPasswordReset } from "../api/account-api";

export function PasswordResetConfirmPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const tokenFromLink = params.get("token");

  const [token, setToken] = useState(tokenFromLink ?? "");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const hasLinkToken = Boolean(tokenFromLink);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) {
      setError("Reset token is missing");
      return;
    }
    if (password !== passwordConfirmation) {
      setError("Passwords do not match");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await confirmPasswordReset({
        token,
        password,
        password_confirmation: passwordConfirmation
      });
      navigate("/account/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="acc-container">
      <h2 className="acc-heading">Set a new password</h2>
      <p className="acc-subheading">
        {hasLinkToken
          ? "Your reset link was accepted. Choose a new password below."
          : "Paste the token from your reset email."}
      </p>

      <div className="acc-card">
        <form className="acc-form" onSubmit={handleSubmit}>
          {error && <p className="acc-error">{error}</p>}

          {!hasLinkToken && (
            <div className="acc-field">
              <label htmlFor="reset-token">Reset token</label>
              <input
                id="reset-token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
            </div>
          )}
          <div className="acc-field">
            <label htmlFor="reset-password">New password</label>
            <input
              id="reset-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              autoFocus={hasLinkToken}
            />
          </div>
          <div className="acc-field">
            <label htmlFor="reset-password-confirm">Confirm new password</label>
            <input
              id="reset-password-confirm"
              type="password"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <button className="acc-btn-primary" type="submit" disabled={submitting}>
            {submitting ? "Resetting…" : "Reset password"}
          </button>
        </form>
      </div>
    </div>
  );
}
