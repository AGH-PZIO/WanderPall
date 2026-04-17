import { Routes, Route, useNavigate } from "react-router-dom";

import { AuthProvider, useAuth } from "../hooks/useAuth";
import { HomePage } from "../pages/HomePage";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { ProfilePage } from "../pages/ProfilePage";
import { PasswordResetPage } from "../pages/PasswordResetPage";
import { PasswordResetConfirmPage } from "../pages/PasswordResetConfirmPage";
import { ThemePage } from "../pages/ThemePage";
import { DeleteAccountPage } from "../pages/DeleteAccountPage";
import "./account.css";

function AccountTopbar({ onClose }: { onClose: () => void }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/account");
  }

  return (
    <div className="acc-topbar">
      <span className="acc-topbar-title">WanderPall · Account</span>
      <div className="acc-topbar-right">
        {user && (
          <>
            <span className="acc-topbar-user">{user.email}</span>
            <button className="acc-btn-secondary" type="button" onClick={handleSignOut}>
              Sign out
            </button>
          </>
        )}
        <button onClick={onClose} className="btn-close" aria-label="Close">✕</button>
      </div>
    </div>
  );
}

function AccountContent({ onClose }: { onClose: () => void }) {
  return (
    <div className="acc-full-page">
      <AccountTopbar onClose={onClose} />
      <div className="acc-page-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/password-reset" element={<PasswordResetPage />} />
          <Route path="/password-reset/confirm" element={<PasswordResetConfirmPage />} />
          <Route path="/theme" element={<ThemePage />} />
          <Route path="/delete" element={<DeleteAccountPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </div>
    </div>
  );
}

export function AccountPage({ onClose }: { onClose: () => void }) {
  return (
    <AuthProvider>
      <AccountContent onClose={onClose} />
    </AuthProvider>
  );
}
