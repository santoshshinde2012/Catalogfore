import { describe, expect, it } from "vitest";
import { buildUnitCostCatalog } from "./builder.js";
import { buildUnitCostComparison } from "./comparison.js";
import { summarizeUnitCostEvidence } from "./evidence-summary.js";
import { buildUnitCostBreakdown, calculateUnitCost } from "./quote.js";
import type { UnitCostRow } from "./types.js";

const template = buildUnitCostCatalog().rows.find(
  (row) =>
    row.productId === "jobs_serverless" && row.cloud === "azure" && row.region === "eastus" && row.tier === "premium",
)!;
const row = (changes: Partial<UnitCostRow> = {}): UnitCostRow => ({
  ...template,
  id: "base",
  unit: "request",
  unitQuantity: 1000,
  unitPriceUsd: 5,
  usdPerUnit: 0.005,
  baseRateUsd: 0.5,
  baseRateUnit: "DBU",
  dbuPerUnit: 0.01,
  regionFactor: 1,
  ...changes,
});

describe("canonical unit quote calculations", () => {
  it("uses the normalized price once for billable raw units, preserving sub-cent precision and zero", () => {
    expect(calculateUnitCost(row(), 2000)).toMatchObject({ status: "calculated", unitRateUsd: 0.005, totalUsd: 10 });
    expect(calculateUnitCost(row(), 0).totalUsd).toBe(0);
    const tokens = row({
      unit: "token",
      unitQuantity: 1_000_000,
      unitPriceUsd: 0.00000003,
      usdPerUnit: 0.00000003 / 1_000_000,
    });
    expect(calculateUnitCost(tokens, 1_000_000).totalUsd).toBeCloseTo(0.00000003, 16);
    expect(calculateUnitCost(row({ unitPriceUsd: 0, usdPerUnit: 0 }), 10).totalUsd).toBe(0);
  });
  it("withholds missing, conflicted and internally inconsistent prices", () => {
    for (const changes of [
      { status: "unpriced" as const },
      { confidence: "conflict" as const },
      { rateKind: "allowance" as const },
      { unitPriceUsd: null },
      { unitQuantity: 0 },
      { unitQuantity: Infinity },
      { unitPriceUsd: -1 },
      { usdPerUnit: 5 },
      { usdPerUnit: Infinity },
      { usdPerUnit: null },
      { unitPriceUsd: Number.MIN_VALUE, unitQuantity: 1e15, usdPerUnit: 0 },
    ])
      expect(calculateUnitCost(row(changes), 100)).toMatchObject({ status: "unavailable", totalUsd: null });
  });
  it("rejects invalid quantities and numerical overflows instead of displaying an invalid subtotal", () => {
    for (const quantity of [NaN, Infinity, -1, 1e16])
      expect(calculateUnitCost(row(), quantity).status).toBe("invalid_quantity");
    expect(calculateUnitCost(row({ unitQuantity: 1, unitPriceUsd: 1e308, usdPerUnit: 1e308 }), 100)).toMatchObject({
      status: "overflow",
      totalUsd: null,
    });
    expect(
      calculateUnitCost(row({ unitQuantity: 1, unitPriceUsd: Number.MIN_VALUE, usdPerUnit: Number.MIN_VALUE }), 0.1)
        .status,
    ).toBe("overflow");
  });
  it("reconstructs a DBU quote only from factors that reproduce the stored quoted amount", () => {
    const details = buildUnitCostBreakdown(row({ regionFactor: 1.2, unitPriceUsd: 6, usdPerUnit: 0.006 }));
    expect(details.dbuPerQuote).toBe(10);
    expect(details.steps.map((step) => [step.id, step.value])).toEqual([
      ["base", 0.5],
      ["consumption", 10],
      ["region", 1.2],
      ["result", 6],
    ]);
    const incomplete = buildUnitCostBreakdown(row({ dbuPerUnit: 0.3 }));
    expect(incomplete.steps.map((step) => step.id)).toEqual(["result"]);
    expect(incomplete.explanation).toContain("not established");
    const infra = buildUnitCostBreakdown(row({ baseRateUnit: "DBU infrastructure-equivalent" }));
    expect(infra.steps.map((step) => step.id)).toEqual(["result"]);
    expect(buildUnitCostBreakdown(row({ status: "unpriced" })).steps).toEqual([]);
  });
});

