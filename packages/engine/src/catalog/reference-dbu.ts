import { referenceRegion, skuCatalog } from "../catalog.js";
import type { Cloud, SkuId, Tier } from "../types.js";
import type { DbuRateObservation } from "./dbu-rate-types.js";
import { secondaryDbuSource } from "./dbu-rate-sources.js";

/** Pair the stored secondary value with its evidence; injected catalog overrides must match it. */
export function secondaryReferenceDbuRate(cloud: Cloud, tier: Tier, sku: SkuId): DbuRateObservation | null {
  const price = skuCatalog.rates[cloud][tier][sku];
  if (!Number.isFinite(price) || price < 0) return null;
  return {
    cloud,
    tier,
    sku,
    region: referenceRegion[cloud],
    usdPerDbu: price,
    sourceUrl: secondaryDbuSource.url,
    title: secondaryDbuSource.title,
    observedOn: secondaryDbuSource.observedOn,
    effectiveFrom: null,
    unitOfMeasure: "DBU",
    locator: `${cloud}/${tier}/${sku}; retained secondary reference`,
  };
}
