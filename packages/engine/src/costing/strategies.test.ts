import { describe, expect, it } from "vitest";
import { bundledPricingCatalog, type PricingCatalog, type VmQuote } from "../catalog/pricing-catalog.js";
import { blankPortfolio } from "../portfolio.js";
import type { Cloud, Portfolio, SkuId, Tier, Workload } from "../types.js";
import { estimate } from "./estimate-portfolio.js";
import { defaultCostStrategies } from "./strategies/index.js";
import { clusterStrategy } from "./strategies/cluster.js";
import { egressStrategy } from "./strategies/egress.js";
import { serverlessComputeStrategy } from "./strategies/serverless-compute.js";
import { sqlStrategy } from "./strategies/sql.js";
import { storageStrategy } from "./strategies/storage.js";
import { resolvePlacement } from "./support.js";
import { defineStrategy, MissingCostStrategyError, type CostContext } from "./types.js";
import type { RegionInfo } from "../catalog.js";

function region(factor = 1): RegionInfo {
  return { cloud: "aws", id: "us-east-1", label: "US East", factor, source: "reference" };
}

function catalog(partial: Partial<PricingCatalog> = {}): PricingCatalog {
  return {
    ...bundledPricingCatalog,
    version: "test",
    verifiedOn: "2026-10-15",
    disclaimer: "test",
    photonMultiplier: 2.9,
    sqlVmDollarsPerDbuHour: 0.22,
    sqlVmNote: "sql vm assumption",
    defaultSpotDiscount: 0.6,
    addonRates: { none: 0, compliance: 0.1, mission_critical: 0.3 },
    sqlDbuPerHour: { "2xs": 4, xs: 6, s: 12, m: 24, l: 40, xl: 80, "2xl": 144, "3xl": 272, "4xl": 528 },
    skuRate: () => 0.15,
    region: () => region(),
    instance: () => ({
      cloud: "aws",
      id: "m5.xlarge",
      label: "m5.xlarge",
      family: "m5",
      vCPU: 4,
      memoryGiB: 16,
      dbuPerHour: 0.69,
    }),
    vmHourly: (): VmQuote => ({ hourly: 0.192, spotHourly: null, approximate: false, source: "test" }),
    ...partial,
  };
}

function context(portfolio: Portfolio, book: PricingCatalog = catalog()): CostContext {
  const workload = portfolio.workloads[0];
  return { catalog: book, portfolio, placement: resolvePlacement(book, portfolio, workload) };
}

function portfolio(workload: Workload): Portfolio {
  const next = blankPortfolio();
  next.forecast.annualGrowth = 0;
  next.workloads = [workload];
  return next;
}

describe("cluster strategy", () => {
  const workload: Workload = {
    id: "job",
    name: "Nightly",
    kind: "cluster",
    sku: "jobs_classic",
    instanceId: "m5.xlarge",
    scale: { min: 2, max: 2, utilization: 1 },
    photon: false,
    spotShare: 0,
    spotDiscount: 0.6,
    schedule: { hoursPerDay: 8, daysPerWeek: 5 },
  };

  it("prices DBU and VM from the injected catalog", () => {
    const book = catalog();
    const line = clusterStrategy.quote(workload, context(portfolio(workload), book));
    const hours = 8 * 5 * (52 / 12);
    expect(line.dbu).toBeCloseTo(3 * 0.69 * hours, 6);
    expect(line.dbuCost).toBeCloseTo(3 * 0.69 * hours * 0.15, 6);
    expect(line.cloudCost).toBeCloseTo(3 * 0.192 * hours, 6);
    expect(line.notes[0]).toContain("$0.15/DBU");
  });

  it("refuses a workload of the wrong kind", () => {
    const other: Workload = { id: "e", name: "Out", kind: "egress", gbMonth: 1 };
    expect(() => clusterStrategy.quote(other, context(portfolio(workload)))).toThrow(/cannot price/);
  });
});

