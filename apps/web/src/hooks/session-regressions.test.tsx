/** @vitest-environment jsdom */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseSavedForecast, projectPortfolio, type Portfolio } from "@cayfore/engine";
import { readInitial } from "./forecast-session";
import { useSimpleForecast, type SimpleSession } from "./useSimpleForecast";

let root: Root;
let host: HTMLDivElement;
let session: SimpleSession;
function Harness() {
  session = useSimpleForecast();
  return null;
}
function mount() {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root.render(<Harness />));
}
function detailed(): Portfolio {
  return {
    ...session.portfolio,
    workloads: [
      ...session.portfolio.workloads,
      { id: "extra-storage", name: "Data archive", kind: "storage", gbMonth: 1000, managed: true },
    ],
  };
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0));
  vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
  history.replaceState(null, "", "/");
  localStorage.clear();
});
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  vi.unstubAllGlobals();
});

describe("forecast session integrity", () => {
  it("preserves detailed workloads through growth, contract, region, cloud and budget edits", () => {
    mount();
    act(() => session.editPortfolio(detailed()));
    const ids = session.portfolio.workloads.map((item) => item.id);
    act(() => session.setGrowth(0.1));
    act(() => session.setCommit(0.25));
    act(() => session.setCloudDiscount(0.15));
    act(() => session.setBudget(150000));
    act(() => session.setCloud("azure"));
    expect(session.portfolio.workloads.map((item) => item.id)).toEqual(ids);
    expect(session.portfolio.commitment).toEqual({ dbuDiscount: 0.25, cloudDiscount: 0.15 });
    expect(session.portfolio.budgetAnnual).toBe(150000);
    expect(session.portfolio.forecast.annualGrowth).toBeCloseTo(1.1 ** 12 - 1);
    expect(session.portfolio.cloud).toBe("azure");
    expect(session.usingDetail).toBe(true);
  });

  it("applies every recommendation exactly as quoted, including both commitment discounts", () => {
    mount();
    const baseline = structuredClone(session.portfolio);
    const ideas = session.recommendations;
    expect(ideas.some((idea) => idea.id === "commit_37_cloud_30")).toBe(true);
    for (const idea of ideas) {
      act(() => session.editPortfolio(structuredClone(baseline)));
      const before = session.annual;
      act(() => session.applyTip(idea.id));
      expect(before - session.annual).toBeCloseTo(idea.annualSavings, 2);
    }
  });

  it("round-trips quick assumptions, budget and contract through the share URL", () => {
    mount();
    act(() => session.setGrowth(0.1));
    act(() => session.setBudget(250000));
    act(() => session.setCloudDiscount(0.2));
    const loaded = readInitial();
    expect(window.location.hash.startsWith("#plan=")).toBe(true);
    expect(loaded.plan.monthlyGrowth).toBe(0.1);
    expect(loaded.override?.budgetAnnual).toBe(250000);
    expect(loaded.override?.commitment.cloudDiscount).toBe(0.2);
    expect(projectPortfolio(loaded.override!).annual).toBe(session.annual);
    expect(session.usingDetail).toBe(false);
  });

  it("saves independent named snapshots, duplicates them, compares and reloads with persistence", () => {
    mount();
    act(() => session.saveScenario("Baseline"));
    const baseline = session.scenarios[0];
    const annual = session.annual;
    act(() => session.setGrowth(0.1));
    act(() => session.duplicateScenario(baseline.id));
    act(() => session.compareScenario(baseline.id));
    expect(projectPortfolio(session.comparison!.portfolio).annual).toBe(annual);
    expect(session.scenarios[1].name).toBe("Baseline copy");
    act(() => session.loadScenario(baseline.id));
    expect(session.annual).toBe(annual);
    act(() => root.unmount());
    host.remove();
    mount();
    expect(session.scenarios.map((item) => item.name)).toEqual(["Baseline", "Baseline copy"]);
    act(() => session.removeScenario(session.scenarios[0].id));
    expect(session.scenarios).toHaveLength(1);
  });
  it("preserves a fitted legacy model when applying a recommendation and undoing a quick reset", () => {
    mount();
    const portfolio = structuredClone(session.portfolio);
    if (!portfolio.simple) throw new Error("Expected quick model");
    portfolio.simple.usageForecast = {
      method: "log-linear",
      mape: null,
      holdout: 0,
      monthlyGrowth: 0.02,
      ratios: Array.from({ length: 12 }, (_, index) => ({ low: 0.9, expected: 1.02 ** (index + 1), high: 1.5 })),
    };
    act(() => session.editPortfolio(portfolio));
    const baseline = session.annual;
    const tip = session.recommendations.find((item) => item.id === "commit_37_cloud_30");
    if (!tip) throw new Error("Expected combined discount recommendation");
    act(() => session.applyTip(tip.id));
    expect(baseline - session.annual).toBeCloseTo(tip.annualSavings, 2);
    const detailed = structuredClone(session.portfolio);
    act(() => session.resetToQuick());
    expect(session.usingDetail).toBe(false);
    act(() => session.undoRemove());
    expect(session.portfolio).toEqual(detailed);
    expect(session.usingDetail).toBe(true);
  });

  it("leaves the active forecast unchanged when opening unrelated JSON", async () => {
    mount();
    act(() => session.setGrowth(0.1));
    const before = session.annual;
    await act(async () => {
      await session.loadForecastFile({ size: 2, text: async () => "{}" } as File);
    });
    expect(session.annual).toBe(before);
    expect(session.notice).toMatch(/forecast|portfolio/i);
  });

  it("keeps a zero budget and supports an explicit declining usage scenario", () => {
    mount();
    act(() => session.setBudget(0));
    act(() => session.setGrowth(-0.1));
    expect(session.portfolio.budgetAnnual).toBe(0);
    expect(session.months[11].expected).toBeLessThan(session.months[0].expected);
  });
  it("reopens an intentional empty portfolio without restoring the default basket", () => {
    mount();
    act(() => session.editPortfolio({ ...session.portfolio, workloads: [] }));
    expect(session.annual).toBe(0);
    const initial = readInitial();
    expect(initial.override?.workloads).toEqual([]);
    expect(initial.override?.name).toBe(session.portfolio.name);
  });
  it("removes orphan timeline targets when deleting a workload and restores both on undo", () => {
    mount();
    const target = session.portfolio.workloads[0].id;
    act(() =>
      session.editPortfolio({
        ...session.portfolio,
        events: [
          { id: "target", name: "Retire workload", month: "2027-01", workloadId: target, usageMultiplier: 0 },
          { id: "global", name: "Global growth", month: "2027-01", usageMultiplier: 1.1 },
        ],
      }),
    );
    act(() => session.removeWorkload(target));
    expect(session.portfolio.events?.map((event) => event.id)).toEqual(["global"]);
    expect(
      parseSavedForecast(
        JSON.parse(JSON.stringify({ format: "cayfore.forecast", version: 1, portfolio: session.portfolio })),
      ).ok,
    ).toBe(true);
    expect(readInitial().override?.workloads.some((workload) => workload.id === target)).toBe(false);
    act(() => session.undoRemove());
    expect(session.portfolio.workloads.some((workload) => workload.id === target)).toBe(true);
    expect(session.portfolio.events?.map((event) => event.id)).toEqual(["target", "global"]);
  });
});
