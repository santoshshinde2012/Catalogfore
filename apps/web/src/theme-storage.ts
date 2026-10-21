import { browserStore } from "./services/browser-ports";
import type { KeyValueStore } from "./services/ports";

/** Browser theme. `dcf-theme` is the previous key and is copied once. */
export const THEME_KEY = "cayfore-theme";
const LEGACY_THEME_KEY = "dcf-theme";

export function readStoredTheme(store: KeyValueStore = browserStore): "dark" | "light" | null {
  try {
    const current = store.get(THEME_KEY);
    if (current === "dark" || current === "light") {
      store.remove(LEGACY_THEME_KEY);
      return current;
    }
    const legacy = store.get(LEGACY_THEME_KEY);
    if (legacy === "dark" || legacy === "light") {
      store.set(THEME_KEY, legacy);
      store.remove(LEGACY_THEME_KEY);
      return legacy;
    }
    store.remove(LEGACY_THEME_KEY);
  } catch {
    return null;
  }
  return null;
}

export function storeTheme(theme: "dark" | "light", store: KeyValueStore = browserStore): void {
  try {
    store.set(THEME_KEY, theme);
    store.remove(LEGACY_THEME_KEY);
  } catch {
    /* storage can be blocked */
  }
}
