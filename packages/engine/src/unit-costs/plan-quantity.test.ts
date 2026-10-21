import { describe, expect, it } from "vitest";
import { estimate } from "../estimate.js";
import { blankPortfolio, detachSimple, normalizePortfolio } from "../portfolio.js";
import { projectPortfolio } from "../projection.js";
import { workloadsForProduct } from "../products.js";
import type { Workload } from "../types.js";
import {
  applyPlanQuantity,
  planQuantityAction,
  planQuantityForUnitCost,
  planQuantityUnavailableReason,
  MAX_PLAN_QUANTITY,
  type UnitCostPlanTarget,
} from "./plan-quantity.js";
import { previewPlanQuantity } from "./plan-quantity-preview.js";

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
    unitQuantity: 1,
    unitPriceUsd: 0.35,
    usdPerUnit: 0.35,
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

  it("scales multiple matching workloads proportionally without changing other plan state", () => {
    const unrelated = usage({ id: "other", region: "eu-west-1" });
    const portfolio = {
      ...blankPortfolio("aws"),
      usageScale: 2,
      budgetAnnual: 5000,
      workloads: [usage({ dbuPerMonth: 25 }), usage({ id: "second", dbuPerMonth: 75 }), unrelated],
      events: [{ id: "ramp", name: "Ramp", month: "2027-01", usageMultiplier: 1.2 }],
    };
    expect(planQuantityForUnitCost(portfolio, target())?.quantity).toBe(200);
    const updated = applyPlanQuantity(portfolio, target(), 600)!;
    expect(updated.portfolio.workloads[0]).toMatchObject({ dbuPerMonth: 75 });
    expect(updated.portfolio.workloads[1]).toMatchObject({ dbuPerMonth: 225 });
    expect(updated.portfolio.workloads[2]).toBe(unrelated);
    expect(updated.portfolio.events).toBe(portfolio.events);
    expect(updated.portfolio.budgetAnnual).toBe(5000);
    expect(updated.portfolio.usageScale).toBe(2);
    expect(planQuantityForUnitCost(updated.portfolio, target())?.quantity).toBe(600);
    expect(portfolio.workloads[0]).toMatchObject({ dbuPerMonth: 25 });
  });

  it("applies calibration exactly once for additions and updates of a zero baseline", () => {
    const portfolio = { ...blankPortfolio(), region: "us-east-1", usageScale: 4 };
    const added = applyPlanQuantity(portfolio, target(), 100, () => "added")!;
    expect(estimate(added.portfolio).dbu).toBe(100);
    expect(added.portfolio.workloads[0]).toMatchObject({ dbuPerMonth: 25, inputs: { usageQuantity: 25 } });
    const empty = { ...portfolio, workloads: [usage({ dbuPerMonth: 0 }), usage({ id: "second", dbuPerMonth: 0 })] };
    const updated = applyPlanQuantity(empty, target(), 100)!;
    expect(estimate(updated.portfolio).dbu).toBe(100);
    expect(updated.portfolio.workloads[1]).toMatchObject({ dbuPerMonth: 0 });
  });

  it("does not rescale signed billing corrections or mix them with positive usage", () => {
    const portfolio = { ...blankPortfolio(), workloads: [usage(), usage({ id: "correction", dbuPerMonth: -10 })] };
    expect(planQuantityForUnitCost(portfolio, target())).toMatchObject({ quantity: 90, adjustable: false });
    expect(planQuantityUnavailableReason(portfolio, target())).toContain("billing corrections");
    expect(applyPlanQuantity(portfolio, target(), 200)).toBeNull();
  });

  it("does not treat a non-DBU import's placeholder DBUs as adjustable DBU usage", () => {
    const portfolio = {
      ...blankPortfolio(),
      workloads: [usage({ dbuPerMonth: 0, inputs: { usageUnit: "GB", usageQuantity: 80 } })],
    };
    expect(planQuantityForUnitCost(portfolio, target())).toBeNull();
    expect(planQuantityForUnitCost(portfolio, target({ unit: "GB" }))).toMatchObject({
      quantity: 80,
      adjustable: false,
    });
    expect(applyPlanQuantity(portfolio, target({ unit: "GB" }), 200)).toBeNull();
  });

  it("changes an explicitly identified non-DBU quantity only when units drive its rate", () => {
    const portfolio = {
      ...blankPortfolio(),
      workloads: [
        usage({
          dbuPerMonth: 0,
          units: 20,
          inputs: { usageUnit: "GB", usageQuantity: 20 },
          rateByPlacement: { aws: { premium: 0.5 } },
        }),
      ],
    };
    const row = target({ unit: "GB" });
    const updated = applyPlanQuantity(portfolio, row, 60)!;
    expect(updated.portfolio.workloads[0]).toMatchObject({ units: 60, inputs: { usageQuantity: 60 } });
    expect(estimate(updated.portfolio).total).toBe(30);
    expect(planQuantityForUnitCost(portfolio, target({ unit: "page" }))).toBeNull();
    const anonymous = { ...portfolio, workloads: [usage({ units: 20 })] };
    expect(planQuantityForUnitCost(anonymous, row)).toBeNull();
  });

  it("keeps product-driver formulas view-only instead of losing a quantity on calendar recalculation", () => {
    const portfolio = { ...blankPortfolio(), region: "us-east-1", workloads: workloadsForProduct("ai_bi_dashboards") };
    const row = target({ productId: "ai_bi_dashboards", sku: "sql_serverless" });
    expect(planQuantityForUnitCost(portfolio, row)?.adjustable).toBe(false);
    expect(planQuantityUnavailableReason(portfolio, row)).toContain("usage drivers");
    expect(applyPlanQuantity(portfolio, row, 500)).toBeNull();
    expect(planQuantityAction({ ...portfolio, workloads: [] }, row)).toBeNull();
  });

  it("matches imported composite product quantities by their unambiguous SKU", () => {
    const portfolio = {
      ...blankPortfolio(),
      workloads: [
        usage({
          productId: "genie",
          sku: "sql_serverless",
          inputs: { usageUnit: "DBU", usageQuantity: 100 },
          rateProvenance: { kind: "imported", label: "Catalog estimate", currency: "USD" },
        }),
      ],
    };
    const row = target({ productId: "genie", partId: "sql", sku: "sql_serverless" });
    expect(planQuantityAction(portfolio, row)).toBe("update");
    const updated = applyPlanQuantity(portfolio, row, 200)!;
    expect(updated.portfolio.workloads).toHaveLength(1);
    expect(updated.portfolio.workloads[0]).toMatchObject({ dbuPerMonth: 200, inputs: { usageQuantity: 200 } });
    expect(planQuantityForUnitCost(portfolio, { ...row, partId: "llm", sku: "model_serving" })).toBeNull();
  });

  it.each([
    { status: "unpriced" as const },
    { confidence: "conflict" as const },
    { rateKind: "consumption" as const },
    { unitPriceUsd: null },
    { unitQuantity: 0 },
    { usdPerUnit: 8 },
  ])("withholds unsafe quoted rates even when matching usage exists: %j", (invalid) => {
    const portfolio = { ...blankPortfolio(), workloads: [usage()] };
    expect(planQuantityAction(portfolio, target(invalid))).toBeNull();
    expect(applyPlanQuantity(portfolio, target(invalid), 100)).toBeNull();
  });

  it.each([NaN, Infinity, -1, MAX_PLAN_QUANTITY + 1])("rejects invalid forecast quantities: %s", (quantity) => {
    expect(applyPlanQuantity(blankPortfolio(), target(), quantity)).toBeNull();
  });

  it("rejects a quantity that normalization would clamp and duplicate workload IDs", () => {
    expect(applyPlanQuantity({ ...blankPortfolio(), usageScale: 0.0001 }, target(), MAX_PLAN_QUANTITY)).toBeNull();
    const portfolio = { ...blankPortfolio(), workloads: [usage({ region: "eu-west-1" })] };
    expect(applyPlanQuantity(portfolio, target(), 100, () => "usage")).toBeNull();
    expect(applyPlanQuantity(blankPortfolio(), target(), 100, () => "")).toBeNull();
  });

  it("previews the canonical applied first month and year including discounts and dated events", () => {
    const portfolio = {
      ...blankPortfolio(),
      region: "us-east-1",
      usageScale: 2,
      workloads: [usage()],
      commitment: { dbuDiscount: 0.2, cloudDiscount: 0 },
      addon: "compliance" as const,
      forecast: { months: 24 as const, annualGrowth: 0.1, seasonality: "retail" as const, startMonth: "2026-11" },
      events: [{ id: "ramp", name: "Ramp", month: "2027-02", usageMultiplier: 1.5 }],
    };
    const before = structuredClone(portfolio);
    const preview = previewPlanQuantity(portfolio, target(), 300)!;
    const applied = normalizePortfolio(detachSimple(applyPlanQuantity(portfolio, target(), 300)!.portfolio));
    const result = projectPortfolio(applied);
    expect(preview.proposedMonthly).toBe(result.points[0].total);
    expect(preview.proposedAnnual).toBe(result.annual);
    expect(preview.annualDelta).toBeCloseTo(result.annual - projectPortfolio(portfolio).annual, 2);
    expect(preview.hasUnpriced).toBe(false);
    expect(portfolio).toEqual(before);
    expect(previewPlanQuantity(portfolio, target(), -1)).toBeNull();
  });

  it("marks a preview as a known subtotal when the plan contains unpriced usage", () => {
    const portfolio = {
      ...blankPortfolio(),
      workloads: [usage({ id: "unit-cost-preview", productId: "other", priceStatus: "unpriced" })],
    };
    expect(previewPlanQuantity(portfolio, target(), 100)?.hasUnpriced).toBe(true);
    expect(portfolio.workloads).toHaveLength(1);
  });
});
