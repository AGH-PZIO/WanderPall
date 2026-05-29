import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../../modules/account/hooks/useAuth";
import { toggleGuestTheme } from "../theme";
import { Icon } from "../ui/Icon";

type TopbarProps = {
  landing?: boolean;
  onMenuClick?: () => void;
  showMenu?: boolean;
};

export function Topbar({ landing = false, onMenuClick, showMenu = false }: TopbarProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  function handleThemeToggle() {
    toggleGuestTheme();
  }

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  return (
    <header className="topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {showMenu && (
          <button type="button" className="mobile-menu-btn" aria-label="Otwórz menu" onClick={onMenuClick}>
            <Icon name="menu" size="icon-md" />
          </button>
        )}
        <Link to={user ? "/dashboard" : "/"} className="topbar__brand" aria-label="WanderPall">
          <img
            src="/logo/WanderPall-logo_color_full.svg"
            alt=""
            className="topbar__brand-img topbar__brand-img--full"
            aria-hidden="true"
          />
          <img
            src="/logo/WanderPall-logo_color.svg"
            alt="WanderPall"
            className="topbar__brand-img topbar__brand-img--mark"
          />
        </Link>
      </div>

      <div className="topbar__actions">
        <button type="button" className="topbar__theme" aria-label="Przełącz motyw" onClick={handleThemeToggle}>
          <Icon name="sun" size="icon-sm" className="icon-sun" />
          <Icon name="moon" size="icon-sm" className="icon-moon" />
        </button>

        {user ? (
          <>
            <button type="button" className="topbar__link topbar__link--with-icon" onClick={handleSignOut}>
              <Icon name="log-out" />
              <span>Wyloguj</span>
            </button>
            <Link to="/account/profile" className="topbar__link topbar__link--with-icon topbar__link--hide-mobile">
              <Icon name="user" />
              <span>Konto</span>
            </Link>
          </>
        ) : (
          <>
            {!landing && (
              <Link to="/login" className="topbar__link topbar__link--with-icon">
                <Icon name="log-in" />
                <span>Zaloguj</span>
              </Link>
            )}
            {landing && (
              <Link to="/login" className="topbar__link topbar__link--with-icon">
                <Icon name="log-in" />
                <span>Zaloguj</span>
              </Link>
            )}
          </>
        )}
      </div>
    </header>
  );
}
