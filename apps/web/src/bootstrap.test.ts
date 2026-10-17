/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from "vitest";
import { canHydratePrerender } from "./bootstrap";
import { SCENARIO_STORAGE_KEY } from "./hooks/saved-scenarios";

beforeEach(() => {
  history.replaceState(null, "", "/");
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe("prerender bootstrap", () => {
  function root() {
    const element = document.createElement("div");
    element.dataset.prerender = "done";
    return element;
  }
  it("hydrates the matching default landing snapshot", () => {
    expect(canHydratePrerender(root())).toBe(true);
    expect(canHydratePrerender(document.createElement("div"))).toBe(false);
  });
  it("mounts browser plans, themes and scenarios without hydrating mismatched server HTML", () => {
    history.replaceState(null, "", "#plan=saved");
    expect(canHydratePrerender(root())).toBe(false);
    history.replaceState(null, "", "/");
    document.documentElement.dataset.theme = "dark";
    expect(canHydratePrerender(root())).toBe(false);
    delete document.documentElement.dataset.theme;
    localStorage.setItem(SCENARIO_STORAGE_KEY, '[{"name":"Baseline"}]');
    expect(canHydratePrerender(root())).toBe(false);
    localStorage.setItem(SCENARIO_STORAGE_KEY, "[]");
    expect(canHydratePrerender(root())).toBe(true);
  });
});
