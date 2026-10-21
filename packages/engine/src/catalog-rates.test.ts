import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import {
  firstPartyBaseDbuRate,
  firstPartyDbuConflict,
  firstPartyDbuRate,
  regionalSkuRate,
  skuRate,
} from "./catalog.js";
import { buildUnitCostCatalog } from "./unit-costs/builder.js";
import { estimate } from "./estimate.js";
import { blankPortfolio } from "./portfolio.js";
import type { Workload } from "./types.js";
import { publishedDbuRates } from "./catalog/sources/published-dbu.js";
import { azureDbuMeters } from "./catalog/sources/azure-meters.js";

describe("shared first-party DBU price resolution", () => {
  it("traces manually mapped Zerobus GB rates to the exact retained first-party price card", () => {
    const cards = JSON.parse(
      gunzipSync(
        readFileSync(new URL("../../../data/sources/databricks-price-cards.json.gz", import.meta.url)),
      ).toString(),
    );
    const rows = buildUnitCostCatalog().rows.filter((row) => row.productId === "zerobus" && row.unitPriceUsd !== null);
    expect(rows).toHaveLength(4);
    for (const row of rows) {
      const tier = row.cloud === "azure" ? "premium" : row.tier!;
      const cloud = row.cloud === "azure" ? "Azure" : "AWS";
      const region = row.cloud === "azure" ? "US East" : "US East (N. Virginia)";
      expect(row.unit).toBe("GB");
      expect(row.unitPriceUsd).toBe(Number(cards[tier][cloud].zerobus[region]));
      expect(row.sources[0].locator).toContain(`/zerobus/${region}`);
      expect(row.evidenceLevel).toBe("official");
    }
  });
  it("resolves actual regional prices and traces precise publisher fields", () => {
    const rate = firstPartyDbuRate("aws", "sa-east-1", "premium", "jobs_classic")!;
    expect(rate.usdPerDbu).toBe(0.15);
    expect(rate.region).toBe("sa-east-1");
    expect(rate.sourceUrl).toBe("https://www.databricks.com/en-pricing-assets/data/pricing/cards.json");
    expect(rate.locator).toContain("JSON pointer /premium/AWS/");
    const observation = publishedDbuRates.find(
      (row) =>
        row.cloud === "aws" && row.region === "sa-east-1" && row.tier === "premium" && row.sku === "jobs_classic",
    )!;
    expect(rate.observedOn).toBe(observation.observedOn);
    expect(rate.effectiveFrom).toBeNull();
    expect(regionalSkuRate("aws", "sa-east-1", "premium", "jobs_classic")).toBe(rate.usdPerDbu);
    expect(firstPartyDbuRate("gcp", "us-central1", "premium", "model_serving")!.usdPerDbu).toBe(0.07);
    expect(skuRate("aws", "premium", "apps")).toBe(firstPartyBaseDbuRate("aws", "premium", "apps")!.usdPerDbu);
  });

  it("keeps explicitly unscoped bases and unsupported alias coverage separate from regional tariffs", () => {
    expect(firstPartyDbuRate("aws", null, "premium", "jobs_classic")!.region).toBeNull();
    expect(firstPartyDbuRate("aws", "unpublished-region", "premium", "jobs_classic")).toBeNull();
    expect(firstPartyDbuRate("aws", "us-east-1", "premium", "ai_search")).toBeNull();
    expect(firstPartyDbuRate("azure", null, "premium", "jobs_classic")).toBeNull();
    expect(firstPartyDbuConflict("aws", "sa-east-1", "premium", "jobs_classic")).toBeNull();
  });

  it("retains Azure meter observations separately from documentation and effective dates", () => {
    const rate = firstPartyDbuRate("azure", "eastus", "premium", "jobs_classic")!;
    expect(rate.usdPerDbu).toBe(0.3);
    const observation = azureDbuMeters.find((row) => row.region === "eastus" && row.sku === "jobs_classic")!;
    expect(rate.observedOn).toBe(observation.asOf);
    expect(rate.effectiveFrom).toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect(new URL(rate.sourceUrl).hostname).toBe("prices.azure.com");
    expect(rate.locator).toContain("meter ");
    expect(firstPartyDbuRate("azure", "eastus", "enterprise", "jobs_classic")!.usdPerDbu).toBe(rate.usdPerDbu);
  });

  it("withholds an official disagreement across unit costs and the forecast instead of substituting a proxy", () => {
    const conflict = firstPartyDbuConflict("gcp", "europe-west1", "premium", "model_serving")!;
    expect(conflict.values).toEqual([0.082, 0.08]);
    expect(conflict.sources).toHaveLength(2);
    expect(conflict.sources.every((source) => source.locator.includes("/DBU"))).toBe(true);
    expect(firstPartyDbuRate("gcp", "europe-west1", "premium", "model_serving")).toBeNull();
    const unit = buildUnitCostCatalog().rows.find(
      (row) =>
        row.productId === "model_serving_cpu" &&
        row.cloud === "gcp" &&
        row.region === "europe-west1" &&
        row.tier === "premium",
    )!;
    expect(unit.unitPriceUsd).toBeNull();
    expect(unit.confidence).toBe("conflict");
    expect(unit.evidenceLevel).toBe("unresolved");
    const workload: Workload = {
      id: "serving",
      name: "Serving",
      kind: "model_serving",
      mode: "cpu",
      concurrency: 1,
      replicas: 1,
      gpuId: "t4",
      schedule: { hoursPerDay: 1, daysPerWeek: 1 },
    };
    const result = estimate({ ...blankPortfolio("gcp"), region: "europe-west1", workloads: [workload] });
    expect(result.dbu).toBeGreaterThan(0);
    expect(result.dbuCost).toBe(0);
    expect(result.lines[0].priceStatus).toBe("unpriced");
    expect(result.lines[0].rateProvenance!.label).toContain("conflict");
    expect(result.lines[0].notes.some((note) => note.includes("sources disagree"))).toBe(true);
    expect(result.coverage!.complete).toBe(false);
    expect(result.warnings.join(" ")).toContain("known subtotal");
  });

  it("preserves a supplied independent rate when the public book contains a conflict", () => {
    const workload: Workload = {
      id: "actual",
      name: "Actual cost",
      kind: "metered",
      sku: "model_serving",
      dbuPerMonth: 100,
      rateByCloud: { gcp: 0.04 },
      rateProvenance: { kind: "custom", label: "Negotiated rate", currency: "USD" },
    };
    const result = estimate({ ...blankPortfolio("gcp"), region: "europe-west1", workloads: [workload] });
    expect(result.dbuCost).toBe(4);
    expect(result.lines[0].priceStatus).toBe("priced");
    expect(result.lines[0].rateProvenance!.label).toBe("Negotiated rate");
  });
});
