import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { deleteMe } from "../api/account-api";
import { useAuth } from "../hooks/useAuth";

export function DeleteAccountPage() {
  const { user, accessToken, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <p className="acc-muted">Loading…</p>;
  if (!user || !accessToken) return <Navigate to="/account/login" replace />;

  async function handleDelete() {
    if (!accessToken) return;
    if (!confirm) {
      setError("Please confirm the deletion.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await deleteMe(accessToken, true);
      await signOut();
      navigate("/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete account");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="acc-container">
      <h2 className="acc-heading">Delete account</h2>
      <p className="acc-subheading">This action is permanent.</p>

      <div className="acc-card">
        {error && <p className="acc-error" style={{ marginBottom: 16 }}>{error}</p>}
        <p className="acc-muted" style={{ marginBottom: 16 }}>
          Deleting the account for <strong>{user.email}</strong> removes all data tied to it.
        </p>

        <div className="acc-field" style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <input
            id="delete-confirm"
            type="checkbox"
            checked={confirm}
            onChange={(e) => setConfirm(e.target.checked)}
          />
          <label htmlFor="delete-confirm">I understand this cannot be undone.</label>
        </div>

        <div className="acc-btn-row">
          <button
            className="acc-btn-danger"
            type="button"
            onClick={handleDelete}
            disabled={submitting || !confirm}
          >
            {submitting ? "Deleting…" : "Delete my account"}
          </button>
          <button
            className="acc-btn-secondary"
            type="button"
            onClick={() => navigate("/account")}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
