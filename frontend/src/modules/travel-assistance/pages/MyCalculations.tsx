import { useMemo } from "react";
import { useNavigate } from "react-router";
import { tokenStore } from "../../account/auth-runtime";
import { AuthRequiredGate } from "../ui/AuthRequiredGate";
import { useCalculations } from "../hooks/calculations/useCalculations";
import { useDeleteCalculation } from "../hooks/calculations/useDeleteCalculation";
import { Calculation } from "../types/Calculation";
import "../ui/travel-assistance.css";

function MyCalculations() {
  const navigate = useNavigate();
  const tokens = tokenStore.get();
  const accessToken = tokens?.accessToken;
  const { calculations, loading, refetch } = useCalculations();
  const { remove } = useDeleteCalculation(refetch);

  const sorted = useMemo(
    () =>
      [...calculations].sort(
        (a: Calculation, b: Calculation) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [calculations]
  );

  if (!accessToken) return <AuthRequiredGate feature="the trip calculator" />;
  if (loading) {
    return (
      <div className="ta-shell">
        <div className="ta-header">
          <div className="ta-header-left">
            <button type="button" className="btn-back" onClick={() => navigate("/travel-assistance")}>
              ← Back
            </button>
            <h2>Trip calculator</h2>
          </div>
        </div>
        <p className="ta-loading">Loading…</p>
      </div>
    );
  }

  return (
    <div className="ta-shell">
      <div className="ta-header">
        <div className="ta-header-left">
          <button type="button" className="btn-back" onClick={() => navigate("/travel-assistance")}>
            ← Back
          </button>
          <h2>My calculations</h2>
        </div>
        <div className="ta-actions">
          <button type="button" className="btn-primary" onClick={() => navigate("/travel-assistance/calculation/new")}>
            + New calculation
          </button>
        </div>
      </div>

      <div className="ta-stack">
        {sorted.length === 0 ? (
          <div className="ta-empty-state" style={{ minHeight: 200 }}>
            <div className="ta-empty-icon">🧮</div>
            <p>No saved calculations yet.</p>
            <button type="button" className="btn-primary" onClick={() => navigate("/travel-assistance/calculation/new")}>
              New calculation
            </button>
          </div>
        ) : (
          sorted.map((c: Calculation) => (
            <div
              key={c.id}
              className="ta-stack-card"
              onClick={() => navigate(`/travel-assistance/calculation/${c.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(`/travel-assistance/calculation/${c.id}`);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="ta-stack-card__title">{c.title}</div>
              <p className="ta-stack-card__preview">
                {c.expenses.length > 0
                  ? `${c.expenses
                      .slice(0, 3)
                      .map((e) => `${e.category}: ${e.amount}`)
                      .join(" · ")}${c.expenses.length > 3 ? " …" : ""}`
                  : "No line items yet"}
              </p>
              <div className="ta-stack-card__footer">
                <span className="ta-stack-card__meta">{new Date(c.created_at).toLocaleString()}</span>
                <div className="ta-stack-card__actions">
                  <button
                    type="button"
                    className="ta-btn-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(c.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default MyCalculations;
