/** @vitest-environment jsdom */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { readAppView, useAppView } from "./useAppView";

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  history.replaceState(null, "", "/cayfore/");
});
afterEach(() => vi.unstubAllGlobals());

it("recognizes a direct product-map URL and treats unknown views as the planner", () => {
  history.replaceState(null, "", "?view=products#plan=encoded");
  expect(readAppView()).toBe("products");
  history.replaceState(null, "", "?view=other#plan=encoded");
  expect(readAppView()).toBe("planner");
});

it("preserves the plan and other query parameters through view changes and history navigation", () => {
  history.replaceState(null, "", "?campaign=team#plan=encoded");
  const push = vi.spyOn(history, "pushState");
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  let current: ReturnType<typeof useAppView> | undefined;
  function Harness() {
    current = useAppView();
    return <p>{current.view}</p>;
  }
  try {
    act(() => root.render(<Harness />));
    act(() => current?.navigate("products"));
    expect(host.textContent).toBe("products");
    expect(window.location.search).toBe("?campaign=team&view=products");
    expect(window.location.hash).toBe("#plan=encoded");
    act(() => current?.navigate("products"));
    expect(push).toHaveBeenCalledTimes(1);

    act(() => {
      history.replaceState(null, "", "?campaign=team#plan=changed");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(host.textContent).toBe("planner");
    act(() => current?.navigate("products"));
    expect(window.location.hash).toBe("#plan=changed");
    act(() => current?.navigate("planner"));
    expect(window.location.search).toBe("?campaign=team");
    expect(window.location.hash).toBe("#plan=changed");
  } finally {
    act(() => root.unmount());
    host.remove();
    push.mockRestore();
  }
});
