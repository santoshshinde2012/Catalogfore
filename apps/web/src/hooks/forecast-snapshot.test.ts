import { defaultPlan, projectSimple, type Portfolio, type SimplePlan, type UsageImportPreview } from "@cayfore/engine";
import { describe, expect, it, vi } from "vitest";
import { captureForecast, restoreForecast } from "./forecast-snapshot";
import type { SessionControls } from "./session-controls";

function controls(plan: SimplePlan, override: Portfolio | null): SessionControls {
  const state = {
    plan,
    portfolio: override ?? projectSimple(plan).portfolio,
    override,
    undo: null as Portfolio | null,
    selectedId: "job-1",
    notice: "Saved note",
    usageError: "",
    usagePreview: { records: [{}] } as unknown as UsageImportPreview,
  };
  return {
    ...state,
    loadRequest: { current: 3 },
    setPlan: vi.fn((next) => {
      state.plan = typeof next === "function" ? next(state.plan) : next;
    }),
    setOverride: vi.fn((next) => {
      state.override = next;
    }),
    setUndo: vi.fn((next) => {
      state.undo = next;
    }),
    setSelectedId: vi.fn(),
    setNotice: vi.fn(),
    setUsageError: vi.fn(),
    setUsageBusy: vi.fn(),
    setUsageProgress: vi.fn(),
    setUsagePreview: vi.fn(),
    setTheme: vi.fn(),
    get plan() {
      return state.plan;
    },
    get portfolio() {
      return state.portfolio;
    },
    get override() {
      return state.override;
    },
    get undo() {
      return state.undo;
    },
    get selectedId() {
      return state.selectedId;
    },
    get notice() {
      return state.notice;
    },
    get usageError() {
      return state.usageError;
    },
    get usagePreview() {
      return state.usagePreview;
    },
  };
}

describe("forecast snapshots", () => {
  it("writes the captured plan, undo stack, and usage preview back", () => {
    const plan = defaultPlan();
    const current = controls(plan, null);
    const snapshot = captureForecast(current);
    snapshot.plan.monthlySpend += 25;
    restoreForecast(current, snapshot);
    expect(current.loadRequest.current).toBe(4);
    expect(current.setPlan).toHaveBeenCalledWith(snapshot.plan);
    expect(current.setOverride).toHaveBeenCalledWith(snapshot.portfolio);
    expect(current.setUndo).toHaveBeenCalledWith(null);
    expect(current.setSelectedId).toHaveBeenCalledWith("job-1");
    expect(current.setUsagePreview).toHaveBeenCalledWith(snapshot.usagePreview);
    expect(current.setNotice).toHaveBeenCalledWith("Saved note");
    expect(current.setUsageBusy).toHaveBeenCalledWith(false);
    expect(current.setUsageProgress).toHaveBeenCalledWith(null);
  });

  it("keeps an explicit override instead of the derived portfolio", () => {
    const plan = defaultPlan();
    const override = projectSimple(plan).portfolio;
    override.name = "Pinned";
    const current = controls(plan, override);
    const snapshot = captureForecast(current);
    restoreForecast(current, snapshot);
    expect(current.setOverride).toHaveBeenCalledWith(override);
  });
});
