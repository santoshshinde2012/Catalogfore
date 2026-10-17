import { SCENARIO_STORAGE_KEY } from "./hooks/saved-scenarios";

/** The static HTML represents the default light landing page, before browser-specific state. */
export function canHydratePrerender(root: HTMLElement): boolean {
  if (
    !root.hasAttribute("data-prerender") ||
    ["products", "rates"].includes(new URL(window.location.href).searchParams.get("view") ?? "") ||
    window.location.hash ||
    document.documentElement.dataset.theme === "dark"
  ) {
    return false;
  }
  try {
    const scenarios = localStorage.getItem(SCENARIO_STORAGE_KEY);
    return !scenarios || scenarios === "[]";
  } catch {
    return false;
  }
}
