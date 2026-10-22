/** @vitest-environment jsdom */
import { buildUnitCostCatalog, type UnitCostRow } from "@cayfore/engine/unit-costs";
import { act, useDeferredValue } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { browserScheduler } from "../../services/browser-ports";
import { TooltipProvider } from "../ui/tooltip";
import { RateDownloads } from "./RateDownloads";

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useDeferredValue: vi.fn(),
}));

it("waits for current scope rows before enabling rate exports", () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const catalog = buildUnitCostCatalog();
  const previousRows = catalog.rows.slice(0, 1);
  const rows = catalog.rows.slice(0, 501);
  const deferred = vi.mocked(useDeferredValue<UnitCostRow[]>);
  deferred.mockReturnValue(previousRows);
  const schedule = vi.spyOn(browserScheduler, "frame").mockReturnValue(1);
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const render = () =>
    root.render(
      <TooltipProvider>
        <RateDownloads
          catalog={catalog}
          rows={rows}
          draft={{ scope: "filtered", scopeKey: "new", sort: null, page: 0, pageSize: 25 }}
          onDraft={vi.fn()}
          filterKey="new"
        />
      </TooltipProvider>,
    );
  try {
    act(render);
    const buttons = [...host.querySelectorAll<HTMLButtonElement>('[aria-label="Export format"] button')];
    expect(buttons).toHaveLength(2);
    expect(buttons.every((button) => button.disabled)).toBe(true);
    act(() => buttons.forEach((button) => button.click()));
    expect(schedule).not.toHaveBeenCalled();

    deferred.mockReturnValue(rows);
    act(render);
    expect(buttons.every((button) => !button.disabled)).toBe(true);
    expect(host.querySelectorAll("tbody tr")).toHaveLength(25);
  } finally {
    act(() => root.unmount());
    host.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  }
});
