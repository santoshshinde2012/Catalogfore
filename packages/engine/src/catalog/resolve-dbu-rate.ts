import type { Cloud, SkuId, Tier } from "../types.js";
import type { DbuRateConflict, DbuRateObservation } from "./dbu-rate-types.js";
import type { PricingCatalog } from "./pricing-catalog.js";
import { regionalProxySource } from "./dbu-rate-sources.js";
export { secondaryDbuSource } from "./dbu-rate-sources.js";

export interface DbuRatePlacement {
  cloud: Cloud;
  region: string;
  tier: Tier;
  factor: number;
}

export interface DbuRateSource {
  title: string;
  url: string;
  role: "price" | "region";
  observedOn: string | null;
  locator?: string;
}

export interface DbuRateResolution {
  cloud: Cloud;
  region: string;
  tier: Tier;
  sku: SkuId;
  kind: "exact" | "reference" | "conflict" | "unavailable";
  usdPerDbu: number | null;
  baseRateUsd: number | null;
  regionFactor: number | null;
  sourceRegion: string | null;
  status: "priced" | "approximate" | "unpriced";
  confidence: "measured" | "secondary" | "proxy" | "assumption" | "unpublished" | "conflict";
  observation: DbuRateObservation | null;
  reference: DbuRateObservation | null;
  conflict: DbuRateConflict | null;
  effectiveFrom: string | null;
  sources: DbuRateSource[];
  summary: string;
  basis: string;
  notes: string[];
}

type RateCatalog = Pick<
  PricingCatalog,
  | "skuRate"
  | "regionalSkuRate"
  | "firstPartyDbuRate"
  | "firstPartyBaseDbuRate"
  | "firstPartyDbuConflict"
  | "referenceDbuRate"
  | "referenceRegion"
>;

const finitePrice = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

