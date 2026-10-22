import { blankPortfolio, defaultPlan } from "@cayfore/engine";
import { afterEach, expect, it, vi } from "vitest";
import { browserFetcher } from "../services/browser-ports";
import type { SessionControls } from "./session-controls";
import { ioActions } from "./session-io-actions";

afterEach(() => vi.restoreAllMocks());

it("loads sample previews through the injected fetcher, clock, and notifier", async () => {
  const browserRead = vi.spyOn(browserFetcher, "getText").mockRejectedValue(new Error("Unexpected browser IO"));
  const controls: SessionControls = {
    plan: defaultPlan(),
    portfolio: blankPortfolio(),
    override: null,
    undo: null,
    selectedId: null,
    notice: "",
    usageError: "",
    usagePreview: null,
    loadRequest: { current: 0 },
    setPlan: vi.fn(),
    setOverride: vi.fn(),
    setUndo: vi.fn(),
    setSelectedId: vi.fn(),
    setNotice: vi.fn(),
    setUsageError: vi.fn(),
    setUsageBusy: vi.fn(),
    setUsageProgress: vi.fn(),
    setUsagePreview: vi.fn(),
    setTheme: vi.fn(),
  };
  const getText = vi
    .fn()
    .mockResolvedValue(
      "usage_date,sku_name,usage_quantity,usage_unit,list_price,cloud\n2026-01-31,JOBS_COMPUTE,100,DBU,0.1,AWS",
    );
  const show = vi.fn();
  const ports = {
    clock: { now: () => 0, today: () => "2026-02-01" },
    clipboard: { writeText: vi.fn() },
    notifier: { show },
    fetcher: { getText },
  };

  ioActions(controls, ports).loadSample("history");

  await vi.waitFor(() => expect(controls.setUsageBusy).toHaveBeenLastCalledWith(false));
  expect(getText).toHaveBeenCalledWith(expect.stringContaining("sample-usage-history.csv"));
  expect(browserRead).not.toHaveBeenCalled();
  expect(controls.setUsagePreview).toHaveBeenCalledWith(
    expect.objectContaining({
      asOf: "2026-02-01",
      selectedMonth: "2026-01",
      sourceLabel: "Bundled historical demonstration sample",
    }),
  );
  expect(show).toHaveBeenCalledWith(expect.objectContaining({ tone: "success", title: "Sample ready to review" }));
});
