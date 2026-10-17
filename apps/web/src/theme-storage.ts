/** Browser theme. `dcf-theme` is the previous key and is copied once. */
export const THEME_KEY = "cayfore-theme";
const LEGACY_THEME_KEY = "dcf-theme";

export function readStoredTheme(): "dark" | "light" | null {
  try {
    const current = localStorage.getItem(THEME_KEY);
    if (current === "dark" || current === "light") {
      localStorage.removeItem(LEGACY_THEME_KEY);
      return current;
    }
    const legacy = localStorage.getItem(LEGACY_THEME_KEY);
    if (legacy === "dark" || legacy === "light") {
      localStorage.setItem(THEME_KEY, legacy);
      localStorage.removeItem(LEGACY_THEME_KEY);
      return legacy;
    }
    localStorage.removeItem(LEGACY_THEME_KEY);
  } catch {
    return null;
  }
  return null;
}

export function storeTheme(theme: "dark" | "light"): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
    localStorage.removeItem(LEGACY_THEME_KEY);
  } catch {
    /* storage can be blocked */
  }
}