describe("dimension-safe visual comparisons", () => {
  it("compares matching configurations across regions, excludes unknown prices from the bar scale", () => {
    const selected = row();
    const cheaper = row({ id: "lower", region: "westus", regionLabel: null, unitPriceUsd: 2.5, usdPerUnit: 0.0025 });
    const unresolved = row({
      id: "unknown",
      region: "northeurope",
      status: "unpriced",
      unitPriceUsd: null,
      usdPerUnit: null,
    });
    const compare = buildUnitCostComparison([selected, cheaper, unresolved], selected);
    expect(compare.state).toBe("available");
    expect(compare.points.map((point) => [point.row.id, point.barPercent, point.isSelected])).toEqual([
      ["lower", 50, false],
      ["base", 100, true],
    ]);
    expect(compare.unpricedRows.map((item) => item.id)).toEqual(["unknown"]);
  });
  it("never compares different units, quote sizes, clouds, editions, models, instances, parts or dimensions", () => {
    const selected = row();
    const incompatible: Partial<UnitCostRow>[] = [
      { unit: "token" },
      { unitQuantity: 1 },
      { cloud: "aws" },
      { tier: "enterprise" },
      { modelId: "another-model" },
      { instanceId: "another-machine" },
      { variant: "another-size" },
      { partId: "another-part" },
      { componentId: "storage" },
      { productId: "another-product" },
      { sku: "model_serving" },
      { dimensions: { ...selected.dimensions, photon: true } },
    ];
    const rows = incompatible.map((changes, index) =>
      row({ id: `other-${index}`, region: `other-${index}`, ...changes }),
    );
    expect(buildUnitCostComparison([selected, ...rows], selected).points.map((point) => point.row.id)).toEqual([
      "base",
    ]);
    expect(buildUnitCostComparison([selected], selected).state).toBe("insufficient");
    expect(buildUnitCostComparison([selected], row({ region: null })).state).toBe("insufficient");
    expect(buildUnitCostComparison([selected], row({ confidence: "conflict" })).state).toBe("unavailable");
    expect(buildUnitCostComparison([selected, { ...selected, id: "duplicate" }], selected).state).toBe("unavailable");
  });
  it("handles aliases and object key order consistently without changing the dimensional identity", () => {
    const selected = row({ dimensions: { modelUnits: 50, aliases: "old name", photon: false } });
    const other = row({
      id: "other",
      region: "westus",
      dimensions: { photon: false, aliases: "new name", modelUnits: 50 },
    });
    expect(buildUnitCostComparison([selected, other], selected).state).toBe("available");
    const free = [
      row({ unitPriceUsd: 0, usdPerUnit: 0 }),
      row({ id: "free", region: "westus", unitPriceUsd: 0, usdPerUnit: 0 }),
    ];
    expect(buildUnitCostComparison(free, free[0]).points.every((point) => point.barPercent === 0)).toBe(true);
  });
  it("counts evidence coverage without adding incompatible prices", () => {
    const summary = summarizeUnitCostEvidence([
      row(),
      row({ evidenceLevel: "estimate", unitPriceUsd: 500 }),
      row({ evidenceLevel: "unresolved", unitPriceUsd: null }),
    ]);
    expect(summary.total).toBe(3);
    expect(summary.buckets.find((bucket) => bucket.level === "official")!.count).toBe(1);
    expect(summary.buckets.find((bucket) => bucket.level === "official")!.percent).toBeCloseTo(100 / 3);
    expect(summary.buckets.reduce((total, bucket) => total + bucket.count, 0)).toBe(3);
    expect(summarizeUnitCostEvidence([]).buckets.every((bucket) => bucket.percent === 0)).toBe(true);
  });
});
