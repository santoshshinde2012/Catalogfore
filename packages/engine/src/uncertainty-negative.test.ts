import { describe, expect, it } from "vitest";
import { estimate } from "./estimate.js";
import { forecast } from "./forecast.js";
import { blankPortfolio } from "./portfolio.js";
import { projectPortfolio } from "./projection.js";
import { rollForward, spreadPercent } from "./simple/roll-forward.js";
import type { Portfolio } from "./types.js";

function creditPortfolio(): Portfolio {
  return {
    ...blankPortfolio(),
    forecast: { months: 12, annualGrowth: 0, seasonality: "flat", startMonth: "2026-10" },
    workloads: [
      {
        id: "credit",
        name: "Recurring source credit",
        kind: "metered",
        sku: "managed_services",
        dbuPerMonth: -100,
        fixedUsdByCloud: { aws: -100 },
        rateProvenance: { kind: "imported", currency: "USD", label: "Source adjustment", basis: "billed" },
      },
    ],
  };
}

describe("signed credit uncertainty", () => {
  it("orders the usage-model and combined bounds and reports the nonzero relative range", () => {
    const portfolio = creditPortfolio();
    portfolio.usage = {
      source: "system-billing",
      selectedMonth: "2026-09",
      costBasis: "billed",
      currency: "USD",
      observedUnit: "usd",
      observedMonths: [{ period: "2026-09", amount: -100 }],
      warnings: [],
      coverage: { pricedRows: 1, unpricedRows: 0, usedRows: 1, skippedRows: 0 },
      forecast: {
        method: "log-linear",
        mape: null,
        holdout: 0,
        monthlyGrowth: 0,
        originPeriod: "2026-10",
        ratios: Array.from({ length: 12 }, () => ({ low: 0.8, expected: 1, high: 1.2 })),
      },
    };
    const result = projectPortfolio(portfolio);
    expect(result.predictionMonths?.[0]).toEqual({ month: 1, low: -120, expected: -100, high: -80 });
    expect(result.months[0]).toEqual({ month: 1, low: -127.2, expected: -100, high: -76 });
    expect(result.band).toMatchObject({ low: -1526.4, expected: -1200, high: -912 });
    expect(result.spreadPercent).toBe(27);
    expect(result.assumptions.join(" ")).toContain("net credit");
  });

  it("orders legacy roll-forward monthly and annual ranges for credits", () => {
    const portfolio = creditPortfolio();
    const priced = estimate(portfolio);
    const result = rollForward(portfolio, priced, forecast(priced, portfolio.forecast));
    expect(result.months[0]).toEqual({ month: 1, low: -120, expected: -100, high: -85 });
    expect(result.band).toMatchObject({ low: -1440, expected: -1200, high: -1020 });
    expect(result.spreadPercent).toBe(20);
    expect(spreadPercent({ low: 0, expected: 0, high: 0, calibrated: false, reasons: [] })).toBe(0);
  });
});
