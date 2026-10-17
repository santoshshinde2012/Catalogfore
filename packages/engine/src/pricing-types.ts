import type { UsageForecast } from "./forecast/series.js";
/** The amount's origin is kept distinct from statistical forecast uncertainty. */
export type PriceStatus = "priced" | "approximate" | "unpriced" | "free";
export interface PriceBookReference {
  version: string;
  verifiedOn: string;
}

export interface RateProvenance {
  kind: "catalog" | "custom" | "imported";
  label: string;
  currency: "USD";
  source?: string;
  verifiedOn?: string;
  catalogVersion?: string;
  /** Effective and billed amounts already include source adjustments; do not discount them again. */
  basis?: "list" | "effective-list" | "effective" | "billed";
}

export interface PriceCoverage {
  pricedLines: number;
  approximateLines: number;
  unpricedLines: number;
  freeLines: number;
  /** This is a known subtotal whenever unpricedLines is positive. */
  complete: boolean;
}

/** A change takes effect in its named month and persists until a later change. */
export interface PlanningEvent {
  id: string;
  name: string;
  month: string;
  workloadId?: string;
  /** Multipliers compose. Zero retires a workload; 1 leaves usage unchanged. */
  usageMultiplier: number;
}

export interface ImportedUsageSummary {
  source: "system-billing" | "focus";
  selectedMonth: string | null;
  costBasis: string;
  currency: "USD";
  observedMonths: { period: string; amount: number }[];
  observedUnit: "usd" | "dbu";
  coverage: { pricedRows: number; unpricedRows: number; usedRows: number; skippedRows: number };
  warnings: string[];
  forecast?: UsageForecast;
  sourceFingerprint?: string;
  sourceLabel?: string;
  attribution?: { key: string; label: string; amount: number; quantity: number; rows: number; unpricedRows: number }[];
}
