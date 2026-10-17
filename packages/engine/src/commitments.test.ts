import { describe, expect, it } from "vitest";
import { simulateCommitment } from "./commitments.js";

describe("list-value commitment planning", () => {
  it("includes unused prepaid allowance rather than discounting consumption alone", () => {
    const result = simulateCommitment([100, 100], 1000, 0.25);
    expect(result).toMatchObject({
      purchaseCost: 750,
      payAsYouGo: 200,
      unused: 800,
      totalCost: 750,
      savings: -550,
      exhaustedMonth: null,
    });
  });
  it("prices overflow at pay as you go and reconciles the balance", () => {
    const result = simulateCommitment([600, 600, 600], 1000, 0.25);
    expect(result).toMatchObject({
      purchaseCost: 750,
      overage: 800,
      totalCost: 1550,
      unused: 0,
      savings: 250,
      exhaustedMonth: 2,
    });
    expect(result.months[1]).toMatchObject({ covered: 400, overage: 200, remaining: 0 });
    expect(result.months.reduce((sum, row) => sum + row.covered + row.overage, 0)).toBe(result.payAsYouGo);
  });
  it("handles no commitment, exact break-even, and invalid terms", () => {
    expect(simulateCommitment([100], 0, 0).savings).toBe(0);
    expect(simulateCommitment([750], 1000, 0.25).savings).toBe(0);
    expect(() => simulateCommitment([100], 1000, 1)).toThrow(RangeError);
    expect(() => simulateCommitment([-100], 1000, 0.25)).toThrow(RangeError);
    expect(() => simulateCommitment([NaN], 1000, 0.25)).toThrow(RangeError);
  });
});
