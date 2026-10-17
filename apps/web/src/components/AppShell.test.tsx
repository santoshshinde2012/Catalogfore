/** @vitest-environment jsdom */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { AppShell } from "./AppShell";
import { useSimpleForecast, type SimpleSession } from "../hooks/useSimpleForecast";
import { readInitial } from "../hooks/forecast-session";

vi.mock("./simple/SimplePage", () => ({
  SimplePage: () => (
    <>
      <div id="forecast">Results</div>
      <div id="how-it-works">Explanation</div>
    </>
  ),
}));
vi.mock("./ui/sonner", () => ({ Toaster: () => null }));

it("footer and keyboard skip navigation retain the saved plan and focus the destination", () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0));
  vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
  history.replaceState(null, "", "/");
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  let session: SimpleSession | undefined;
  function Harness() {
    session = useSimpleForecast();
    return <AppShell session={session} />;
  }
  try {
    act(() => root.render(<Harness />));
    act(() => session?.setGrowth(0.1));
    const hash = window.location.hash;
    const anchors = [...host.querySelectorAll<HTMLAnchorElement>('a[href="#forecast"], a[href="#how-it-works"]')];
    expect(anchors).toHaveLength(3);
    for (const anchor of anchors) {
      act(() => anchor.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })));
      expect(window.location.hash).toBe(hash);
      expect(document.activeElement?.id).toBe(anchor.hash.slice(1));
    }
    expect(readInitial().plan.monthlyGrowth).toBe(0.1);
  } finally {
    act(() => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  }
});
