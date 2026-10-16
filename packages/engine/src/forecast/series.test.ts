import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { usageHistory } from "../usage.js";
import { fitUsageForecast } from "./series.js";

describe("usage forecast", () => {
  it("fits a rising seasonal year and backtests the synthetic history", () => {
    const text = readFileSync(new URL("../../../../apps/web/public/sample-usage-history.csv", import.meta.url), "utf8");
    const history = usageHistory(text);
    expect(history.unit).toBe("usd");
    expect(history.months.length).toBeGreaterThanOrEqual(18);
    const fitted = fitUsageForecast(history);
    expect(fitted?.method).toBe("log-linear-seasonal");
    expect(fitted?.ratios).toHaveLength(12);
    expect(fitted?.mape).not.toBeNull();
    expect(fitted?.mape ?? 1).toBeLessThan(0.08);
    expect(fitted?.ratios[0].low).toBeLessThan(fitted?.ratios[0].expected ?? 0);
    expect(fitted?.ratios[0].high).toBeGreaterThan(fitted?.ratios[0].expected ?? 0);
  });

  it("uses Holt-Winters once two full seasons exist", () => {
    const months = Array.from({ length: 24 }, (_, index) => ({
      period: period(index),
      amount: 1000 * (1 + (index % 12) / 20),
    }));
    const fitted = fitUsageForecast({ months, days: [] });
    expect(fitted?.method).toBe("holt-winters");
    expect(fitted?.ratios).toHaveLength(12);
  });

  it("does not invent a model from a single month", () => {
    expect(fitUsageForecast({ months: [{ period: "2026-09", amount: 100 }], days: [] })).toBeNull();
  });

  it("keeps a flat series near a ratio of one", () => {
    const months = Array.from({ length: 8 }, (_, index) => ({ period: period(index), amount: 500 }));
    const fitted = fitUsageForecast({ months, days: [] });
    expect(fitted?.method).toBe("log-linear");
    expect(fitted?.ratios[0].expected).toBeGreaterThan(0.9);
    expect(fitted?.ratios[0].expected).toBeLessThan(1.1);
  });
});

function period(index: number): string {
  const date = new Date(Date.UTC(2024, index, 1));
  return date.toISOString().slice(0, 7);
}
