import { azureDbuMeters } from "./sources/azure-meters.js";
import { publishedDbuIssues, publishedDbuRates, publishedDbuSources } from "./sources/published-dbu.js";
import { referenceRegion } from "./sources/vm-prices.js";
import type { Cloud, SkuId, Tier } from "../types.js";
import type { DbuRateObservation, DbuRateConflict, PublishedRateIssue } from "./dbu-rate-types.js";

export { azureDbuMeters };
const azureRateMap = new Map(azureDbuMeters.map((row) => [`${row.region}:${row.sku}`, row]));
const publishedRateMap = new Map(
  publishedDbuRates.map((row) => [`${row.cloud}:${row.region ?? "_"}:${row.tier}:${row.sku}`, row]),
);
const publishedSourceMap = new Map(publishedDbuSources.map((row) => [row.id, row]));
const publishedConflictMap = new Map(
  (publishedDbuIssues as PublishedRateIssue[])
    .filter((issue) => issue.reason === "conflicting-first-party-USD-per-DBU-values")
    .map((issue) => [`${issue.cloud}:${issue.region ?? "_"}:${issue.tier}:${issue.sku}`, issue]),
);

/** A known first-party disagreement must not be replaced by a secondary or regional proxy. */
export function firstPartyDbuConflict(
  cloud: Cloud,
  region: string | null,
  tier: Tier,
  sku: SkuId,
): DbuRateConflict | null {
  const issue = publishedConflictMap.get(`${cloud}:${region ?? "_"}:${tier}:${sku}`);
  if (!issue) return null;
  return {
    cloud,
    region,
    tier,
    sku,
    reason: issue.reason,
    values: issue.sourceValues ?? [],
    sources: [...new Set(issue.sourceIds ?? [issue.sourceId])].flatMap((id) => {
      const reference = publishedSourceMap.get(id);
      const detail = issue.sources?.find((item) => item.sourceId === id);
      const locator = detail
        ? `${detail.sourcePointer ? `JSON pointer ${detail.sourcePointer}` : `Source row ${detail.sourceRowIndex} (zero-based)`}; USD ${detail.usdPerUnit}/DBU`
        : issue.reason;
      return reference
        ? [
            {
              title: "Conflicting Databricks public price source",
              url: reference.url,
              observedOn: reference.observedOn,
              locator,
            },
          ]
        : [];
    }),
  };
}

/** Exact published placement. Null region requests only an explicitly unscoped reference base. */
export function firstPartyDbuRate(
  cloud: Cloud,
  region: string | null,
  tier: Tier,
  sku: SkuId,
): DbuRateObservation | null {
  if (firstPartyDbuConflict(cloud, region, tier, sku)) return null;
  if (cloud === "azure") {
    if (region === null || (tier !== "premium" && tier !== "enterprise")) return null;
    const meter = azureRateMap.get(`${region}:${sku}`);
    if (!meter) return null;
    const query = new URL("https://prices.azure.com/api/retail/prices");
    query.searchParams.set("api-version", "2023-01-01-preview");
    query.searchParams.set(
      "$filter",
      `serviceName eq 'Azure Databricks' and armRegionName eq '${region}' and meterName eq '${meter.meterName}' and priceType eq 'Consumption'`,
    );
    return {
      cloud,
      region,
      tier,
      sku,
      usdPerDbu: meter.usdPerDbu,
      sourceUrl: meter.sourceUrl ?? query.toString(),
      title: "Azure Retail Prices API",
      locator: meter.meterId ? `${meter.meterName}; meter ${meter.meterId}` : meter.meterName,
      observedOn: meter.asOf ?? null,
      effectiveFrom: meter.effectiveStartDate ?? null,
      unitOfMeasure: meter.unitOfMeasure ?? "DBU (normalized from the Databricks meter)",
    };
  }
  const rate = publishedRateMap.get(`${cloud}:${region ?? "_"}:${tier}:${sku}`);
  if (!rate) return null;
  const reference = publishedSourceMap.get(rate.sourceId)!;
  return {
    cloud,
    region,
    tier,
    sku,
    usdPerDbu: rate.usdPerUnit,
    sourceUrl: reference.url,
    title:
      reference.id === "databricks-price-cards"
        ? "Databricks public product price card"
        : `Databricks ${cloud.toUpperCase()} calculator price card`,
    locator: `${"sourcePointer" in rate ? `JSON pointer ${rate.sourcePointer}; ` : ""}Source row ${rate.sourceRowIndex} (zero-based); ${rate.sourceCompute}; ${rate.sourceRegion ?? "no published region"}; ${tier}`,
    observedOn: rate.observedOn,
    effectiveFrom: null,
    unitOfMeasure: "DBU",
  };
}

/** A documented base is still a reference, not evidence for a different region. */
export function firstPartyBaseDbuRate(cloud: Cloud, tier: Tier, sku: SkuId): DbuRateObservation | null {
  return firstPartyDbuRate(cloud, null, tier, sku) ?? firstPartyDbuRate(cloud, referenceRegion[cloud], tier, sku);
}
