import { useNavigate } from "react-router-dom";
import "./travel-assistance.css";

export type AuthRequiredGateProps = {
  /** Short label for the feature, e.g. "Calendar" → "Sign in to use Calendar". */
  feature: string;
  /** Optional extra line under the title. */
  hint?: string;
};

export function AuthRequiredGate({ feature, hint }: AuthRequiredGateProps) {
  const navigate = useNavigate();

  return (
    <div className="ta-auth-gate" role="region" aria-labelledby="ta-auth-gate-heading">
      <div className="ta-auth-gate-card">
        <div className="ta-auth-gate-icon" aria-hidden>
          🔐
        </div>
        <h2 id="ta-auth-gate-heading" className="ta-auth-gate-title">
          Sign in to use {feature}
        </h2>
        <p className="ta-auth-gate-text">
          {hint ??
            "You need an active session to open this area. Sign in with your WanderPall account, then come back here."}
        </p>
        <div className="ta-auth-gate-actions">
          <button type="button" className="btn-primary" onClick={() => navigate("/account/login")}>
            Sign in
          </button>
          <button type="button" className="ta-auth-gate-back" onClick={() => navigate("/travel-assistance")}>
            ← Back to Travel assistance
          </button>
        </div>
      </div>
    </div>
  );
}
