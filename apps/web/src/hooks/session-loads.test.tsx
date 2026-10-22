/** @vitest-environment jsdom */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSimpleForecast, type SimpleSession } from "./useSimpleForecast";
import { sonnerNotifier } from "../services/sonner-notifier";

let root: Root;
let host: HTMLDivElement;
let session: SimpleSession;
function Harness() {
  session = useSimpleForecast();
  return null;
}
function delayedText() {
  let resolve!: (text: string) => void;
  const promise = new Promise<string>((done) => {
    resolve = done;
  });
  const text = vi.fn(() => promise);
  return { resolve, text, file: { size: 100, text } as unknown as File };
}
const csv = "usage_date,sku_name,usage_quantity,usage_unit,list_price,cloud\n2026-09-15,JOBS_COMPUTE,100,DBU,0.1,AWS";

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

describe("pending forecast and usage loads", () => {
  it("does not announce sample success when a successful HTTP response contains no usage", async () => {
    const show = vi.spyOn(sonnerNotifier, "show").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, text: async () => "<html>Missing asset</html>" })),
    );
    try {
      const portfolio = session.portfolio;
      await act(async () => session.loadSample());
      expect(session.usageBusy).toBe(false);
      expect(session.usagePreview).toBeNull();
      expect(session.usageError).not.toBe("");
      expect(session.notice).not.toContain("Sample data loaded");
      expect(show).not.toHaveBeenCalledWith(expect.objectContaining({ title: "Sample ready to review" }));
      expect(session.portfolio).toBe(portfolio);
    } finally {
      show.mockRestore();
    }
  });

  it("keeps the latest saved file when an earlier file finishes afterward", async () => {
    const first = delayedText();
    const oldPortfolio = { ...session.portfolio, name: "First file A" };
    let pending!: Promise<void>;
    await act(async () => {
      pending = session.loadForecastFile(first.file);
    });
    await vi.waitFor(() => expect(first.text).toHaveBeenCalledOnce());
    await act(async () => {
      await session.loadForecastFile({
        size: 100,
        text: async () => JSON.stringify({ ...session.portfolio, name: "Latest file B", budgetAnnual: 2222 }),
      } as File);
    });
    await act(async () => {
      first.resolve(JSON.stringify(oldPortfolio));
      await pending;
    });
    expect(session.portfolio.name).toBe("Latest file B");
    expect(session.portfolio.budgetAnnual).toBe(2222);
    expect(session.notice).toBe("Opened Latest file B.");
  });

  it("does not clear a newer sample's busy state or show an older file error", async () => {
    const first = delayedText();
    const sample = delayedText();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, text: sample.text })),
    );
    await act(async () => session.loadUsageFile(first.file));
    await vi.waitFor(() => expect(first.text).toHaveBeenCalledOnce());
    await act(async () => session.loadSample());
    await act(async () => first.resolve("not,usage\nhello,world"));
    expect(session.usageBusy).toBe(true);
    expect(session.usageError).toBe("");
    expect(session.usagePreview).toBeNull();
    await act(async () => sample.resolve(csv));
    expect(session.usageBusy).toBe(false);
    expect(session.usagePreview?.records).toHaveLength(1);
    expect(session.notice).toContain("Sample data loaded");
  });

  it("does not reopen a delayed sample after opening a saved forecast", async () => {
    const sample = delayedText();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, text: sample.text })),
    );
    await act(async () => session.loadSample());
    await act(async () => {
      await session.loadForecastFile({
        size: 100,
        text: async () => JSON.stringify({ ...session.portfolio, name: "Opened plan" }),
      } as File);
    });
    await act(async () => sample.resolve(csv));
    expect(session.portfolio.name).toBe("Opened plan");
    expect(session.usagePreview).toBeNull();
    expect(session.usageBusy).toBe(false);
    expect(session.notice).toBe("Opened Opened plan.");
  });

  it("keeps a new forecast after a pending saved file finishes", async () => {
    const delayed = delayedText();
    const oldPortfolio = { ...session.portfolio, name: "Cancelled file", budgetAnnual: 1234 };
    let pending!: Promise<void>;
    await act(async () => {
      pending = session.loadForecastFile(delayed.file);
    });
    await vi.waitFor(() => expect(delayed.text).toHaveBeenCalledOnce());
    act(() => session.reset());
    const reset = session.portfolio;
    await act(async () => {
      delayed.resolve(JSON.stringify(oldPortfolio));
      await pending;
    });
    expect(session.portfolio).toEqual(reset);
    expect(session.portfolio.name).not.toBe("Cancelled file");
  });

  it("ignores a pending usage error after loading a saved scenario", async () => {
    act(() => session.saveScenario("Saved scenario"));
    const scenarioId = session.scenarios[0].id;
    const delayed = delayedText();
    await act(async () => session.loadUsageFile(delayed.file));
    await vi.waitFor(() => expect(delayed.text).toHaveBeenCalledOnce());
    act(() => session.loadScenario(scenarioId));
    await act(async () => delayed.resolve("not,usage\nhello,world"));
    expect(session.portfolio.name).toBe("Saved scenario");
    expect(session.usageBusy).toBe(false);
    expect(session.usageError).toBe("");
    expect(session.usagePreview).toBeNull();
  });
});
