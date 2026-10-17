import { blankPortfolio, type UsageForecast } from "@cayfore/engine";
import { expect, it } from "vitest";
import { planStartingIn } from "./forecast-start";

it("retains a dated fit but explicitly resets an undated legacy model without mutating its source", () => {
  const fit: UsageForecast = {
    method: "log-linear",
    mape: null,
    holdout: 0,
    monthlyGrowth: 0.03,
    ratios: Array.from({ length: 12 }, () => ({ low: 0.9, expected: 1, high: 1.1 })),
  };
  const portfolio = {
    ...blankPortfolio(),
    usage: {
      source: "system-billing" as const,
      selectedMonth: "2026-09",
      costBasis: "list",
      currency: "USD" as const,
      observedMonths: [],
      observedUnit: "usd" as const,
      coverage: { usedRows: 1, skippedRows: 0, pricedRows: 1, unpricedRows: 0 },
      warnings: [],
      forecast: fit,
    },
  };
  const legacy = planStartingIn(portfolio, "2027-01");
  expect(legacy.resetLegacyFit).toBe(true);
  expect(legacy.portfolio.usage?.forecast).toBeUndefined();
  expect(portfolio.usage.forecast).toBe(fit);
  portfolio.usage.forecast = { ...fit, originPeriod: "2026-10" };
  const dated = planStartingIn(portfolio, "2027-01");
  expect(dated.resetLegacyFit).toBe(false);
  expect(dated.portfolio.usage?.forecast?.originPeriod).toBe("2026-10");
});
