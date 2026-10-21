/** @vitest-environment jsdom */
import { blankPortfolio } from "@cayfore/engine";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SCENARIO_STORAGE_KEY, useSavedScenarios } from "./saved-scenarios";

let root: Root;
let host: HTMLDivElement;
let saved: ReturnType<typeof useSavedScenarios>;
const load = vi.fn();
const notice = vi.fn();
function Harness() {
  saved = useSavedScenarios(blankPortfolio(), load, notice);
  return null;
}
function save(...names: string[]) {
  for (const name of names) act(() => saved.saveScenario(name));
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
  load.mockClear();
  notice.mockClear();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root.render(<Harness />));
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("saved scenario recovery", () => {
  it("keeps failed saves in memory and persists all of them when browser storage recovers", () => {
    const blocked = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });
    save("Session baseline");
    expect(saved.scenarios.map((item) => item.name)).toEqual(["Session baseline"]);
    expect(saved.scenarioStorageAvailable).toBe(false);
    expect(localStorage.getItem(SCENARIO_STORAGE_KEY)).toBeNull();
    expect(notice).toHaveBeenCalledWith(expect.stringContaining("Browser storage is unavailable"));
    blocked.mockRestore();
    save("Recovered scenario");
    expect(saved.scenarioStorageAvailable).toBe(true);
    expect(JSON.parse(localStorage.getItem(SCENARIO_STORAGE_KEY)!)).toEqual(saved.scenarios);
    expect(saved.scenarios.map((item) => item.name)).toEqual(["Session baseline", "Recovered scenario"]);
  });

  it("undoes deletion in its original position, restores comparison, and retains later saves", () => {
    save("Baseline", "Compare me", "Alternative");
    const removed = saved.scenarios[1];
    act(() => saved.compareScenario(removed.id));
    act(() => saved.removeScenario(removed.id));
    expect(saved.comparison).toBeNull();
    expect(saved.canUndoScenarioDelete).toBe(true);
    save("Later plan");
    act(() => saved.undoScenarioDelete());
    expect(saved.scenarios.map((item) => item.name)).toEqual(["Baseline", "Compare me", "Alternative", "Later plan"]);
    expect(saved.scenarios[1]).toEqual(removed);
    expect(saved.comparison).toEqual(removed);
    expect(saved.canUndoScenarioDelete).toBe(false);
    expect(JSON.parse(localStorage.getItem(SCENARIO_STORAGE_KEY)!)).toEqual(saved.scenarios);
  });

  it("preserves a comparison selected after deletion when restoring the removed scenario", () => {
    save("Baseline", "Alternative");
    const [baseline, alternative] = saved.scenarios;
    act(() => saved.compareScenario(baseline.id));
    act(() => saved.removeScenario(baseline.id));
    act(() => saved.compareScenario(alternative.id));
    act(() => saved.undoScenarioDelete());
    expect(saved.comparison?.id).toBe(alternative.id);
    expect(saved.scenarios.map((item) => item.id)).toEqual([baseline.id, alternative.id]);
  });

  it("ignores unknown IDs without writing storage or replacing the existing deletion undo", () => {
    save("Baseline", "Keep me");
    const [removed, remaining] = saved.scenarios;
    act(() => saved.removeScenario(removed.id));
    act(() => saved.compareScenario(remaining.id));
    const writes = vi.spyOn(Storage.prototype, "setItem");
    act(() => {
      saved.removeScenario("missing");
      saved.loadScenario("missing");
      saved.duplicateScenario("missing");
    });
    expect(writes).not.toHaveBeenCalled();
    expect(load).not.toHaveBeenCalled();
    expect(saved.scenarios).toEqual([remaining]);
    expect(saved.comparison).toEqual(remaining);
    expect(saved.canUndoScenarioDelete).toBe(true);
    act(() => saved.undoScenarioDelete());
    expect(saved.scenarios).toEqual([removed, remaining]);
  });
});
