/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { connectionStep, recoveryActions, recoveryCopy } from "./connection";
import { activeBusyLabel, BUSY_LABEL, exportBusy, LARGE_TABLE_ROWS, tableIsSettling } from "./export-busy";
import { noticeAction, notices } from "./notices";
import { createPrefetch, idlePrefetchTargets, navigationPrefetch, type PrefetchTarget } from "./prefetch-plan";
import { rateExportJobs } from "./rate-exports";
import { skeletonIds, skeletonLayouts } from "./skeleton-layouts";
import { isTextEntry, matchingShortcut, shortcuts } from "./shortcuts";
import { usageReadMarks, usageSamples } from "./usage-samples";

describe("notice registry", () => {
  it("gives undo priority and keeps export titles stable", () => {
    const undo = vi.fn();
    const view = vi.fn();
    const reset = notices.forecastReset(undo);
    expect(noticeAction(reset)).toEqual({ label: "Undo", run: undo });
    expect(noticeAction(notices.forecastUpdated("Jobs", view))?.label).toBe("View forecast");
    expect(notices.usageImported("replace", undo).title).toBe("Usage imported");
    expect(notices.usageImported("append", undo).title).toBe("Usage appended");
    expect(notices.exportReady("CSV").title).toBe("CSV downloaded");
    expect(notices.problem("Try again").tone).toBe("error");
    expect(notices.linkCopied().title).toBe("Link copied");
    expect(notices.backOnline().title).toBe("Back online");
  });
});

describe("shortcut registry", () => {
  it("matches Alt chords and question mark, and stays quiet while typing", () => {
    const plan = new KeyboardEvent("keydown", { key: "1", altKey: true });
    expect(matchingShortcut(plan)?.action).toBe("plan");
    const help = new KeyboardEvent("keydown", { key: "?" });
    expect(matchingShortcut(help)?.action).toBe("help");
    expect(matchingShortcut(new KeyboardEvent("keydown", { key: "1" }))).toBeUndefined();
    expect(matchingShortcut(new KeyboardEvent("keydown", { key: "1", altKey: true, shiftKey: true }))).toBeUndefined();
    const composing = new KeyboardEvent("keydown", { key: "?", isComposing: true });
    expect(matchingShortcut(composing)).toBeUndefined();
    expect(shortcuts.map((item) => item.keys)).toEqual(["Alt+1", "Alt+2", "Alt+3", "Alt+4", "?"]);
  });

  it("treats fields and text boxes as typing", () => {
    for (const tag of ["input", "textarea", "select"]) {
      const field = document.createElement(tag);
      expect(isTextEntry(field)).toBe(true);
    }
    const box = document.createElement("div");
    box.setAttribute("role", "textbox");
    expect(isTextEntry(box)).toBe(true);
    const editable = document.createElement("div");
    editable.contentEditable = "true";
    expect(isTextEntry(editable)).toBe(true);
    expect(isTextEntry(document.createElement("button"))).toBe(false);
  });
});

describe("prefetch plan", () => {
  it("warms each target once, ignores unknown navigation, and limits idle work", async () => {
    const calls: PrefetchTarget[] = [];
    const loaders = Object.fromEntries(
      (["products", "rates", "advanced", "chart", "composition"] as const).map((id) => [
        id,
        () => {
          calls.push(id);
          return id === "chart" ? Promise.reject(new Error("offline")) : Promise.resolve(id);
        },
      ]),
    ) as Record<PrefetchTarget, () => Promise<unknown>>;
    let idle: (() => void) | undefined;
    const prefetch = createPrefetch(loaders, {
      idle: (task) => {
        idle = task;
        return () => {
          idle = undefined;
        };
      },
    });
    prefetch.warm("products");
    prefetch.warm("products");
    prefetch.warmNavigation("missing");
    prefetch.warmNavigation("inputs");
    const cancel = prefetch.warmIdle();
    idle?.();
    cancel();
    expect(idle).toBeUndefined();
    await Promise.resolve();
    expect(calls.filter((id) => id === "products")).toHaveLength(1);
    expect(calls).toEqual(expect.arrayContaining(["products", "chart", ...idlePrefetchTargets]));
    expect(calls).not.toContain("rates");
    expect(navigationPrefetch.inputs).toBe("chart");
  });
});

describe("export and skeleton registries", () => {
  it("describes busy exports without renaming idle ones", () => {
    const jobs = [
      { id: "csv", label: "CSV" },
      { id: "xlsx", label: "XLSX", busyLabel: "Preparing Excel…" },
    ];
    expect(exportBusy("", jobs[0])).toEqual({ active: false, disabled: false, label: "CSV" });
    expect(exportBusy("xlsx", jobs[0]).disabled).toBe(true);
    expect(exportBusy("csv", jobs[0]).label).toBe(BUSY_LABEL);
    expect(activeBusyLabel(jobs, "xlsx")).toBe("Preparing Excel…");
    expect(activeBusyLabel(jobs, "")).toBe("");
    expect(tableIsSettling(LARGE_TABLE_ROWS, false)).toBe(false);
    expect(tableIsSettling(LARGE_TABLE_ROWS + 1, false)).toBe(true);
    expect(tableIsSettling(LARGE_TABLE_ROWS + 1, true)).toBe(false);
    expect(rateExportJobs.map((job) => job.id)).toEqual(["csv", "json"]);
  });

  it("keeps skeleton heights aligned with the screens they replace", () => {
    expect(skeletonLayouts.chart.className).toContain("h-60");
    expect(skeletonLayouts.chart.className).toContain("lg:h-48");
    expect(skeletonLayouts.rates.nested).toBe("rates-table");
    for (const id of skeletonIds) expect(skeletonLayouts[id].label.length).toBeGreaterThan(0);
    expect(recoveryActions.map((action) => action.label)).toEqual(["Try again", "Reload view", "Return to plan"]);
  });
});

describe("connection and usage marks", () => {
  it("announces only the offline to online edge", () => {
    expect(connectionStep(false, true)).toEqual({ offline: false, announce: false });
    expect(connectionStep(true, false)).toEqual({ offline: true, announce: false });
    expect(connectionStep(true, true)).toEqual({ offline: false, announce: true });
    expect(recoveryCopy(true)).toContain("offline");
    expect(recoveryCopy(false)).toContain("Try again");
    expect(usageSamples.history.href).toBe("sample-usage-history.csv");
    expect(usageReadMarks.done).toBe(1);
  });
});
