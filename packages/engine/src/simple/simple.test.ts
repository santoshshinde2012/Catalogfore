import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { importUsageCsv } from "../usage.js";
import { adjustMix, mixFromUsage } from "./mix.js";
import { annualGrowthFromMonthly } from "./shape.js";
import {
  defaultPlan,
  planForMix,
  planForPreset,
  planForSpend,
  planFromUsage,
  projectSimple,
  withCommit,
  withGrowth,
  withRates,
} from "./project.js";

describe("simple forecast", () => {
  it("prices a medium team near the preset monthly amount", () => {
    const plan = defaultPlan();
    const projected = projectSimple(plan);
    expect(projected.listMonthly).toBeGreaterThan(11_900);
    expect(projected.listMonthly).toBeLessThan(12_100);
    expect(plan.monthlyGrowth).toBe(0.03);
    expect(projected.months).toHaveLength(12);
    expect(projected.spreadPercent).toBeGreaterThan(0);
  });

  it("keeps a flat year near twelve times the first month", () => {
    const projected = projectSimple(withGrowth(defaultPlan(), 0));
    const year = projected.months.reduce((sum, month) => sum + month.expected, 0);
    expect(Math.abs(year - projected.estimate.total * 12)).toBeLessThan(2);
  });

  it("grows each month from a monthly percent", () => {
    const plan = withGrowth(defaultPlan(), 0.1);
    const projected = projectSimple(plan);
    expect(annualGrowthFromMonthly(0.1)).toBeCloseTo(Math.pow(1.1, 12) - 1, 8);
    expect(projected.months[11].expected).toBeGreaterThan(projected.months[0].expected * 2);
    expect(projected.portfolio.forecast.months).toBe(12);
  });

  it("changes the cloud share when the mix changes, and keeps the monthly amount", () => {
    const base = defaultPlan();
    const pipelines = projectSimple(planForMix(base, { etl: 1, sql: 0, ml: 0 }));
    const dashboards = projectSimple(planForMix(base, { etl: 0, sql: 1, ml: 0 }));
    const models = projectSimple(planForMix(base, { etl: 0, sql: 0, ml: 1 }));
    expect(pipelines.estimate.cloudCost).toBeGreaterThan(0);
    expect(dashboards.estimate.cloudCost).toBe(0);
    expect(models.estimate.cloudCost).toBe(0);
    expect(dashboards.estimate.dbuCost / dashboards.estimate.dbu).toBeGreaterThan(
      pipelines.estimate.dbuCost / pipelines.estimate.dbu,
    );
    expect(pipelines.cloudShare).toBeGreaterThan(dashboards.cloudShare);
    expect(Math.abs(dashboards.listMonthly - base.monthlySpend)).toBeLessThan(25);
    expect(Math.abs(models.listMonthly - base.monthlySpend)).toBeLessThan(25);
  });

  it("applies a commitment discount only to the Databricks portion", () => {
    const plain = projectSimple(defaultPlan());
    const discounted = projectSimple(withCommit(defaultPlan(), 0.3));
    expect(discounted.annual).toBeLessThan(plain.annual);
    expect(discounted.estimate.cloudCost).toBeCloseTo(plain.estimate.cloudCost, 0);
    expect(discounted.listMonthly).toBeCloseTo(plain.listMonthly, 0);
  });

  it("reprices the same work when the cloud changes", () => {
    const aws = projectSimple(defaultPlan());
    const azure = projectSimple(withRates(defaultPlan(), { cloud: "azure", tier: "premium", region: "eastus" }));
    expect(azure.listMonthly).not.toBe(aws.listMonthly);
    expect(azure.portfolio.workloads.map((workload) => workload.kind)).toEqual(
      aws.portfolio.workloads.map((workload) => workload.kind),
    );
  });

  it("replaces spend and mix from a usage file", () => {
    const text = [
      "sku_name,usage_quantity,usage_unit",
      "JOBS_COMPUTE,1000,DBU",
      "SERVERLESS_SQL,500,DBU",
      "MODEL_SERVING,250,DBU",
    ].join("\n");
    const loaded = planFromUsage(defaultPlan(), text);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const projected = projectSimple(loaded.plan);
    expect(projected.portfolio.usageCalibrated).toBe(true);
    expect(loaded.plan.mix.etl).toBeCloseTo(1000 / 1750, 2);
    expect(loaded.plan.mix.sql).toBeCloseTo(500 / 1750, 2);
    expect(projected.estimate.dbu).toBeGreaterThan(1700);
    expect(projected.estimate.dbu).toBeLessThan(1800);
    expect(planFromUsage(defaultPlan(), "not,a,file").ok).toBe(false);
    const history = readFileSync(
      new URL("../../../../apps/web/public/sample-usage-history.csv", import.meta.url),
      "utf8",
    );
    const fitted = planFromUsage(defaultPlan(), history);
    expect(fitted.ok).toBe(true);
    if (!fitted.ok) return;
    expect(fitted.plan.usageForecast?.method).toBe("log-linear-seasonal");
    const fittedProjection = projectSimple(fitted.plan);
    expect(fittedProjection.assumptions.some((line) => line.startsWith("Prices updated"))).toBe(true);
    expect(fittedProjection.annual).toBeGreaterThan(fittedProjection.months[0].expected);
  });

  it("rescales the other shares when one slider moves", () => {
    const next = adjustMix({ etl: 0.2, sql: 0.5, ml: 0.3 }, "sql", 0.8);
    expect(next.sql).toBeCloseTo(0.8, 5);
    expect(next.etl + next.sql + next.ml).toBeCloseTo(1, 5);
    expect(next.etl).toBeCloseTo(0.08, 5);
  });

  it("maps usage names onto the three groups", () => {
    const usage = importUsageCsv("sku_name,usage_quantity,usage_unit\nJOBS_COMPUTE,10,DBU\nSQL_PRO,5,DBU\n");
    const mix = mixFromUsage(usage);
    expect(mix.etl).toBeCloseTo(2 / 3, 5);
    expect(mix.sql).toBeCloseTo(1 / 3, 5);
  });

  it("hits a typed monthly spend", () => {
    const plan = planForSpend(defaultPlan(), 20_000);
    const projected = projectSimple(withGrowth(plan, 0));
    expect(Math.abs(projected.listMonthly - 20_000)).toBeLessThan(25);
  });

  it("switches presets", () => {
    const small = projectSimple(planForPreset(defaultPlan(), "small"));
    const large = projectSimple(planForPreset(defaultPlan(), "large"));
    expect(small.listMonthly).toBeLessThan(2_100);
    expect(large.listMonthly).toBeGreaterThan(24_000);
  });
});
