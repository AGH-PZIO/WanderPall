(function () {
  "use strict";

  const STORAGE_KEY = "wp-c1-theme";
  const AUTH_KEY = "wp-c1-auth";

  function getPreferredTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    applyTheme(current === "light" ? "dark" : "light");
  }

  function isLoggedIn() {
    return localStorage.getItem(AUTH_KEY) === "true";
  }

  function setLoggedIn(value) {
    localStorage.setItem(AUTH_KEY, value ? "true" : "false");
    updateAuthUI();
  }

  function updateAuthUI() {
    const loginBtn = document.querySelector("[data-auth-login]");
    const logoutBtn = document.querySelector("[data-auth-logout]");
    const accountLink = document.querySelector("[data-auth-account]");

    if (!loginBtn || !logoutBtn) return;

    const loggedIn = isLoggedIn();
    loginBtn.hidden = loggedIn;
    logoutBtn.hidden = !loggedIn;
    if (accountLink) {
      accountLink.style.opacity = loggedIn ? "1" : "0.5";
      accountLink.style.pointerEvents = loggedIn ? "auto" : "none";
    }
  }

  function initAuth() {
    updateAuthUI();

    document.querySelector("[data-auth-login]")?.addEventListener("click", function () {
      setLoggedIn(true);
    });

    document.querySelector("[data-auth-logout]")?.addEventListener("click", function () {
      setLoggedIn(false);
    });
  }

  function initNavGroups() {
    document.querySelectorAll(".nav-group__toggle").forEach(function (toggle) {
      toggle.addEventListener("click", function () {
        const group = toggle.closest(".nav-group");
        const isOpen = group.classList.contains("nav-group--open");
        group.classList.toggle("nav-group--open", !isOpen);
        toggle.setAttribute("aria-expanded", String(!isOpen));
      });
    });
  }

  function initMobileNav() {
    const menuBtn = document.querySelector(".mobile-menu-btn");
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.querySelector(".sidebar-overlay");

    if (!menuBtn || !sidebar) return;

    function openSidebar() {
      sidebar.classList.add("sidebar--open");
      overlay?.classList.add("sidebar-overlay--visible");
    }

    function closeSidebar() {
      sidebar.classList.remove("sidebar--open");
      overlay?.classList.remove("sidebar-overlay--visible");
    }

    menuBtn.addEventListener("click", openSidebar);
    overlay?.addEventListener("click", closeSidebar);

    sidebar.querySelectorAll(".sidebar__link, .nav-group__sub .sidebar__link").forEach(function (link) {
      link.addEventListener("click", closeSidebar);
    });
  }

  applyTheme(getPreferredTheme());

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelector(".topbar__theme")?.addEventListener("click", toggleTheme);
    initAuth();
    initNavGroups();
    initMobileNav();
  });
})();
