import { describe, expect, it } from "vitest";
import { blankPortfolio } from "../portfolio.js";
import type { Workload } from "../types.js";
import { createWorkload, type MenuKind } from "../workload-seeds.js";
import { estimate } from "./estimate-portfolio.js";
import { defaultCostStrategies } from "./strategies/index.js";
import { resolvePlacement } from "./support.js";
import { bundledPricingCatalog } from "../catalog/pricing-catalog.js";

const MENU: Record<Workload["kind"], MenuKind> = {
  cluster: "jobs",
  serverless_compute: "serverless_jobs",
  sql: "sql",
  model_serving: "serving",
  foundation_model: "foundation",
  ai_search: "search",
  app: "app",
  lakebase: "lakebase",
  storage: "storage",
  egress: "egress",
  metered: "metered",
};

describe("cost strategy contract", () => {
  it("registers each workload kind once", () => {
    const kinds = defaultCostStrategies.map((strategy) => strategy.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
    expect(kinds.slice().sort()).toEqual(Object.keys(MENU).sort());
  });

  it.each(defaultCostStrategies)("$kind returns a finite line and rejects a different kind", (strategy) => {
    const workload = createWorkload(MENU[strategy.kind]);
    const portfolio = {
      ...blankPortfolio(),
      workloads: [workload],
      forecast: { ...blankPortfolio().forecast, annualGrowth: 0 },
    };
    const context = {
      catalog: bundledPricingCatalog,
      portfolio,
      placement: resolvePlacement(bundledPricingCatalog, portfolio, workload),
    };
    const line = strategy.quote(workload, context);
    expect(line.kind).toBe(strategy.kind);
    expect(line.workloadId).toBe(workload.id);
    expect(Number.isFinite(line.dbuCost)).toBe(true);
    expect(Number.isFinite(line.cloudCost)).toBe(true);
    expect(line.notes).toBeInstanceOf(Array);
    expect(strategy.quote(workload, context)).toEqual(line);
    const other = createWorkload(strategy.kind === "cluster" ? "storage" : "jobs");
    expect(() => strategy.quote(other, context)).toThrow(/cannot price/);
    const priced = estimate(portfolio, { catalog: bundledPricingCatalog, strategies: [strategy] });
    expect(priced.lines).toHaveLength(1);
  });
});
