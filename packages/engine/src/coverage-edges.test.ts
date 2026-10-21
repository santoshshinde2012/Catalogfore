import { compressToEncodedURIComponent } from "lz-string";
import { productCatalog } from "@cayfore/catalog";
import { describe, expect, it } from "vitest";
import { defaultInstanceId, findInstance, listInstances, regionInfo, sqlSizeLabel, vmHourly } from "./catalog.js";
import { parseCsv } from "./csv.js";
import { holtWintersForecast } from "./forecast/holt-winters.js";
import { seasonalityVector } from "./forecast/model.js";
import { fitUsageForecast } from "./forecast/series.js";
import { applyRecommendation } from "./recommend.js";
import {
  blankPortfolio,
  decodePortfolio,
  decodePortfolioResult,
  encodePortfolio,
  normalizePortfolio,
} from "./portfolio.js";
import {
  productCatalogMeta,
  productCategories,
  workloadForProduct,
  workloadsFromUsage,
  forecastProducts,
} from "./products.js";
import { err, ok } from "./result.js";
import { classicClusterHours, clampCommitment } from "./scenarios.js";
import { defaultPlan, explain } from "./simple/project.js";
import { regionFor } from "./simple/shape.js";
import { tips } from "./tips.js";
import type { Estimate, Portfolio, SqlSize } from "./types.js";
import { importUsageCsv } from "./usage.js";
import { usageImporters } from "./usage-importers.js";
import { createWorkload, type MenuKind } from "./workload-seeds.js";

const KINDS: MenuKind[] = [
  "jobs",
  "all_purpose",
  "dlt",
  "serverless_jobs",
  "serverless_notebooks",
  "serverless_dlt",
  "sql",
  "serving",
  "foundation",
  "search",
  "app",
  "lakebase",
  "storage",
  "egress",
  "metered",
];

