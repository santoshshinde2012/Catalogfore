/** @vitest-environment jsdom */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSimpleForecast, type SimpleSession } from "./useSimpleForecast";

let root: Root;
let host: HTMLDivElement;
let session: SimpleSession;

function Harness() {
  session = useSimpleForecast();
  return null;
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  history.replaceState(null, "", "/");
  localStorage.clear();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root.render(<Harness />));
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

describe("reset undo", () => {
  it("restores the spend, name, and notice captured before reset", () => {
    act(() => session.setSpend(80_000));
    act(() => session.setBudget(50_000));
    const annual = session.annual;
    const before = session.captureForecast();
    act(() => session.reset());
    expect(session.plan.monthlySpend).not.toBe(before.plan.monthlySpend);
    act(() => session.restoreForecast(before));
    expect(session.plan.monthlySpend).toBe(before.plan.monthlySpend);
    expect(session.portfolio.name).toBe(before.portfolio.name);
    expect(session.portfolio.budgetAnnual).toBe(50_000);
    expect(session.annual).toBe(annual);
    expect(session.notice).toBe(before.notice);
    expect(session.selectedId).toBe(before.selectedId);
  });
});
