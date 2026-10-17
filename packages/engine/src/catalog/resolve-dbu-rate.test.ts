import { describe, expect, it, vi } from "vitest";
import { skuCatalog } from "../catalog.js";
import { estimate } from "../estimate.js";
import { blankPortfolio } from "../portfolio.js";
import type { SkuId } from "../types.js";
import { dbuRate } from "../unit-costs/dbu-rate.js";
import type { DbuRateObservation } from "./dbu-rate-types.js";
import { bundledPricingCatalog } from "./pricing-catalog.js";
import { resolveDbuRate, type DbuRatePlacement } from "./resolve-dbu-rate.js";

const placement: DbuRatePlacement = { cloud: "aws", region: "eu-west-1", tier: "premium", factor: 1.2 };
const observation: DbuRateObservation = {
  ...placement,
  sku: "jobs_classic",
  usdPerDbu: 0.2,
  sourceUrl: "https://www.databricks.com/en-pricing-assets/data/pricing/cards.json",
  title: "Databricks public product price card",
  locator: "JSON pointer /premium/AWS/jobs/Europe",
  observedOn: "2026-02-03",
  effectiveFrom: "2026-01-01",
  unitOfMeasure: "DBU",
};

function book() {
  return {
    skuRate: () => 0.1,
    referenceRegion: { aws: "us-east-1", azure: "eastus", gcp: "us-central1" } as const,
    referenceDbuRate: () => ({
      ...observation,
      region: "us-east-1",
      usdPerDbu: 0.1,
      sourceUrl: "https://www.flexera.com/blog/finops/databricks-pricing-guide/",
      title: "Secondary reference",
      observedOn: "2026-10-15",
      effectiveFrom: null,
    }),
  };
}

