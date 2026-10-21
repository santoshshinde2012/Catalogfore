/** @vitest-environment jsdom */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readInitial } from "./forecast-session";
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
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0));
  vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
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

describe("planning controls", () => {
  it("clears import errors and refreshes draft state when resetting an unchanged default plan", () => {
    const initial = session.portfolio;
    act(() => session.loadUsageText("invalid upload"));
    expect(session.usageError).not.toBe("");
    act(() => session.reset());
    expect(session.usageError).toBe("");
    expect(session.portfolio).not.toBe(initial);
    expect(session.portfolio).toEqual(initial);
    expect(session.canUndo).toBe(false);
  });

  it("keeps the existing undo snapshot when resetting an already-default forecast", () => {
    act(() => session.setSpend(5000));
    act(() => session.reset());
    act(() => session.reset());
    act(() => session.undoRemove());
    expect(session.plan.monthlySpend).toBe(5000);
  });

  it("preserves quick controls through calendar and timeline changes, including undo and reload", () => {
    act(() => session.setForecastStart("2027-01"));
    const beforeEvent = structuredClone(session.portfolio);
    const target = session.portfolio.workloads[0].id;
    act(() =>
      session.setEvents([{ id: "launch", name: "Launch", month: "2027-03", workloadId: target, usageMultiplier: 1.5 }]),
    );
    expect(session.usingDetail).toBe(false);
    expect(session.portfolio.simple).toEqual(beforeEvent.simple);
    expect(session.portfolio.workloads).toEqual(beforeEvent.workloads);
    expect(readInitial().override?.events).toEqual(session.portfolio.events);
    act(() => session.undoRemove());
    expect(session.portfolio).toEqual(beforeEvent);
    expect(session.usingDetail).toBe(false);
  });

  it("undoes only the latest planning change and ignores repeated input commits", () => {
    act(() => session.setSpend(5000));
    act(() => session.setBudget(100000));
    const beforeGrowth = structuredClone(session.portfolio);
    act(() => session.setGrowth(0.1));
    act(() => session.setGrowth(0.1));
    act(() => session.setBudget(100000));
    act(() => session.setSpend(5000));
    act(() => session.undoRemove());
    expect(session.portfolio).toEqual(beforeGrowth);
    expect(session.portfolio.budgetAnnual).toBe(100000);
    expect(session.plan.monthlySpend).toBe(5000);
  });

  it("keeps detailed workload edits when calendar settings change and restores the previous start", () => {
    act(() =>
      session.editPortfolio({
        ...session.portfolio,
        workloads: [
          ...session.portfolio.workloads,
          { id: "extra-storage", name: "Data archive", kind: "storage", gbMonth: 1000, managed: true },
        ],
      }),
    );
    const previous = structuredClone(session.portfolio);
    act(() => session.setForecastStart("2027-01"));
    expect(session.usingDetail).toBe(true);
    expect(session.portfolio.workloads).toEqual(previous.workloads);
    act(() => session.undoRemove());
    expect(session.portfolio).toEqual(previous);
  });
});
