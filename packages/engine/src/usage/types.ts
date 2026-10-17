import type { UsagePoint } from "../forecast/series.js";
import type { Cloud } from "../types.js";

export type UsageSourceId = "system-billing" | "focus";
export type UsageCostBasis = "list" | "effective-list" | "effective" | "billed";

export interface UsageRecord {
  recordId?: string;
  ingestionDate?: string;
  date: string | null;
  endDate?: string;
  skuName: string;
  billingOriginProduct: string;
  cloud?: Cloud;
  region?: string;
  unit: string;
  quantity: number;
  recordType: "ORIGINAL" | "RETRACTION" | "RESTATEMENT";
  listPrice?: number;
  effectiveListPrice?: number;
  cost?: { amount: number; currency: "USD"; basis: UsageCostBasis; source: string };
  workspaceId?: string;
  tags: Record<string, string>;
  metadata: Record<string, string>;
  identity: Record<string, string>;
  features: Record<string, string>;
  source: UsageSourceId;
}

export interface UsageParseResult {
  source: UsageSourceId;
  records: UsageRecord[];
  skippedRows: number;
  warnings: string[];
}

export interface UsageImportOptions {
  /** Inclusive observation cutoff. Defaults to catalog verification date; applications inject today's YYYY-MM-DD. */
  asOf?: string;
  /** An explicit month also permits importing a partial month without silently scaling it. */
  month?: string;
  costBasis?: "list" | "effective" | "billed";
}

export interface ProductUsage {
  productId: string;
  engineSku: string;
  cloud?: Cloud;
  region?: string;
  unit: string;
  quantity: number;
  /** Known cost only. Inspect unpricedQuantity before treating this as the complete total. */
  dollars: number | null;
  unpricedQuantity: number;
  pricedRows: number;
  unpricedRows: number;
  costBasis: UsageCostBasis | "mixed" | null;
  skuNames: string[];
}

export interface UnmappedUsage extends Omit<ProductUsage, "productId" | "engineSku" | "skuNames"> {
  skuName: string;
}

export interface ProductUsageImport {
  products: ProductUsage[];
  unmapped: UnmappedUsage[];
  warnings: string[];
  selectedMonth: string | null;
}

export interface UsageCoverage {
  usedRows: number;
  skippedRows: number;
  pricedRows: number;
  unpricedRows: number;
}

export interface UsageHistory {
  months: UsagePoint[];
  days: UsagePoint[];
  unit: "usd" | "dbu";
  warnings: string[];
  coverage: UsageCoverage;
}

export interface UsageAttribution {
  key: string;
  label: string;
  amount: number;
  quantity: number;
  rows: number;
  unpricedRows: number;
}

export interface UsageImportPreview extends ProductUsageImport, UsageCoverage {
  source: UsageSourceId;
  asOf: string;
  sourceLabel?: string;
  parseWarnings: string[];
  records: UsageRecord[];
  selectedRecords: UsageRecord[];
  availableMonths: string[];
  completeMonths: string[];
  history: UsageHistory;
  dbu: number;
  bySku: { sku: string; dbu: number }[];
  monthlyDollars: number | null;
  costBasis: string;
  attribution: UsageAttribution[];
}