describe("serverless compute strategy", () => {
  it("drops the VM line and uses the injected serverless rate", () => {
    const book = catalog({ skuRate: (_c: Cloud, _t: Tier, sku: SkuId) => (sku === "jobs_serverless" ? 0.35 : 0.15) });
    const workload: Workload = {
      id: "s",
      name: "Serverless",
      kind: "serverless_compute",
      sku: "jobs_serverless",
      dbuPerHour: 10,
      schedule: { hoursPerDay: 8, daysPerWeek: 5 },
    };
    const line = serverlessComputeStrategy.quote(workload, context(portfolio(workload), book));
    expect(line.cloudCost).toBe(0);
    expect(line.dbuCost).toBeCloseTo(10 * 8 * 5 * (52 / 12) * 0.35, 6);
  });
});

describe("sql strategy", () => {
  it("uses the t-shirt ladder and the VM equivalence only for classic", () => {
    const workload: Workload = {
      id: "sql",
      name: "BI",
      kind: "sql",
      edition: "classic",
      size: "s",
      scale: { min: 1, max: 1, utilization: 1 },
      schedule: { hoursPerDay: 8, daysPerWeek: 5 },
    };
    const book = catalog({ skuRate: () => 0.22 });
    const line = sqlStrategy.quote(workload, context(portfolio(workload), book));
    const dbu = 12 * 8 * 5 * (52 / 12);
    expect(line.dbu).toBeCloseTo(dbu, 6);
    expect(line.cloudCost).toBeCloseTo(dbu * 0.22, 6);
    expect(line.approximateVm).toBe(true);
  });
});

describe("storage and egress strategies", () => {
  it("bills managed storage from the catalog DSU rate", () => {
    const book = catalog({ managedStoragePerDsu: { aws: 0.023, azure: 0.023, gcp: 0.023 } });
    const workload: Workload = { id: "st", name: "Store", kind: "storage", gbMonth: 400, managed: true };
    const line = storageStrategy.quote(workload, context(portfolio(workload), book));
    expect(line.cloudCost).toBeCloseTo(9.2, 6);
    expect(line.dbuCost).toBe(0);
  });

  it("lets an egress workload override the catalog rate", () => {
    const workload: Workload = { id: "eg", name: "Out", kind: "egress", gbMonth: 80, pricePerGb: 0.09 };
    const line = egressStrategy.quote(workload, context(portfolio(workload)));
    expect(line.cloudCost).toBeCloseTo(7.2, 6);
  });
});

describe("estimator composition", () => {
  it("uses an injected strategy without a change to the estimator", () => {
    const marked = defineStrategy("cluster", (workload) => ({
      workloadId: workload.id,
      name: workload.name,
      kind: "cluster",
      sku: workload.sku,
      hours: 0,
      dbu: 0,
      dbuCost: 12,
      cloudCost: 0,
      approximateVm: false,
      notes: ["injected"],
    }));
    const workload: Workload = {
      id: "job",
      name: "Nightly",
      kind: "cluster",
      sku: "jobs_classic",
      instanceId: "m5.xlarge",
      scale: { min: 1, max: 1, utilization: 1 },
      photon: false,
      spotShare: 0,
      spotDiscount: 0.6,
      schedule: { hoursPerDay: 1, daysPerWeek: 1 },
    };
    const result = estimate(portfolio(workload), { catalog: catalog(), strategies: [marked] });
    expect(result.lines[0].notes).toEqual(["injected"]);
    expect(result.total).toBe(12);
  });

  it("fails clearly when a kind has no strategy", () => {
    const workload: Workload = { id: "eg", name: "Out", kind: "egress", gbMonth: 1 };
    expect(() => estimate(portfolio(workload), { catalog: catalog(), strategies: [clusterStrategy] })).toThrow(
      MissingCostStrategyError,
    );
  });

  it("still prices the bundled book when no dependencies are passed", () => {
    const workload: Workload = {
      id: "job",
      name: "Nightly",
      kind: "cluster",
      sku: "jobs_classic",
      instanceId: "m5.xlarge",
      scale: { min: 2, max: 2, utilization: 1 },
      photon: false,
      spotShare: 0,
      spotDiscount: 0.6,
      schedule: { hoursPerDay: 8, daysPerWeek: 5 },
    };
    const result = estimate(portfolio(workload));
    expect(result.dbuCost).toBe(53.82);
    expect(result.cloudCost).toBe(99.84);
    expect(defaultCostStrategies.map((strategy) => strategy.kind)).toContain("sql");
  });
});
