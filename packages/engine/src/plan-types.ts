import type { UsageForecast } from "./forecast/series.js";
import type { Addon, Cloud, SeasonalityPreset, Tier, Workload } from "./types.js";
import type {
  ImportedUsageSummary,
  PlanningEvent,
  PriceCoverage,
  PriceStatus,
  RateProvenance,
  PriceBookReference,
} from "./pricing-types.js";

export interface ForecastSettings {
  months: 12 | 24 | 36;
  annualGrowth: number;
  seasonality: SeasonalityPreset;
  customSeasonality?: number[];
  /** Calendar month of the first forecast point, YYYY-MM. Legacy plans use the catalog's verification month. */
  startMonth?: string;
}

/** Share of work across the three simple-forecast groups. Values are non-negative and sum to 1. */
export interface WorkloadMix {
  etl: number;
  sql: number;
  ml: number;
}

/**
 * Visible size of the simple forecast's three archetypes.
 * Node hours and warehouse count are what the cost strategies already price.
 */
export interface SimpleBasket {
  etlNodes: number;
  etlHoursPerDay: number;
  sqlClusters: number;
  mlInputTokens: number;
}

export interface StoredSimple {
  monthlySpend: number;
  mix: WorkloadMix;
  monthlyGrowth: number;
  commitDiscount: number;
  basket: SimpleBasket;
  /** Set when a usage file supplied the mix and the quantity. */
  usageDbu?: number;
  /** Set when the file had enough history to fit a trend. Ratios are versus the last observed month. */
  usageForecast?: UsageForecast;
}

export interface Portfolio {
  version: 1;
  name: string;
  cloud: Cloud;
  region: string;
  tier: Tier;
  workloads: Workload[];
  commitment: { dbuDiscount: number; cloudDiscount: number };
  addon: Addon;
  usageScale: number;
  /** True when month zero was fit to an imported usage file, even if the residual scale is 1. */
  usageCalibrated?: boolean;
  /** Optional annual budget in dollars. Omitted when the user has not set one. */
  budgetAnnual?: number;
  /** Present when the four-input forecast owns this portfolio. */
  simple?: StoredSimple;
  forecast: ForecastSettings;
  events?: PlanningEvent[];
  usage?: ImportedUsageSummary;
  /** Reference for the saved quote; older books require their archived results for exact replay. */
  priceBook?: PriceBookReference;
}

export interface LineItem {
  workloadId: string;
  name: string;
  kind: Workload["kind"];
  sku: string;
  hours: number;
  dbu: number;
  dbuCost: number;
  cloudCost: number;
  total: number;
  approximateVm: boolean;
  notes: string[];
  priceStatus?: PriceStatus;
  rateProvenance?: RateProvenance;
}

export interface Estimate {
  catalogVersion: string;
  verifiedOn: string;
  disclaimer: string;
  lines: LineItem[];
  dbu: number;
  dbuCost: number;
  cloudCost: number;
  addonCost: number;
  total: number;
  warnings: string[];
  usageScale: number;
  coverage?: PriceCoverage;
}

export interface ForecastPoint {
  month: number;
  dbuCost: number;
  cloudCost: number;
  addonCost: number;
  total: number;
  period?: string;
}

export type ScenarioPresetId =
  "as_modeled" | "jobs_serverless" | "photon_on" | "photon_speedup_2" | "spot_70" | "commit_37" | "commit_37_cloud_30";

export interface ScenarioResult {
  id: ScenarioPresetId;
  name: string;
  description: string;
  estimate: Estimate;
  forecast: ForecastPoint[];
  annual: number;
}

export interface Tip {
  id: string;
  tone: "info" | "warn";
  text: string;
}

export interface UsageImport {
  dbu: number;
  bySku: { sku: string; dbu: number }[];
  skippedRows: number;
  usedRows: number;
  warnings: string[];
}
