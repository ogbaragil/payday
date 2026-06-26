// Light/dark theme, persisted on the device. Dark is the chalkboard (default),
// light is the whiteboard. The initial value is applied in index.html before
// paint; this module is what the in-app toggle uses to flip and remember it.
const KEY = "safespend-theme";
const THEME_COLOR = { dark: "#0b0b0c", light: "#f4f6f9" };

export function getTheme() {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function applyTheme(theme) {
  const t = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = t;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", THEME_COLOR[t]);
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* storage unavailable — theme just won't persist */
  }
  return t;
}

export function toggleTheme() {
  return applyTheme(getTheme() === "light" ? "dark" : "light");
}