describe("portfolio decode", () => {
  it("keeps explicit fields and falls back when a cell is missing or out of range", () => {
    const portfolio = normalizePortfolio({
      cloud: "nope",
      region: "nope",
      tier: "nope",
      name: "n".repeat(90),
      addon: "compliance",
      usageScale: 0,
      budgetAnnual: 10,
      usageCalibrated: true,
      commitment: { dbuDiscount: 2, cloudDiscount: -1 },
      forecast: { months: 24, annualGrowth: 99, seasonality: "retail", customSeasonality: [2, "bad"] },
      simple: {
        monthlySpend: 100,
        mix: { etl: 0, sql: 0, ml: 0 },
        monthlyGrowth: 0.5,
        commitDiscount: 2,
        basket: { etlNodes: 2 },
        usageDbu: 10,
        usageForecast: {
          method: "holt-winters",
          mape: Number.NaN,
          holdout: 2,
          monthlyGrowth: 0.01,
          ratios: Array.from({ length: 12 }, () => ({ low: 0.8, expected: 1, high: 1.2 })),
        },
      },
      workloads: [
        {
          kind: "cluster",
          sku: "dlt_advanced",
          cloud: "azure",
          region: "eastus",
          tier: "enterprise",
          productId: "jobs_classic",
          partId: "jobs",
          inputs: { hours: 3, note: "night", "bad-key": 1, empty: "" },
          instanceId: "Standard_DS13_v2",
          scale: { min: "2", max: 4, utilization: 0.5 },
          photon: true,
          spotShare: "0.2",
          schedule: { hoursPerDay: 3, daysPerWeek: 7 },
        },
        { kind: "cluster", sku: "not-a-sku" },
        { kind: "serverless_compute", sku: "all_purpose_serverless", dbuPerHour: 6 },
        { kind: "serverless_compute", sku: "nope" },
        { kind: "sql", edition: "pro", size: "xl", vmPerDbuHour: 0.04 },
        { kind: "sql", edition: "nope", size: "huge" },
        { kind: "model_serving", mode: "gpu", concurrency: 4, gpuId: "a10", replicas: 2 },
        { kind: "foundation_model", modelId: "custom", inputTokensPerMonth: 10, outputTokensPerMonth: 4 },
        { kind: "ai_search", variant: "storage_optimized", units: 2, storageGb: 8 },
        { kind: "app", size: "large" },
        { kind: "lakebase", cu: 4, storageGb: 80 },
        { kind: "storage", gbMonth: 10, managed: false, rateMultiplier: 2 },
        { kind: "egress", gbMonth: 5, pricePerGb: 0.02 },
        {
          kind: "metered",
          sku: "jobs_serverless",
          rateProvenance: { kind: "custom", label: "Negotiated test prices", currency: "USD" },
          dbuPerMonth: 12,
          units: 100,
          rateByCloud: { aws: 0.2, azure: "0.3" },
          fixedUsdByCloud: { gcp: 4 },
          rateByPlacement: { aws: { premium: 0.05, enterprise: "0.064" }, nope: { premium: 1 } },
        },
        { kind: "metered", sku: "not-a-meter" },
        { kind: "unknown" },
        "not-a-workload",
      ],
    });

    expect(portfolio.cloud).toBe("aws");
    expect(portfolio.region).toBe("us-east-1");
    expect(portfolio.tier).toBe("premium");
    expect(portfolio.name).toHaveLength(80);
    expect(portfolio.addon).toBe("compliance");
    expect(portfolio.usageScale).toBe(0.0001);
    expect(portfolio.budgetAnnual).toBe(10);
    expect(portfolio.usageCalibrated).toBe(true);
    expect(portfolio.commitment).toEqual({ dbuDiscount: 0.95, cloudDiscount: 0 });
    expect(portfolio.forecast.months).toBe(24);
    expect(portfolio.forecast.annualGrowth).toBe(10);
    expect(portfolio.forecast.seasonality).toBe("retail");
    expect(portfolio.simple?.mix).toEqual({ etl: 1 / 3, sql: 1 / 3, ml: 1 / 3 });
    expect(portfolio.simple?.monthlyGrowth).toBe(0.2);
    expect(portfolio.simple?.usageForecast?.method).toBe("holt-winters");
    expect(portfolio.simple?.usageForecast?.mape).toBeNull();
    const cluster = portfolio.workloads.find((workload) => workload.kind === "cluster" && workload.photon);
    expect(cluster?.kind === "cluster" && cluster.sku).toBe("dlt_advanced");
    expect(cluster?.kind === "cluster" && cluster.cloud).toBe("azure");
    expect(cluster?.kind === "cluster" && cluster.inputs).toEqual({ hours: 3, note: "night" });
    const fallback = portfolio.workloads.find((workload) => workload.kind === "cluster" && !workload.photon);
    expect(fallback?.kind === "cluster" && fallback.sku).toBe("jobs_classic");
    const sql = portfolio.workloads.find((workload) => workload.kind === "sql" && workload.edition === "pro");
    expect(sql?.kind === "sql" && sql.size).toBe("xl");
    expect(sql?.kind === "sql" && sql.vmPerDbuHour).toBe(0.04);
    const classic = portfolio.workloads.find((workload) => workload.kind === "sql" && workload.edition === "classic");
    expect(classic?.kind === "sql" && classic.size).toBe("s");
    const metered = portfolio.workloads.find((workload) => workload.kind === "metered" && workload.units === 100);
    expect(metered?.kind === "metered" && metered.rateByPlacement?.aws).toEqual({ premium: 0.05, enterprise: 0.064 });
    expect(metered?.kind === "metered" && metered.rateByCloud).toEqual({ aws: 0.2, azure: 0.3 });
    expect(portfolio.workloads).toHaveLength(15);
  });

  it("drops a simple forecast whose method or length is not one of the four fits", () => {
    const dropped = normalizePortfolio({
      simple: {
        usageForecast: { method: "guess", ratios: Array.from({ length: 12 }, () => ({ expected: 1 })) },
      },
    });
    expect(dropped.simple?.usageForecast).toBeUndefined();
    const short = normalizePortfolio({
      forecast: { months: 36, seasonality: "custom", customSeasonality: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
      simple: { usageForecast: { method: "log-linear-weekly", ratios: [{ expected: 1 }] } },
    });
    expect(short.forecast.months).toBe(36);
    expect(short.forecast.seasonality).toBe("custom");
    expect(short.simple?.usageForecast).toBeUndefined();
    expect(normalizePortfolio(null).name).toBe("Untitled forecast");
    expect(normalizePortfolio({ workloads: "nope", addon: "later", simple: "nope" }).workloads).toEqual([]);
  });

  it("returns a result for a share link and an error for a link that is not a forecast", () => {
    const encoded = encodePortfolio(blankPortfolio("gcp"));
    const decoded = decodePortfolioResult(encoded);
    expect(decoded.ok && decoded.value.cloud).toBe("gcp");
    expect(decodePortfolioResult("").ok).toBe(false);
    expect(decodePortfolio(compressToEncodedURIComponent("not json"))).toBeNull();
    expect(ok(1)).toEqual({ ok: true, value: 1 });
    expect(err("no").ok).toBe(false);
  });
});

describe("catalog and forecast edges", () => {
  it("labels every SQL size and falls back when a region or instance is missing", () => {
    const sizes: SqlSize[] = ["2xs", "xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl"];
    expect(sizes.map(sqlSizeLabel)).toContain("2X-Small");
    expect(listInstances("aws").length).toBeGreaterThan(0);
    expect(findInstance("aws", "missing")).toBeUndefined();
    expect(defaultInstanceId("aws")).toBeTruthy();
    expect(regionInfo("aws", "not-a-region").id).toBe("us-east-1");
    expect(regionFor("aws", "not-a-region")).toBe("us-east-1");
    const shifted = vmHourly("aws", "sa-east-1", "m5.xlarge");
    expect(shifted.hourly).toBeGreaterThan(0);
    expect(KINDS.map((kind) => createWorkload(kind).kind).length).toBe(KINDS.length);
  });

  it("fits a weekly series and backtests Holt-Winters once the holdout still leaves two seasons", () => {
    const days = Array.from({ length: 30 }, (_, index) => ({ period: `2026-01-${index + 1}`, amount: 10 + index }));
    const weekly = fitUsageForecast({ months: [{ period: "2026-01", amount: 100 }], days });
    expect(weekly?.method).toBe("log-linear-weekly");
    expect(weekly?.ratios).toHaveLength(12);
    const months = Array.from({ length: 30 }, (_, index) => ({
      period: `2024-${String((index % 12) + 1).padStart(2, "0")}`,
      amount: index === 28 ? 0 : 100 + index,
    }));
    const fitted = holtWintersForecast(months);
    expect(fitted?.method).toBe("holt-winters");
    expect(fitted?.holdout).toBe(3);
    expect(
      seasonalityVector({ months: 12, annualGrowth: Number.NaN, seasonality: "custom", customSeasonality: [1] }),
    ).toEqual(Array.from({ length: 12 }, () => 1));
    const custom = seasonalityVector({
      months: 12,
      annualGrowth: 0,
      seasonality: "custom",
      customSeasonality: [1, 1, 1, 1, 1, 1, Number.NaN, 1, 1, 1, 1, 2],
    });
    expect(custom[6]).toBe(1);
    expect(custom[11]).toBe(2);
  });
});

describe("products, usage, tips, and explanations", () => {
  it("imports both file shapes and skips a row that is not a number", () => {
    const csv = parseCsv('sku_name,usage_quantity\n"JOBS ""X""",1\n');
    expect(csv[0]?.sku_name).toBe('JOBS "X"');
    const mixed = importUsageCsv("sku_name,usage_quantity,usage_unit\nJOBS,nope,DBU\nJOBS,2,DBU\n");
    expect(mixed.skippedRows).toBe(1);
    const priced = workloadsFromUsage(
      "sku_name,billing_origin_product,usage_quantity,usage_unit\nPREMIUM_JOBS_COMPUTE,JOBS,10,DBU\nPREMIUM_JOBS_COMPUTE,JOBS,2,GB\n",
    );
    expect(priced.workloads.some((workload) => workload.kind === "metered" && workload.dbuPerMonth === 10)).toBe(true);
    expect(priced.warnings.some((warning) => warning.includes("GB"))).toBe(true);
    expect(productCatalogMeta().version).toBe(productCatalog.version);
    expect(productCategories().length).toBeGreaterThan(0);
    expect(() => workloadForProduct("not-a-product")).toThrow(/Unknown product/);
    expect(usageImporters.map((importer) => importer.id)).toEqual(["dbu-mix", "products"]);
  });

  it("groups two parts of one product and prices a zero estimate as a zero year", () => {
    const portfolio = blankPortfolio();
    const jobs = { ...createWorkload("jobs"), productId: "jobs_classic" };
    const again = { ...createWorkload("jobs"), productId: "jobs_classic" };
    const withLines = {
      ...emptyEstimate(),
      lines: [line(jobs.id, 10), line(again.id, 5)],
      dbuCost: 15,
      total: 15,
    };
    const grouped = forecastProducts(withLines, { ...portfolio, workloads: [jobs, again] });
    expect(grouped.lines).toHaveLength(1);
    expect(grouped.lines[0]?.monthly).toBe(15);
    const zero = forecastProducts(emptyEstimate(), portfolio);
    expect(zero.year).toBe(0);
    expect(zero.lines).toEqual([]);
  });

  it("names the planning range, a fitted miss, and the Azure single list", () => {
    const plan = defaultPlan();
    const quiet = explain(plan, emptyEstimate(), band(false));
    expect(quiet.some((line) => line.includes("15% under to 20% over"))).toBe(true);
    const flat = explain(
      { ...plan, monthlyGrowth: 0, commitDiscount: 0.3, usageDbu: 100 },
      emptyEstimate(),
      band(true),
    );
    expect(flat.some((line) => line.includes("Growth is flat"))).toBe(true);
    expect(flat.some((line) => line.includes("usage file"))).toBe(true);
    const azure = explain(
      { ...plan, cloud: "azure", tier: "enterprise", region: "eastus" },
      { ...emptyEstimate(), lines: [{ ...line("a", 1), approximateVm: true }] },
      band(false),
    );
    expect(azure.some((line) => line.includes("Azure publishes one plan"))).toBe(true);
    expect(azure.some((line) => line.includes("15% under to 28% over"))).toBe(true);
    const fitted = explain(
      {
        ...plan,
        usageForecast: {
          method: "log-linear",
          mape: 0.0002,
          holdout: 3,
          monthlyGrowth: 0.01,
          ratios: [],
        },
      },
      emptyEstimate(),
      band(false),
    );
    expect(fitted.some((line) => line.includes("under 0.1%"))).toBe(true);
    const wider = explain(
      {
        ...plan,
        usageForecast: { method: "log-linear", mape: 0.042, holdout: 3, monthlyGrowth: 0, ratios: [] },
      },
      emptyEstimate(),
      band(false),
    );
    expect(wider.some((line) => line.includes("4.2%"))).toBe(true);
    const coarse = explain(
      {
        ...plan,
        usageForecast: { method: "log-linear", mape: 0.2, holdout: 3, monthlyGrowth: 0, ratios: [] },
      },
      emptyEstimate(),
      band(false),
    );
    expect(coarse.some((line) => line.includes("20%"))).toBe(true);
    const unmeasured = explain(
      { ...plan, usageForecast: { method: "log-linear", mape: null, holdout: 0, monthlyGrowth: 0, ratios: [] } },
      emptyEstimate(),
      band(false),
    );
    expect(unmeasured.some((line) => line.includes("log-linear") && !line.includes("missed"))).toBe(true);
  });

  it("warns about idle SQL, spot notebooks, Photon, a shrinking commit, and a stand-in VM rate", () => {
    const sql = createWorkload("sql");
    if (sql.kind !== "sql") throw new Error("sql");
    sql.edition = "classic";
    sql.scale = { min: 1, max: 1, utilization: 1 };
    sql.schedule = { hoursPerDay: 20, daysPerWeek: 5 };
    const notebooks = createWorkload("all_purpose");
    if (notebooks.kind !== "cluster") throw new Error("cluster");
    notebooks.spotShare = 0.8;
    notebooks.photon = true;
    notebooks.schedule = { hoursPerDay: 24, daysPerWeek: 7 };
    const portfolio: Portfolio = {
      ...blankPortfolio(),
      commitment: { dbuDiscount: 0.37, cloudDiscount: 0 },
      forecast: { ...blankPortfolio().forecast, annualGrowth: -0.1 },
      workloads: [sql, notebooks],
    };
    const found = tips(portfolio, {
      ...emptyEstimate(),
      warnings: ["At least one VM rate is a reference-region stand-in."],
    });
    expect(found.map((tip) => tip.id)).toEqual(
      expect.arrayContaining([
        `sql-${sql.id}`,
        `spot-${notebooks.id}`,
        "photon",
        "commit-decline",
        "calibrate",
        "vm-approx",
      ]),
    );
    expect(classicClusterHours(portfolio)).toBeGreaterThan(0);
    expect(clampCommitment(2)).toBe(0.95);
    const jobs = createWorkload("jobs");
    if (jobs.kind !== "cluster") throw new Error("jobs");
    jobs.scale = { min: 4, max: 8, utilization: 0.4 };
    const sized = applyRecommendation({ ...blankPortfolio(), workloads: [jobs] }, "rightsize");
    const next = sized.workloads[0];
    expect(next?.kind === "cluster" && next.scale.min).toBe(2);
    const flat = createWorkload("jobs");
    if (flat.kind !== "cluster") throw new Error("jobs");
    flat.scale = { min: 4, max: 4, utilization: 1 };
    const shrunk = applyRecommendation({ ...blankPortfolio(), workloads: [flat] }, "rightsize");
    const shrunkScale = shrunk.workloads[0];
    expect(shrunkScale?.kind === "cluster" && shrunkScale.scale.min).toBe(3);
  });
});

function band(calibrated: boolean) {
  return { low: 1, expected: 2, high: 3, calibrated, reasons: [] };
}

function emptyEstimate(): Estimate {
  return {
    catalogVersion: "test",
    verifiedOn: "2026-10-16",
    disclaimer: "",
    lines: [],
    dbu: 0,
    dbuCost: 0,
    cloudCost: 0,
    addonCost: 0,
    total: 0,
    warnings: [],
    usageScale: 1,
  };
}

function line(workloadId: string, total: number): Estimate["lines"][number] {
  return {
    workloadId,
    name: workloadId,
    kind: "cluster",
    sku: "jobs_classic",
    hours: 1,
    dbu: 1,
    dbuCost: total,
    cloudCost: 0,
    total,
    approximateVm: false,
    notes: [],
  };
}
