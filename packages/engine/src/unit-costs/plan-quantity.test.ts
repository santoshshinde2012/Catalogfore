import { describe, expect, it } from "vitest";
import { estimate } from "../estimate.js";
import { blankPortfolio } from "../portfolio.js";
import type { Workload } from "../types.js";
import {
  applyPlanQuantity,
  planQuantityAction,
  planQuantityForUnitCost,
  type UnitCostPlanTarget,
} from "./plan-quantity.js";

function target(overrides: Partial<UnitCostPlanTarget> = {}): UnitCostPlanTarget {
  return {
    productId: "jobs_serverless",
    productName: "Serverless jobs",
    componentName: "DBU",
    partId: null,
    sku: "jobs_serverless",
    unit: "DBU",
    cloud: "aws",
    region: "us-east-1",
    tier: "premium",
    rateKind: "money",
    status: "priced",
    confidence: "measured",
    ...overrides,
  };
}

function usage(overrides: Partial<Extract<Workload, { kind: "metered" }>> = {}): Workload {
  return {
    id: "usage",
    name: "Imported jobs",
    productId: "jobs_serverless",
    kind: "metered",
    sku: "jobs_serverless",
    dbuPerMonth: 100,
    cloud: "aws",
    region: "us-east-1",
    tier: "premium",
    ...overrides,
  };
}

describe("unit-cost plan quantity", () => {
  it("reads a matching usage quantity and updates that workload", () => {
    const portfolio = { ...blankPortfolio("aws"), region: "us-east-1", workloads: [usage()] };
    const row = target();
    expect(planQuantityForUnitCost(portfolio, row)).toMatchObject({ quantity: 100, adjustable: true });
    expect(planQuantityAction(portfolio, row)).toBe("update");
    const before = estimate(portfolio).lines[0].dbu;
    const updated = applyPlanQuantity(portfolio, row, 250, () => "next");
    expect(updated?.portfolio.workloads[0]).toMatchObject({ dbuPerMonth: 250 });
    expect(estimate(updated!.portfolio).lines[0].dbu).toBeCloseTo(before * 2.5);
  });

  it("adds a catalog-priced DBU workload when the plan has no matching usage", () => {
    const portfolio = { ...blankPortfolio("aws"), region: "us-east-1", workloads: [] };
    const row = target();
    expect(planQuantityAction(portfolio, row)).toBe("add");
    const updated = applyPlanQuantity(portfolio, row, 80, () => "added");
    expect(updated?.portfolio.workloads[0]).toMatchObject({
      id: "added",
      kind: "metered",
      sku: "jobs_serverless",
      dbuPerMonth: 80,
    });
    expect(updated?.portfolio.workloads[0]).not.toHaveProperty("fixedUsdByCloud");
    expect(estimate(updated!.portfolio).lines[0].dbu).toBeCloseTo(80);
  });

  it("keeps an exported dollar cost and does not add a second line", () => {
    const portfolio = {
      ...blankPortfolio("aws"),
      region: "us-east-1",
      workloads: [usage({ dbuPerMonth: 40, fixedUsdByCloud: { aws: 12 } })],
    };
    const row = target();
    expect(planQuantityForUnitCost(portfolio, row)).toMatchObject({ quantity: 40, adjustable: false });
    expect(planQuantityAction(portfolio, row)).toBeNull();
    expect(applyPlanQuantity(portfolio, row, 90, () => "nope")).toBeNull();
  });

  it("ignores a different region and refuses a non-DBU row with no workload", () => {
    const portfolio = { ...blankPortfolio("aws"), region: "us-east-1", workloads: [usage()] };
    expect(planQuantityForUnitCost(portfolio, target({ region: "eu-west-1" }))).toBeNull();
    const gb = target({ unit: "GB", sku: null });
    expect(planQuantityAction({ ...portfolio, workloads: [] }, gb)).toBeNull();
    expect(applyPlanQuantity(portfolio, gb, 5, () => "nope")).toBeNull();
  });
});
