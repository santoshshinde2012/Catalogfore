import { describe, expect, it } from "vitest";
import { listRegions, regionInfo, skuCatalog } from "./catalog.js";
import { estimate } from "./estimate.js";
import { annualTotal, forecast, RETAIL_SEASONALITY } from "./forecast.js";
import { MONTH_WEEKS, roundMoney } from "./money.js";
import { blankPortfolio, decodePortfolio, encodePortfolio, normalizePortfolio } from "./portfolio.js";
import { applyScenario, compareScenarios } from "./scenarios.js";
import { importUsageCsv, scaleForActuals } from "./usage.js";
import { tips } from "./tips.js";
import type { Portfolio, Workload } from "./types.js";

function jobPortfolio(overrides: Partial<Extract<Workload, { kind: "cluster" }>> = {}): Portfolio {
  const portfolio = blankPortfolio();
  portfolio.forecast.annualGrowth = 0;
  portfolio.forecast.seasonality = "flat";
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
    ...overrides,
  };
  portfolio.workloads = [workload];
  return portfolio;
}

describe("classic jobs estimate", () => {
  const hours = 8 * 5 * MONTH_WEEKS;

  it("splits DBU and VM and leaves spot and Photon off the DBU rate", () => {
    const result = estimate(jobPortfolio());
    expect(result.lines[0].dbu).toBeCloseTo(3 * 0.69 * hours, 6);
    expect(result.lines[0].dbuCost).toBe(roundMoney(3 * 0.69 * hours * 0.15));
    expect(result.lines[0].cloudCost).toBe(roundMoney(3 * 0.192 * hours));
    expect(result.total).toBe(roundMoney(result.dbuCost + result.cloudCost));
    expect(result.dbuCost).toBe(53.82);
    expect(result.cloudCost).toBe(99.84);
    expect(result.lines[0].notes[0]).toContain("× 0.69 DBU/h ×");
    expect(result.lines[0].notes[0]).toContain("$0.15/DBU");
  });

  it("applies Photon to DBU emission only", () => {
    const result = estimate(jobPortfolio({ photon: true }));
    expect(result.dbuCost).toBe(roundMoney(53.82 * skuCatalog.photonMultiplier));
    expect(result.cloudCost).toBe(99.84);
    expect(result.lines[0].notes.some((note) => note.includes("Photon"))).toBe(true);
  });

  it("discounts spot worker VMs and not DBUs or the driver", () => {
    const result = estimate(jobPortfolio({ spotShare: 0.5, spotDiscount: 0.6 }));
    const driver = 0.192 * hours;
    const workerOnDemand = 0.192 * hours;
    const workerSpot = 0.06144 * hours;
    expect(result.dbuCost).toBe(53.82);
    expect(result.cloudCost).toBe(roundMoney(driver + workerOnDemand + workerSpot));
    expect(result.lines[0].notes.some((note) => note.includes("Spot advisor"))).toBe(true);
  });

  it("uses the slider discount when it is not the default advisor rate", () => {
    const result = estimate(jobPortfolio({ spotShare: 0.5, spotDiscount: 0.5 }));
    const driver = 0.192 * hours;
    const workerOnDemand = 0.192 * hours;
    const workerSpot = 0.192 * 0.5 * hours;
    expect(result.cloudCost).toBe(roundMoney(driver + workerOnDemand + workerSpot));
    expect(result.lines[0].notes.some((note) => note.includes("50% spot discount"))).toBe(true);
  });

  it("applies a cloud commit to on-demand hours only", () => {
    const portfolio = jobPortfolio({ spotShare: 0.5, spotDiscount: 0.6 });
    portfolio.commitment.cloudDiscount = 0.3;
    const result = estimate(portfolio);
    const driver = 0.192 * hours * 0.7;
    const workerOnDemand = 0.192 * hours * 0.7;
    const workerSpot = 0.06144 * hours;
    expect(result.cloudCost).toBe(roundMoney(driver + workerOnDemand + workerSpot));
    expect(result.dbuCost).toBe(53.82);
  });

  it("applies a DBU commit without touching the VM line", () => {
    const portfolio = jobPortfolio();
    portfolio.commitment.dbuDiscount = 0.37;
    expect(estimate(portfolio).dbuCost).toBe(roundMoney(53.82 * 0.63));
    expect(estimate(portfolio).cloudCost).toBe(99.84);
  });

  it("scales DBU price by a regional factor and flags the VM rate", () => {
    const portfolio = jobPortfolio();
    portfolio.region = "sa-east-1";
    const result = estimate(portfolio);
    const factor = regionInfo("aws", "sa-east-1").factor;
    const dbu = 3 * 0.69 * hours;
    expect(factor).toBeCloseTo(0.87 / 0.55, 5);
    expect(result.dbuCost).toBe(roundMoney(dbu * 0.15 * factor));
    expect(result.cloudCost).toBe(roundMoney(3 * 0.306 * hours));
    expect(result.lines[0].approximateVm).toBe(false);
  });

  it("flags a VM when the instance is not in the price file", () => {
    const portfolio = jobPortfolio();
    const workload = portfolio.workloads[0];
    if (workload.kind !== "cluster") throw new Error("expected a cluster");
    workload.instanceId = "no.such";
    const result = estimate(portfolio);
    expect(result.dbu).toBe(0);
    expect(result.cloudCost).toBe(0);
    expect(result.lines[0].approximateVm).toBe(true);
  });
});

