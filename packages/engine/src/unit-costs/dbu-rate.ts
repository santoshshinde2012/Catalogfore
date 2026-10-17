import {
  firstPartyBaseDbuRate,
  firstPartyDbuRate,
  firstPartyDbuConflict,
  referenceRegion,
  skuRate,
  type RegionInfo,
} from "../catalog.js";
import type { SkuId, Tier } from "../types.js";
import type { UnitCostRow } from "./types.js";
import { source, secondarySource } from "./sources.js";

export function dbuRate(region: RegionInfo, tier: Tier, sku: SkuId) {
  const conflict = firstPartyDbuConflict(region.cloud, region.id, tier, sku);
  if (conflict)
    return {
      cloud: region.cloud,
      region: region.id,
      regionLabel: region.label,
      tier,
      sku,
      baseRateUsd: null,
      regionFactor: null,
      sourceRegion: region.id,
      confidence: "conflict" as UnitCostRow["confidence"],
      status: "unpriced" as UnitCostRow["status"],
      sources: conflict.sources.map((reference) =>
        source(reference.title, reference.url, "price", reference.locator, reference.observedOn),
      ),
      rate: null,
      effectiveFrom: null,
      notes: [
        `Conflicting first-party USD/DBU observations${conflict.values.length ? `: ${conflict.values.join(" versus ")}` : ""}. No secondary or regional proxy is substituted.`,
      ],
    };
  const observation = firstPartyDbuRate(region.cloud, region.id, tier, sku);
  const reference = firstPartyBaseDbuRate(region.cloud, tier, sku);
  const base = skuRate(region.cloud, tier, sku);
  const exact = observation !== null;
  const confidence = exact
    ? "measured"
    : reference
      ? "proxy"
      : region.id === referenceRegion[region.cloud]
        ? "secondary"
        : "proxy";
  const numericSource = observation ?? reference;
  const sources = numericSource
    ? [source(numericSource.title, numericSource.sourceUrl, "price", numericSource.locator, numericSource.observedOn)]
    : [secondarySource];
  if (!exact)
    sources.push(
      source(
        "Lakehouse Real-Time regional ratio used as a planning proxy",
        "https://docs.databricks.com/aws/en/compute/sql-warehouse/real-time-pricing",
        "region",
      ),
    );
  return {
    cloud: region.cloud,
    region: region.id,
    regionLabel: region.label,
    tier,
    sku,
    baseRateUsd: observation?.usdPerDbu ?? base,
    regionFactor: exact ? 1 : region.factor,
    sourceRegion: exact ? region.id : referenceRegion[region.cloud],
    confidence: confidence as UnitCostRow["confidence"],
    status: (exact ? "priced" : "approximate") as UnitCostRow["status"],
    sources,
    rate: observation?.usdPerDbu ?? base * region.factor,
    effectiveFrom: observation?.effectiveFrom ?? null,
    notes: [
      "Public list-price snapshot; contract discounts and taxes are excluded.",
      ...(region.cloud === "azure" && tier === "enterprise"
        ? ["Azure Enterprise uses the Premium list rate in Cayfore."]
        : []),
      ...(!exact ? ["Reference price × regional proxy; this is not a published regional tariff."] : []),
      ...(reference?.region === null && !exact
        ? [
            "The first-party calculator omits regional scope for this base rate. A regional planning placement is not a published local quote.",
          ]
        : []),
      ...(exact && observation.observedOn === null
        ? [
            "The legacy stored meter has no per-row observation date. A later documentation review does not verify when this rate was captured.",
          ]
        : []),
    ],
  };
}
