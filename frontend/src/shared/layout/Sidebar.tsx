import { useState } from "react";
import { NavLink } from "react-router-dom";

import { Icon } from "../ui/Icon";
import type { IconName } from "../ui/icons";

type NavItem = {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
};

const MAIN_NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: "home", end: true },
  { to: "/trips", label: "Trips", icon: "map-pin", end: false },
  { to: "/groups", label: "Groups", icon: "users", end: false },
  { to: "/guides", label: "Guides", icon: "book", end: false },
  { to: "/journal", label: "Journal", icon: "pen-line", end: false }
];

const TOOL_LINKS: NavItem[] = [
  { to: "/tools/calculator", label: "Kalkulator", icon: "calculator", end: true },
  { to: "/tools/translator", label: "Tłumacz", icon: "languages", end: true },
  { to: "/tools/calendar", label: "Kalendarz", icon: "calendar", end: true }
];

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

export function Sidebar({ open, onClose }: SidebarProps) {
  const [toolsOpen, setToolsOpen] = useState(false);

  return (
    <>
      <div
        className={`sidebar-overlay${open ? " sidebar-overlay--visible" : ""}`}
        aria-hidden="true"
        onClick={onClose}
      />

      <aside className={`sidebar${open ? " sidebar--open" : ""}`} aria-label="Nawigacja główna">
        <nav className="sidebar__nav">
          {MAIN_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `sidebar__link${isActive ? " sidebar__link--active" : ""}`}
              onClick={onClose}
            >
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}

          <div className={`nav-group${toolsOpen ? " nav-group--open" : ""}`}>
            <button
              type="button"
              className="nav-group__toggle"
              aria-expanded={toolsOpen}
              onClick={() => setToolsOpen((prev) => !prev)}
            >
              <Icon name="wrench" />
              Narzędzia
              <Icon name="chevron-down" className="nav-group__chevron" />
            </button>
            <div className="nav-group__sub">
              {TOOL_LINKS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `sidebar__link${isActive ? " sidebar__link--active" : ""}`}
                  onClick={onClose}
                >
                  <Icon name={item.icon} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>

          <NavLink
            to="/account"
            end
            className={({ isActive }) => `sidebar__link${isActive ? " sidebar__link--active" : ""}`}
            onClick={onClose}
          >
            <Icon name="user" />
            Account
          </NavLink>
        </nav>
      </aside>
    </>
  );
}
