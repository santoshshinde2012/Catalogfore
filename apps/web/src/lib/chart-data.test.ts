import { describe, expect, it } from "vitest";
import { budgetPosition, compositionRows, cumulativeRows, monthlyRows, periodAt } from "./chart-data";

const months = [
  { month: 1, low: 80, expected: 100, high: 120 },
  { month: 2, low: 160, expected: 200, high: 240 },
];
describe("financial chart series", () => {
  it("separates observed history and matches comparisons by calendar month", () => {
    const rows = monthlyRows({
      months,
      startMonth: "2026-12",
      history: [
        { period: "2026-11", amount: 90 },
        { period: "2026-12", amount: 1 },
      ],
      budgetAnnual: 1200,
      comparison: { name: "Earlier", startMonth: "2026-11", months },
    });
    expect(rows.map((row) => row.period)).toEqual(["2026-11", "2026-12", "2027-01"]);
    expect(rows[0]).toMatchObject({ actual: 90, comparison: 100 });
    expect(rows[0].expected).toBeUndefined();
    expect(rows[1]).toMatchObject({ expected: 100, comparison: 200, budget: 100 });
    expect(rows[1].actual).toBeUndefined();
  });
  it("reconciles cumulative totals and explicitly phases a budget equally", () => {
    const rows = cumulativeRows({ months, startMonth: "2026-12", budgetAnnual: 1200 });
    expect(rows[1]).toMatchObject({ expected: 300, band: [240, 360], budget: 200 });
    expect(budgetPosition(months, 1200)).toEqual({ forecast: 300, delta: -900, firstOver: 2 });
    expect(periodAt("2026-12", 1)).toBe("2027-01");
  });
  it("keeps canonical cost components without inventing machine charges", () => {
    const rows = compositionRows([{ month: 1, dbuCost: 100, cloudCost: 0, addonCost: 10, total: 110 }], "2026-12");
    expect(rows[0]).toMatchObject({ expected: 110, dbuCost: 100, cloudCost: 0, addonCost: 10 });
  });
});