describe("serverless and SQL", () => {
  it("does not add a VM line or a Photon multiplier for serverless jobs", () => {
    const portfolio = blankPortfolio();
    portfolio.workloads = [
      {
        id: "s",
        name: "Serverless job",
        kind: "serverless_compute",
        sku: "jobs_serverless",
        dbuPerHour: 10,
        schedule: { hoursPerDay: 8, daysPerWeek: 5 },
      },
    ];
    const result = estimate(portfolio);
    const hours = 8 * 5 * MONTH_WEEKS;
    expect(result.cloudCost).toBe(0);
    expect(result.dbuCost).toBe(roundMoney(10 * hours * 0.35));
  });

  it("prices serverless SQL from the t-shirt ladder with no VM", () => {
    const portfolio = blankPortfolio();
    portfolio.workloads = [
      {
        id: "sql",
        name: "BI",
        kind: "sql",
        edition: "serverless",
        size: "s",
        scale: { min: 1, max: 1, utilization: 1 },
        schedule: { hoursPerDay: 8, daysPerWeek: 5 },
      },
    ];
    const result = estimate(portfolio);
    expect(result.dbuCost).toBe(roundMoney(12 * 8 * 5 * MONTH_WEEKS * 0.7));
    expect(result.cloudCost).toBe(0);
    expect(result.lines[0].notes.some((note) => note.includes("Photon"))).toBe(false);
  });

  it("adds the SQL VM assumption only for classic", () => {
    const portfolio = blankPortfolio();
    portfolio.workloads = [
      {
        id: "sql",
        name: "Classic BI",
        kind: "sql",
        edition: "classic",
        size: "s",
        scale: { min: 1, max: 1, utilization: 1 },
        schedule: { hoursPerDay: 8, daysPerWeek: 5 },
      },
    ];
    const result = estimate(portfolio);
    const dbu = 12 * 8 * 5 * MONTH_WEEKS;
    expect(result.dbuCost).toBe(roundMoney(dbu * 0.22));
    expect(result.cloudCost).toBe(roundMoney(dbu * skuCatalog.sqlVmDollarsPerDbuHour));
  });
});

describe("forecast", () => {
  it("keeps a flat year equal to twelve steady months", () => {
    const portfolio = jobPortfolio();
    const result = estimate(portfolio);
    const points = forecast(result, portfolio.forecast);
    expect(points).toHaveLength(12);
    expect(points[0].total).toBe(result.total);
    expect(annualTotal(points)).toBe(roundMoney(result.total * 12));
  });

  it("compounds growth and normalizes retail seasonality", () => {
    const portfolio = jobPortfolio();
    portfolio.forecast.annualGrowth = 0.12;
    portfolio.forecast.months = 24;
    portfolio.forecast.seasonality = "retail";
    const result = estimate(portfolio);
    const points = forecast(result, portfolio.forecast);
    const mean = RETAIL_SEASONALITY.reduce((sum, value) => sum + value, 0) / 12;
    expect(points[0].total).toBe(roundMoney(result.total * (RETAIL_SEASONALITY[0] / mean)));
    expect(points[12].total / points[0].total).toBeCloseTo(1.12, 2);
    const flat = forecast(result, { ...portfolio.forecast, annualGrowth: 0, months: 12 });
    expect(annualTotal(flat)).toBeCloseTo(result.total * 12, 0);
  });
});

