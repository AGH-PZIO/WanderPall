const STORAGE_KEY = "wp-c1-theme";

export function getPreferredTheme(): "light" | "dark" {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyGuestTheme(theme: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEY, theme);
}

export function toggleGuestTheme(): "light" | "dark" {
  const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  const next = current === "light" ? "dark" : "light";
  applyGuestTheme(next);
  return next;
}

export function initTheme() {
  applyGuestTheme(getPreferredTheme());
}
