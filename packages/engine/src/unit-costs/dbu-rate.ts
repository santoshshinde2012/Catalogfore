import type { RegionInfo } from "../catalog.js";
import { bundledPricingCatalog } from "../catalog/pricing-catalog.js";
import { resolveDbuRate } from "../catalog/resolve-dbu-rate.js";
import type { SkuId, Tier } from "../types.js";
import { source } from "./sources.js";

/** Unit-book presentation of the same quote used by the forecast and spreadsheet. */
export function dbuRate(region: RegionInfo, tier: Tier, sku: SkuId) {
  const quote = resolveDbuRate(
    bundledPricingCatalog,
    { cloud: region.cloud, region: region.id, tier, factor: region.factor },
    sku,
  );
  return {
    cloud: quote.cloud,
    region: quote.region,
    regionLabel: region.label,
    tier: quote.tier,
    sku: quote.sku,
    baseRateUsd: quote.baseRateUsd,
    regionFactor: quote.regionFactor,
    sourceRegion: quote.sourceRegion,
    confidence: quote.confidence,
    status: quote.status,
    sources: quote.sources.map((reference) =>
      source(reference.title, reference.url, reference.role, reference.locator, reference.observedOn),
    ),
    rate: quote.usdPerDbu,
    effectiveFrom: quote.effectiveFrom,
    notes: quote.notes,
  };
}