describe("scenarios", () => {
  it("reprices the same DBUs onto serverless and removes the VM", () => {
    const portfolio = jobPortfolio();
    const converted = estimate(applyScenario(portfolio, "jobs_serverless"));
    expect(converted.cloudCost).toBe(0);
    expect(converted.dbuCost).toBe(roundMoney(53.82 * (0.35 / 0.15)));
    expect(converted.total).toBeLessThan(estimate(portfolio).total);
  });

  it("does not stack a cloud commit onto spot hours", () => {
    const compared = compareScenarios(jobPortfolio(), ["spot_70", "commit_37_cloud_30"]);
    const spot = compared[0].estimate;
    const both = compared[1].estimate;
    expect(spot.dbuCost).toBe(53.82);
    expect(spot.cloudCost).toBeLessThan(99.84);
    expect(both.dbuCost).toBe(roundMoney(53.82 * 0.63));
    const stacked = jobPortfolio({ spotShare: 0.7, spotDiscount: 0.6 });
    stacked.commitment.cloudDiscount = 0.3;
    const combined = estimate(stacked);
    expect(combined.cloudCost).toBeLessThan(spot.cloudCost);
    expect(combined.cloudCost).toBeGreaterThan(roundMoney(spot.cloudCost * 0.7));
  });
});

describe("usage import and share links", () => {
  it("nets retractions and ignores non-DBU rows", () => {
    const csv = [
      "sku_name,usage_quantity,usage_unit,record_type,usage_date",
      "ENTERPRISE_JOBS_COMPUTE,100,DBU,ORIGINAL,2026-09-01",
      "ENTERPRISE_JOBS_COMPUTE,-10,DBU,RETRACTION,2026-09-02",
      "PREMIUM_ALL_PURPOSE_COMPUTE,50,DBU,ORIGINAL,2026-09-15",
      "STORAGE,20,DSU,ORIGINAL,2026-09-01",
      'PREMIUM_SERVERLESS_SQL_COMPUTE,"25.5",DBU,ORIGINAL,2026-09-20',
    ].join("\n");
    const imported = importUsageCsv(csv);
    expect(imported.dbu).toBe(165.5);
    expect(imported.skippedRows).toBe(1);
    expect(imported.bySku.find((row) => row.sku === "jobs_classic")?.dbu).toBe(90);
    expect(scaleForActuals(53.82, imported.dbu)).toBeCloseTo(imported.dbu / 53.82);
  });

  it("round-trips a portfolio through a share hash", () => {
    const portfolio = jobPortfolio();
    portfolio.name = "Shared desk";
    portfolio.forecast.seasonality = "retail";
    const restored = decodePortfolio(encodePortfolio(portfolio));
    expect(restored).toEqual(normalizePortfolio(portfolio));
    expect(decodePortfolio("not-a-payload")).toBeNull();
  });
});

