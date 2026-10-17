import { productMap } from "@cayfore/catalog/map";
import { productCatalog, type Product } from "@cayfore/catalog";
import { azureDbuMeters, referenceRegion, regionalSkuRate, skuCatalog, skuRate, type RegionInfo } from "../catalog.js";
import type { Cloud, SkuId, Tier } from "../types.js";
import type { UnitCostProduct, UnitCostRow, UnitCostSource } from "./types.js";
import { sourceDefaultDate } from "./evidence.js";

export const TIERS: Tier[] = ["premium", "enterprise"];
export const CLOUDS: Cloud[] = ["aws", "azure", "gcp"];
export const inventory: UnitCostProduct[] = productMap.entries.map((entry) => ({
  id: entry.id,
  name: entry.name,
  domainId: entry.domainId,
  domainName: productMap.domains.find((domain) => domain.id === entry.domainId)!.name,
  category: entry.product?.category ?? null,
  aliases: entry.aliases,
  kind: entry.kind,
  sources: entry.sources.map((source) => ({
    title: source.title,
    url: source.url,
    observedOn: productMap.reviewedOn,
    role: "context",
  })),
}));

export const source = (title: string, url: string, role: UnitCostSource["role"], locator?: string): UnitCostSource => ({
  title,
  url,
  role,
  observedOn: sourceDefaultDate(url, productCatalog.verifiedOn),
  ...(locator ? { locator } : {}),
});
export const consumptionSource = source(
  "Azure Databricks serverless consumption guide",
  "https://learn.microsoft.com/en-us/azure/databricks/resources/pricing",
  "consumption",
);
export const secondarySource = source(
  "Curated secondary US East price reference; see research methodology",
  "https://www.flexera.com/blog/finops/databricks-pricing-guide/",
  "price",
);
export const pricingSource = source("Databricks pricing", "https://www.databricks.com/product/pricing", "context");
export interface RowContext {
  product: Product;
  partId: string | null;
  rows: UnitCostRow[];
}
type Draft = Partial<UnitCostRow> & Pick<UnitCostRow, "componentId" | "componentName" | "unit">;
export function append(context: RowContext, draft: Draft): void {
  const info = inventory.find((entry) => entry.id === context.product.id)!;
  const row: UnitCostRow = {
    productId: info.id,
    productName: info.name,
    domainId: info.domainId,
    domainName: info.domainName,
    category: info.category,
    partId: context.partId,
    cloud: null,
    region: null,
    regionLabel: null,
    tier: null,
    sku: null,
    variant: null,
    modelId: null,
    instanceId: null,
    unitQuantity: 1,
    unitPriceUsd: null,
    usdPerUnit: null,
    dbuPerUnit: null,
    baseRateUsd: null,
    baseRateUnit: null,
    regionFactor: null,
    sourceRegion: null,
    status: "unpriced",
    confidence: "unpublished",
    rateKind: "unpriced",
    value: null,
    formula: "No trustworthy unit rate is stored.",
    notes: [],
    conditions: [],
    effectiveFrom: null,
    effectiveTo: null,
    includesCompute: null,
    dimensions: {},
    sources: [],
    ...draft,
    id: "",
  };
  if (row.unitPriceUsd !== null) row.usdPerUnit = row.unitPriceUsd / row.unitQuantity;
  if (row.baseRateUsd !== null && row.baseRateUnit === null) {
    row.baseRateUnit = row.dbuPerUnit !== null ? "DBU" : row.unit;
  }
  row.id = [
    row.productId,
    row.partId,
    row.componentId,
    row.cloud,
    row.region,
    row.tier,
    row.variant,
    row.modelId,
    row.instanceId,
  ]
    .map((value) => value ?? "_")
    .join(":");
  context.rows.push(row);
}

export function monetary(context: RowContext, draft: Draft & { unitPriceUsd: number | null }): void {
  append(context, { status: "approximate", confidence: "assumption", rateKind: "money", ...draft });
}

export function placements(callback: (region: RegionInfo, tier: Tier) => void): void {
  for (const region of skuCatalog.regions) for (const tier of TIERS) callback(region, tier);
}

export function dbuRate(region: RegionInfo, tier: Tier, sku: SkuId) {
  const meter = regionalSkuRate(region.cloud, region.id, tier, sku);
  const base = skuRate(region.cloud, tier, sku);
  const exact = meter !== null;
  const confidence = exact ? "measured" : region.id === referenceRegion[region.cloud] ? "secondary" : "proxy";
  const sources = exact
    ? [
        source(
          "Azure Retail Prices API",
          "https://prices.azure.com/api/retail/prices?api-version=2023-01-01-preview",
          "price",
          azureDbuMeters.find((item) => item.region === region.id && item.sku === sku)?.meterName,
        ),
      ]
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
    baseRateUsd: exact ? meter : base,
    regionFactor: exact ? 1 : region.factor,
    sourceRegion: exact ? region.id : referenceRegion[region.cloud],
    confidence: confidence as UnitCostRow["confidence"],
    status: (exact ? "priced" : "approximate") as UnitCostRow["status"],
    sources,
    rate: exact ? meter : base * region.factor,
    notes: [
      "Public list-price snapshot; contract discounts and taxes are excluded.",
      ...(region.cloud === "azure" && tier === "enterprise"
        ? ["Azure Enterprise uses the Premium list rate in Cayfore."]
        : []),
      ...(!exact ? ["Reference price × regional proxy; this is not a published regional tariff."] : []),
    ],
  };
}

export function dbuComponent(context: RowContext, sku: SkuId, componentId = "dbu", componentName = "Databricks usage") {
  placements((region, tier) => {
    const { rate, ...price } = dbuRate(region, tier, sku);
    monetary(context, {
      ...price,
      componentId,
      componentName,
      unit: "DBU",
      dbuPerUnit: 1,
      unitPriceUsd: rate,
      includesCompute: sku === "model_training" ? null : skuCatalog.includesCompute[sku],
      formula: "DBU × USD/DBU",
    });
  });
}

export function converted(context: RowContext, sku: SkuId, draft: Draft, dbuPerBasis: number) {
  const proxy = ["agent_evaluation", "serverless_gpu"].includes(context.product.id);
  const proxyNote =
    context.product.id === "agent_evaluation"
      ? "Generic model-token planning proxy. The service-specific LLM Judge rates (2.14 DBU/M input, 8.57 DBU/M output) and synthetic-data rate (5 DBU/question) are not modeled here."
      : "AI Runtime is modeled using serving GPU profiles; this is not an independently verified AI Runtime tariff.";
  placements((region, tier) => {
    const { rate, ...price } = dbuRate(region, tier, sku);
    monetary(context, {
      ...price,
      confidence: price.confidence === "measured" ? "cited" : price.confidence,
      ...draft,
      ...(proxy
        ? ({
            status: "approximate",
            confidence: "assumption",
            componentName: `Planning proxy: ${draft.componentName}`,
          } as const)
        : {}),
      dbuPerUnit: dbuPerBasis / (draft.unitQuantity ?? 1),
      unitPriceUsd: rate * dbuPerBasis,
      sources: [...price.sources, consumptionSource, ...(draft.sources ?? [])],
      notes: [...price.notes, ...(draft.notes ?? []), ...(proxy ? [proxyNote] : [])],
      includesCompute: sku === "model_training" ? null : skuCatalog.includesCompute[sku],
    });
  });
}
