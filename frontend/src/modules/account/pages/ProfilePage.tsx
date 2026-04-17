import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate } from "react-router-dom";

import { updateMe } from "../api/account-api";
import { useAuth } from "../hooks/useAuth";

export function ProfilePage() {
  const { user, accessToken, setUser, loading } = useAuth();
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <p className="acc-muted">Loading…</p>;
  if (!user || !accessToken) return <Navigate to="/account/login" replace />;

  function startEditing() {
    if (!user) return;
    setFirstName(user.first_name);
    setLastName(user.last_name);
    setBirthDate(user.birth_date);
    setEmail(user.email);
    setPhone(user.phone ?? "");
    setError(null);
    setSuccess(null);
    setEditing(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) return;
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const updated = await updateMe(accessToken, {
        first_name: firstName,
        last_name: lastName,
        birth_date: birthDate,
        email,
        phone: phone || null
      });
      setUser(updated);
      setSuccess("Profile updated");
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update profile");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="acc-container">
      <h2 className="acc-heading">Profile</h2>
      <p className="acc-subheading">Your account details.</p>

      <div className="acc-card">
        {success && <p className="acc-success" style={{ marginBottom: 16 }}>{success}</p>}
        {error && <p className="acc-error" style={{ marginBottom: 16 }}>{error}</p>}

        {!editing ? (
          <>
            <dl className="acc-profile-grid">
              <dt>First name</dt>
              <dd>{user.first_name}</dd>
              <dt>Last name</dt>
              <dd>{user.last_name}</dd>
              <dt>Birth date</dt>
              <dd>{user.birth_date}</dd>
              <dt>Email</dt>
              <dd>{user.email}</dd>
              <dt>Phone</dt>
              <dd>{user.phone ?? "—"}</dd>
            </dl>
            <button className="acc-btn-primary" type="button" onClick={startEditing}>
              Edit profile
            </button>
          </>
        ) : (
          <form className="acc-form" onSubmit={submit}>
            <div className="acc-field-row">
              <div className="acc-field">
                <label htmlFor="profile-first">First name</label>
                <input
                  id="profile-first"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="acc-field">
                <label htmlFor="profile-last">Last name</label>
                <input
                  id="profile-last"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
            <div className="acc-field">
              <label htmlFor="profile-birth">Birth date</label>
              <input
                id="profile-birth"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
            <div className="acc-field">
              <label htmlFor="profile-email">Email</label>
              <input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="acc-field">
              <label htmlFor="profile-phone">Phone</label>
              <input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="acc-btn-row">
              <button className="acc-btn-primary" type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Save changes"}
              </button>
              <button
                className="acc-btn-secondary"
                type="button"
                onClick={() => setEditing(false)}
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
