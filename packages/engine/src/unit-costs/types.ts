import type { Cloud, SkuId, Tier } from "../types.js";

export type UnitCostStatus = "priced" | "approximate" | "conditional" | "unpriced" | "not_applicable";
export type UnitCostConfidence =
  "measured" | "cited" | "secondary" | "proxy" | "assumption" | "unpublished" | "conflict";
export interface UnitCostSource {
  title: string;
  url: string;
  observedOn: string | null;
  role: "price" | "consumption" | "region" | "context";
  locator?: string;
}
export interface UnitCostProduct {
  id: string;
  name: string;
  domainId: string;
  domainName: string;
  category: string | null;
  aliases: string[];
  sources: UnitCostSource[];
  kind: "catalog-product" | "platform-service";
}
/** Prices are per unitQuantity units. null means unresolved; zero needs explicit evidence. */
export interface UnitCostRow {
  id: string;
  productId: string;
  productName: string;
  partId: string | null;
  componentId: string;
  componentName: string;
  domainId: string;
  domainName: string;
  category: string | null;
  cloud: Cloud | null;
  region: string | null;
  regionLabel: string | null;
  tier: Tier | null;
  sku: SkuId | null;
  variant: string | null;
  modelId: string | null;
  instanceId: string | null;
  unit: string;
  unitQuantity: number;
  unitPriceUsd: number | null;
  usdPerUnit: number | null;
  dbuPerUnit: number | null;
  baseRateUsd: number | null;
  baseRateUnit: string | null;
  regionFactor: number | null;
  sourceRegion: string | null;
  status: UnitCostStatus;
  confidence: UnitCostConfidence;
  rateKind: "money" | "consumption" | "multiplier" | "allowance" | "unpriced";
  value: number | null;
  formula: string;
  notes: string[];
  conditions: string[];
  effectiveFrom: string | null;
  effectiveTo: string | null;
  includesCompute: boolean | null;
  dimensions: Record<string, string | number | boolean>;
  sources: UnitCostSource[];
}
export interface UnitCostCatalog {
  schemaVersion: "1.0.0";
  catalogVersion: string;
  verifiedOn: string;
  disclaimer: string;
  products: UnitCostProduct[];
  rows: UnitCostRow[];
}
export interface UnitCostFilters {
  query?: string;
  productId?: string;
  domainId?: string;
  cloud?: Cloud | string;
  region?: string;
  tier?: Tier | string;
  status?: UnitCostStatus | string;
  componentId?: string;
}
