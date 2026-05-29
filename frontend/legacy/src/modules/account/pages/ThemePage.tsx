import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import { getTheme, updateTheme } from "../api/account-api";
import { applyTheme } from "../auth-runtime";
import { useAuth } from "../hooks/useAuth";

const THEMES = ["light", "dark"] as const;
type Theme = (typeof THEMES)[number];

function normalizeTheme(value: string): Theme {
  return value === "dark" ? "dark" : "light";
}

export function ThemePage() {
  const { accessToken, loading } = useAuth();
  const [theme, setTheme] = useState<Theme>("light");
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    getTheme(accessToken)
      .then((res) => {
        if (cancelled) return;
        const normalized = normalizeTheme(res.theme);
        setTheme(normalized);
        applyTheme(normalized);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load theme");
      })
      .finally(() => {
        if (!cancelled) setInitialLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  if (loading) return <p className="acc-muted">Loading…</p>;
  if (!accessToken) return <Navigate to="/account/login" replace />;

  async function save() {
    if (!accessToken) return;
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const res = await updateTheme(accessToken, theme);
      const normalized = normalizeTheme(res.theme);
      setTheme(normalized);
      applyTheme(normalized);
      setSuccess("Theme saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save theme");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="acc-container">
      <h2 className="acc-heading">Theme</h2>
      <p className="acc-subheading">Choose how WanderPall looks.</p>

      <div className="acc-card">
        {initialLoading ? (
          <p className="acc-muted">Loading…</p>
        ) : (
          <div className="acc-form">
            {success && <p className="acc-success">{success}</p>}
            {error && <p className="acc-error">{error}</p>}

            <div className="acc-field">
              <label htmlFor="theme-select">Theme</label>
              <select
                id="theme-select"
                value={theme}
                onChange={(e) => {
                  const next = normalizeTheme(e.target.value);
                  setTheme(next);
                  applyTheme(next);
                }}
              >
                {THEMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <button className="acc-btn-primary" type="button" onClick={save} disabled={submitting}>
              {submitting ? "Saving…" : "Save theme"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
