import { productMap } from "@cayfore/catalog/map";
import { type Product } from "@cayfore/catalog";
import { skuCatalog, type RegionInfo } from "../catalog.js";
import { dbuRate } from "./dbu-rate.js";
import { consumptionSource } from "./sources.js";
export { dbuRate } from "./dbu-rate.js";
export { source, consumptionSource, secondarySource, pricingSource } from "./sources.js";
import type { Cloud, SkuId, Tier } from "../types.js";
import type { UnitCostProduct, UnitCostRow } from "./types.js";
import { sourceReference } from "./provenance.js";

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
  sources: entry.sources.map((reference) => ({
    ...sourceReference(reference.title, reference.url, "context"),
    reviewedOn: productMap.reviewedOn,
  })),
}));

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
    evidenceLevel: "unresolved",
    evidenceSummary: "No trustworthy unit quote is stored.",
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
      unitPriceUsd: rate === null ? null : rate * dbuPerBasis,
      sources: [...price.sources, consumptionSource, ...(draft.sources ?? [])],
      notes: [...price.notes, ...(draft.notes ?? []), ...(proxy ? [proxyNote] : [])],
      includesCompute: sku === "model_training" ? null : skuCatalog.includesCompute[sku],
      ...(rate === null ? ({ status: "unpriced", confidence: "conflict" } as const) : {}),
    });
  });
}
