/** Move within the planner without replacing its saved URL fragment. */
export function navigateToSection(id: string): void {
  const target = document.getElementById(id);
  if (!target) return;
  target.tabIndex = -1;
  target.focus({ preventScroll: true });
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  // A page heading can have a return action and source context above it.
  // Keep that whole introduction visible when entering a workspace.
  const start = target.tagName === "H1" ? (target.closest("article") ?? target) : target;
  start.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "start" });
}