describe("other products", () => {
  it("prices foundation-model tokens at the model-serving rate", () => {
    const portfolio = blankPortfolio();
    portfolio.workloads = [
      {
        id: "fm",
        name: "Llama",
        kind: "foundation_model",
        modelId: "llama4-maverick",
        inputTokensPerMonth: 1_000_000,
        outputTokensPerMonth: 1_000_000,
        provisionedHoursPerMonth: 0,
      },
    ];
    const result = estimate(portfolio);
    expect(result.dbuCost).toBe(roundMoney((7.143 + 21.429) * 0.07));
    expect(result.cloudCost).toBe(0);
  });

  it("prices a standard AI Search unit without charging the free storage tier", () => {
    const portfolio = blankPortfolio();
    portfolio.workloads = [
      {
        id: "vs",
        name: "Search",
        kind: "ai_search",
        variant: "standard",
        units: 1,
        storageGb: 20,
        schedule: { hoursPerDay: 24, daysPerWeek: 7 },
      },
    ];
    const result = estimate(portfolio);
    const hours = 24 * 7 * MONTH_WEEKS;
    expect(result.dbuCost).toBe(roundMoney(4 * hours * 0.07));
    expect(result.cloudCost).toBe(0);
  });

  it("charges AI Search storage above the free allotment", () => {
    const portfolio = blankPortfolio();
    portfolio.workloads = [
      {
        id: "vs",
        name: "Search",
        kind: "ai_search",
        variant: "standard",
        units: 1,
        storageGb: 50,
        schedule: { hoursPerDay: 24, daysPerWeek: 7 },
      },
    ];
    expect(estimate(portfolio).cloudCost).toBe(roundMoney(20 * 0.23));
  });

  it("bills CPU serving as one DBU per concurrent request-hour", () => {
    const portfolio = blankPortfolio();
    portfolio.workloads = [
      {
        id: "ms",
        name: "Endpoint",
        kind: "model_serving",
        mode: "cpu",
        concurrency: 2,
        gpuId: "t4",
        replicas: 9,
        schedule: { hoursPerDay: 10, daysPerWeek: 5 },
      },
    ];
    const hours = 10 * 5 * MONTH_WEEKS;
    expect(estimate(portfolio).dbuCost).toBe(roundMoney(2 * hours * 0.07));
  });

  it("prices Azure Lakebase from the Database Serverless meter", () => {
    const portfolio = blankPortfolio("azure");
    portfolio.region = "eastus";
    portfolio.workloads = [
      { id: "lb", name: "LB", kind: "lakebase", cu: 4, storageGb: 10, schedule: { hoursPerDay: 24, daysPerWeek: 7 } },
    ];
    const hours = 24 * 7 * MONTH_WEEKS;
    const cuHour = 0.213 * 0.26;
    expect(skuCatalog.lakebase.usdPerCuHour.azure).toBeCloseTo(cuHour, 5);
    const result = estimate(portfolio);
    expect(result.dbuCost).toBe(roundMoney(4 * hours * cuHour));
    expect(result.cloudCost).toBe(roundMoney(10 * 0.39));
  });

  it("does not price Lakebase on GCP", () => {
    const portfolio = blankPortfolio("gcp");
    portfolio.workloads = [
      { id: "lb", name: "LB", kind: "lakebase", cu: 4, storageGb: 10, schedule: { hoursPerDay: 24, daysPerWeek: 7 } },
    ];
    const result = estimate(portfolio);
    expect(result.total).toBe(0);
    expect(result.lines[0].notes.join(" ")).toMatch(/not priced/i);
  });

  it("applies the compliance add-on to DBU spend and scales from usage", () => {
    const portfolio = jobPortfolio();
    portfolio.addon = "compliance";
    portfolio.usageScale = 2;
    const result = estimate(portfolio);
    expect(result.dbuCost).toBe(roundMoney(53.82 * 2));
    expect(result.addonCost).toBe(roundMoney(result.dbuCost * 0.1));
    expect(result.cloudCost).toBe(roundMoney(99.84 * 2));
  });

  it("cuts Photon hours in half only for the measured-speedup scenario", () => {
    const photon = estimate(applyScenario(jobPortfolio(), "photon_on"));
    const faster = estimate(applyScenario(jobPortfolio(), "photon_speedup_2"));
    expect(faster.dbu).toBeCloseTo(photon.dbu / 2, 5);
    expect(faster.cloudCost).toBeCloseTo(photon.cloudCost / 2, 1);
  });

  it("scales Azure by the official Lakehouse Real-Time ratio versus East US $0.70", () => {
    expect(regionInfo("azure", "eastus").factor).toBe(1);
    expect(regionInfo("azure", "westeurope").factor).toBeCloseTo(0.83 / 0.7, 6);
    expect(regionInfo("azure", "switzerlandwest").factor).toBeCloseTo(1.42 / 0.7, 6);
    expect(regionInfo("azure", "australiaeast").source).toBe("proxy-lakehouse-rt");
    expect(listRegions("azure").length).toBe(39);
  });

  it("lists every AWS region from the Lakehouse Real-Time price table", () => {
    const ids = [
      "us-east-1",
      "us-east-2",
      "us-west-1",
      "us-west-2",
      "ca-central-1",
      "eu-west-1",
      "eu-west-2",
      "eu-west-3",
      "eu-central-1",
      "ap-south-1",
      "ap-northeast-1",
      "ap-northeast-2",
      "ap-southeast-1",
      "ap-southeast-2",
      "ap-southeast-3",
      "sa-east-1",
    ];
    for (const id of ids) expect(regionInfo("aws", id).id).toBe(id);
  });
});

describe("tips and catalog", () => {
  it("warns when all-purpose dominates", () => {
    const portfolio = blankPortfolio();
    portfolio.usageScale = 2;
    portfolio.workloads = [
      {
        id: "ap",
        name: "Notebooks",
        kind: "cluster",
        sku: "all_purpose_classic",
        instanceId: "m5.xlarge",
        scale: { min: 2, max: 2, utilization: 1 },
        photon: false,
        spotShare: 0,
        spotDiscount: 0.6,
        schedule: { hoursPerDay: 10, daysPerWeek: 5 },
      },
    ];
    const result = estimate(portfolio);
    expect(tips(portfolio, result).some((tip) => tip.id === "all-purpose")).toBe(true);
    expect(result.usageScale).toBe(2);
  });

  it("has a rate, a DBU count, and a VM seed for every curated instance family", () => {
    for (const cloud of ["aws", "azure", "gcp"] as const) {
      for (const tier of ["premium", "enterprise"] as const) {
        expect(skuCatalog.rates[cloud][tier].jobs_classic).toBeGreaterThan(0);
        expect(skuCatalog.rates[cloud][tier].sql_serverless).toBe(0.7);
      }
    }
    expect(skuCatalog.sqlDbuPerHour["4xl"]).toBe(528);
    expect(skuCatalog.photonMultiplier).toBe(2.9);
  });
});