/** The public USD/DBU policy shared by forecasts, unit costs and exports. No I/O or hidden price book. */
export function resolveDbuRate(catalog: RateCatalog, placement: DbuRatePlacement, sku: SkuId): DbuRateResolution {
  const { cloud, region, tier } = placement;
  const conflict = catalog.firstPartyDbuConflict?.(cloud, region, tier, sku) ?? null;
  const empty: DbuRateResolution = {
    cloud,
    region,
    tier,
    sku,
    kind: "unavailable",
    usdPerDbu: null,
    baseRateUsd: null,
    regionFactor: null,
    sourceRegion: null,
    status: "unpriced",
    confidence: "unpublished",
    observation: null,
    reference: null,
    conflict,
    effectiveFrom: null,
    sources: [],
    summary: "Unpriced: no finite public USD/DBU rate is stored for this SKU and placement",
    basis: "A finite catalog USD/DBU rate could not be resolved.",
    notes: [],
  };
  // A known disagreement always wins over an otherwise available exact, reference or secondary rate.
  if (conflict) {
    const values = conflict.values.map((value) => `$${value}/DBU`).join(" versus ");
    return {
      ...empty,
      kind: "conflict",
      confidence: "conflict",
      sourceRegion: region,
      sources: conflict.sources.map((reference) => ({ ...reference, role: "price" })),
      summary: "Unpriced: first-party sources disagree for this SKU and placement; cost is withheld",
      basis: `Conflicting first-party prices (${values}); the qualified public rate is withheld. ${conflict.sources.map((source) => source.locator).join("; ")}`,
      notes: [
        `Conflicting first-party USD/DBU observations${conflict.values.length ? `: ${conflict.values.join(" versus ")}` : ""}. No secondary or regional proxy is substituted.`,
      ],
    };
  }
  const observation = catalog.firstPartyDbuRate?.(cloud, region, tier, sku) ?? null;
  const regional = catalog.regionalSkuRate?.(cloud, region, tier, sku) ?? observation?.usdPerDbu ?? null;
  if (regional !== null && !finitePrice(regional)) return empty;
  const firstPartyReference = catalog.firstPartyBaseDbuRate?.(cloud, tier, sku) ?? null;
  const reference = firstPartyReference ?? catalog.referenceDbuRate?.(cloud, tier, sku) ?? null;
  const exact = finitePrice(regional);
  const baseRateUsd = exact ? regional : catalog.skuRate(cloud, tier, sku);
  const factor = exact ? 1 : placement.factor;
  const rate = baseRateUsd * factor;
  if (!finitePrice(baseRateUsd) || !Number.isFinite(factor) || factor <= 0 || !finitePrice(rate)) return empty;
  // An injectable numeric quote can be used without claiming that unrelated publisher metadata verifies it.
  const numericSource = exact
    ? observation?.usdPerDbu === regional
      ? observation
      : null
    : reference?.usdPerDbu === baseRateUsd
      ? reference
      : null;
  const sources: DbuRateSource[] = numericSource
    ? [
        {
          title: numericSource.title,
          url: numericSource.sourceUrl,
          role: "price",
          observedOn: numericSource.observedOn,
          locator: numericSource.locator,
        },
      ]
    : [];
  if (!exact) sources.push({ ...regionalProxySource });
  const referenceRegion = catalog.referenceRegion?.[cloud] ?? null;
  const confidence = exact
    ? numericSource
      ? "measured"
      : "assumption"
    : !numericSource
      ? "assumption"
      : firstPartyReference || region !== referenceRegion
        ? "proxy"
        : "secondary";
  const description = cloud === "azure" ? "Azure consumption meter" : "Databricks first-party USD/DBU observation";
  const notes = [
    "Public list-price snapshot; contract discounts and taxes are excluded.",
    ...(cloud === "azure" && tier === "enterprise" ? ["Azure Enterprise uses the Premium list rate in Cayfore."] : []),
    ...(!exact ? ["Reference price × regional proxy; this is not a published regional tariff."] : []),
    ...(numericSource?.region === null && !exact
      ? [
          "The first-party calculator omits regional scope for this base rate. A regional planning placement is not a published local quote.",
        ]
      : []),
    ...(exact && numericSource?.observedOn === null
      ? [
          "The legacy stored meter has no per-row observation date. A later documentation review does not verify when this rate was captured.",
        ]
      : []),
    ...(exact && !numericSource ? ["The injected catalog quote has no matching first-party numeric observation."] : []),
  ];
  return {
    ...empty,
    kind: exact ? "exact" : "reference",
    usdPerDbu: rate,
    baseRateUsd,
    regionFactor: factor,
    sourceRegion: exact ? region : (numericSource?.region ?? null),
    status: exact && numericSource ? "priced" : "approximate",
    confidence,
    observation: exact ? numericSource : null,
    reference: exact ? null : numericSource,
    effectiveFrom: exact ? (numericSource?.effectiveFrom ?? null) : null,
    sources,
    summary: exact
      ? numericSource
        ? `$${regional}/DBU from the ${cloud === "azure" ? "Azure meter" : "Databricks public price card"} for this region`
        : `$${regional}/DBU from the injected catalog for this region; first-party numeric evidence is unavailable`
      : `$${baseRateUsd}/DBU × region ×${Math.round(factor * 1e6) / 1e6}`,
    basis: exact
      ? `${numericSource ? `Exact ${description}` : "Injected catalog regional USD/DBU quote"} for this workload's region; observed ${numericSource?.observedOn ?? "date not recorded"}. Before portfolio discounts.`
      : `${numericSource ? (firstPartyReference ? "First-party reference" : "Bundled secondary reference") : "Injected catalog reference"} USD/DBU base × region factor ${factor}; ${numericSource?.region === null ? "source publishes no region" : `reference region ${numericSource?.region ?? referenceRegion ?? "not recorded"}`}. Regional pricing remains a planning proxy. Before portfolio discounts.`,
    notes,
  };
}
