/** Move within the planner without replacing its saved URL fragment. */
export function navigateToSection(id: string): void {
  const target = document.getElementById(id);
  if (!target) return;
  target.tabIndex = -1;
  target.focus({ preventScroll: true });
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "start" });
}