describe("canonical USD/DBU resolution policy", () => {
  it("keeps value, exact scope, numeric locator and observation dates together", () => {
    const quote = resolveDbuRate({ ...book(), firstPartyDbuRate: () => observation }, placement, "jobs_classic");
    expect(quote).toMatchObject({
      kind: "exact",
      usdPerDbu: 0.2,
      baseRateUsd: 0.2,
      regionFactor: 1,
      sourceRegion: "eu-west-1",
      status: "priced",
      confidence: "measured",
      observation,
      reference: null,
      effectiveFrom: "2026-01-01",
    });
    expect(quote.sources).toEqual([
      {
        title: observation.title,
        url: observation.sourceUrl,
        role: "price",
        observedOn: "2026-02-03",
        locator: observation.locator,
      },
    ]);
    expect(quote.basis).toContain("observed 2026-02-03");
    const undated = resolveDbuRate(
      { ...book(), firstPartyDbuRate: () => ({ ...observation, observedOn: null }) },
      placement,
      "jobs_classic",
    );
    expect(undated.sources[0].observedOn).toBeNull();
    expect(undated.notes.join(" ")).toContain("no per-row observation date");
  });

  it("labels a reference conversion as a proxy and does not turn its unscoped base into an exact quote", () => {
    const reference = { ...observation, region: null, usdPerDbu: 0.1, effectiveFrom: null };
    const quote = resolveDbuRate({ ...book(), firstPartyBaseDbuRate: () => reference }, placement, "jobs_classic");
    expect(quote).toMatchObject({
      kind: "reference",
      usdPerDbu: 0.12,
      baseRateUsd: 0.1,
      regionFactor: 1.2,
      sourceRegion: null,
      confidence: "proxy",
      status: "approximate",
      reference,
      observation: null,
      effectiveFrom: null,
    });
    expect(quote.notes.join(" ")).toContain("omits regional scope");
    expect(quote.sources.map((source) => source.role)).toEqual(["price", "region"]);
    expect(quote.sources[0].observedOn).toBe("2026-02-03");
    const secondary = resolveDbuRate(book(), { ...placement, region: "us-east-1", factor: 1 }, "jobs_classic");
    expect(secondary.confidence).toBe("secondary");
    expect(secondary.sources[0].observedOn).toBe("2026-10-15");
    expect(resolveDbuRate(book(), placement, "jobs_classic").confidence).toBe("proxy");
  });

  it("withholds a conflict before calling exact or fallback price providers", () => {
    const conflict = {
      ...placement,
      sku: "jobs_classic" as const,
      reason: "disagree",
      values: [0.1, 0.2],
      sources: [{ title: observation.title, url: observation.sourceUrl, observedOn: null, locator: "row 1" }],
    };
    const exact = vi.fn(() => observation);
    const fallback = vi.fn(() => 0.1);
    const quote = resolveDbuRate(
      { ...book(), skuRate: fallback, firstPartyDbuRate: exact, firstPartyDbuConflict: () => conflict },
      placement,
      "jobs_classic",
    );
    expect(quote).toMatchObject({ kind: "conflict", usdPerDbu: null, baseRateUsd: null, regionFactor: null, conflict });
    expect(quote.sources[0].locator).toBe("row 1");
    expect(quote.basis).toContain("$0.1/DBU versus $0.2/DBU");
    expect(exact).not.toHaveBeenCalled();
    expect(fallback).not.toHaveBeenCalled();
  });

  it("preserves injectable numeric quotes without attaching mismatched first-party evidence", () => {
    const quote = resolveDbuRate(
      { ...book(), regionalSkuRate: () => 0.3, firstPartyDbuRate: () => observation },
      placement,
      "jobs_classic",
    );
    expect(quote).toMatchObject({ usdPerDbu: 0.3, confidence: "assumption", status: "approximate", observation: null });
    expect(quote.sources).toEqual([]);
    expect(quote.basis).toContain("Injected catalog");
    const zero = resolveDbuRate({ ...book(), regionalSkuRate: () => 0 }, placement, "jobs_classic");
    expect(zero.usdPerDbu).toBe(0);
    const unrelatedReference = resolveDbuRate(
      { ...book(), firstPartyBaseDbuRate: () => observation },
      placement,
      "jobs_classic",
    );
    expect(unrelatedReference.reference).toBeNull();
    expect(unrelatedReference.sources.every((source) => source.role !== "price")).toBe(true);
    expect(unrelatedReference.confidence).toBe("assumption");
  });

  it("keeps missing, negative or non-finite prices and factors unresolved", () => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, -1]) {
      expect(resolveDbuRate({ skuRate: () => value }, placement, "jobs_classic").usdPerDbu).toBeNull();
      expect(resolveDbuRate(book(), { ...placement, factor: value }, "jobs_classic").status).toBe("unpriced");
      expect(resolveDbuRate({ ...book(), regionalSkuRate: () => value }, placement, "jobs_classic").status).toBe(
        "unpriced",
      );
    }
    expect(resolveDbuRate(book(), { ...placement, factor: 0 }, "jobs_classic").status).toBe("unpriced");
    const noSourceRegion = resolveDbuRate({ skuRate: () => 0.1 }, placement, "jobs_classic");
    expect(noSourceRegion.sourceRegion).toBeNull();
    expect(noSourceRegion.basis).toContain("reference region not recorded");
  });

  it("replaces generic catalog citations with the source and date of the numeric quote actually used", () => {
    const result = estimate({
      ...blankPortfolio("aws"),
      region: "eu-west-1",
      workloads: [
        {
          id: "catalog",
          name: "Catalog usage",
          kind: "metered",
          sku: "ai_search",
          dbuPerMonth: 100,
          priceStatus: "priced",
          rateProvenance: {
            kind: "catalog",
            currency: "USD",
            label: "Generic product page",
            source: "https://www.databricks.com/product/pricing/ai-search",
            verifiedOn: "2026-10-17",
          },
        },
      ],
    });
    const line = result.lines[0];
    expect(line.priceStatus).toBe("approximate");
    expect(line.rateProvenance).toMatchObject({
      source: "https://www.flexera.com/blog/finops/databricks-pricing-guide/",
      verifiedOn: "2026-10-15",
      catalogVersion: skuCatalog.version,
    });
  });

  it("agrees across every bundled DBU placement, the unit book, forecast subtotal and provenance", () => {
    const mismatches: string[] = [];
    for (const region of skuCatalog.regions) {
      for (const tier of ["premium", "enterprise"] as const) {
        for (const sku of Object.keys(skuCatalog.rates[region.cloud][tier]) as SkuId[]) {
          const quote = resolveDbuRate(
            bundledPricingCatalog,
            { cloud: region.cloud, region: region.id, tier, factor: region.factor },
            sku,
          );
          const unit = dbuRate(region, tier, sku);
          const result = estimate({
            ...blankPortfolio(region.cloud),
            region: region.id,
            tier,
            workloads: [{ id: "usage", name: "Usage", kind: "metered", sku, dbuPerMonth: 100 }],
          });
          const line = result.lines[0];
          const source = quote.sources.find((reference) => reference.role === "price");
          const numeric = quote.observation ?? quote.reference;
          if (
            unit.rate !== quote.usdPerDbu ||
            unit.baseRateUsd !== quote.baseRateUsd ||
            unit.regionFactor !== quote.regionFactor ||
            unit.status !== quote.status ||
            unit.confidence !== quote.confidence ||
            unit.sources[0]?.url !== quote.sources[0]?.url ||
            Math.abs(line.dbuCost - Math.round((quote.usdPerDbu ?? 0) * 10000) / 100) > 1e-8 ||
            line.priceStatus !== quote.status ||
            (source && line.rateProvenance?.source !== source.url) ||
            (numeric?.observedOn && line.rateProvenance?.verifiedOn !== numeric.observedOn)
          ) {
            mismatches.push(`${region.cloud}/${region.id}/${tier}/${sku}`);
          }
        }
      }
    }
    expect(mismatches).toEqual([]);
  });
});
