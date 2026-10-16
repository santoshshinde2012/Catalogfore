export type Cloud = "aws" | "azure" | "gcp";
export type Tier = "premium" | "enterprise";
export type Addon = "none" | "compliance" | "mission_critical";
export type SeasonalityPreset = "flat" | "retail" | "custom";

export type SkuId =
  | "jobs_classic"
  | "jobs_serverless"
  | "all_purpose_classic"
  | "all_purpose_serverless"
  | "dlt_core"
  | "dlt_pro"
  | "dlt_advanced"
  | "dlt_serverless"
  | "sql_classic"
  | "sql_pro"
  | "sql_serverless"
  | "model_serving"
  | "model_training"
  | "apps"
  | "managed_services"
  | "lakeflow_connect"
  | "ai_search";

export type SqlSize = "2xs" | "xs" | "s" | "m" | "l" | "xl" | "2xl" | "3xl" | "4xl";
export type ClusterSku = "jobs_classic" | "all_purpose_classic" | "dlt_core" | "dlt_pro" | "dlt_advanced";
export type ServerlessSku = "jobs_serverless" | "all_purpose_serverless" | "dlt_serverless";
export type MeteredSku = "managed_services" | "lakeflow_connect" | "model_training";

export interface Schedule {
  hoursPerDay: number;
  daysPerWeek: number;
}

export interface Scale {
  min: number;
  max: number;
  utilization: number;
}

interface WorkloadBase {
  id: string;
  name: string;
  cloud?: Cloud;
  region?: string;
  tier?: Tier;
}

export type Workload =
  | (WorkloadBase & {
      kind: "cluster";
      sku: ClusterSku;
      instanceId: string;
      scale: Scale;
      photon: boolean;
      spotShare: number;
      spotDiscount: number;
      schedule: Schedule;
    })
  | (WorkloadBase & {
      kind: "serverless_compute";
      sku: ServerlessSku;
      dbuPerHour: number;
      schedule: Schedule;
    })
  | (WorkloadBase & {
      kind: "sql";
      edition: "classic" | "pro" | "serverless";
      size: SqlSize;
      scale: Scale;
      schedule: Schedule;
      vmPerDbuHour?: number;
    })
  | (WorkloadBase & {
      kind: "model_serving";
      mode: "cpu" | "gpu";
      concurrency: number;
      gpuId: string;
      replicas: number;
      schedule: Schedule;
    })
  | (WorkloadBase & {
      kind: "foundation_model";
      modelId: string;
      inputTokensPerMonth: number;
      outputTokensPerMonth: number;
      provisionedHoursPerMonth: number;
    })
  | (WorkloadBase & {
      kind: "ai_search";
      variant: "standard" | "storage_optimized";
      units: number;
      storageGb: number;
      schedule: Schedule;
    })
  | (WorkloadBase & {
      kind: "app";
      size: "medium" | "large";
      schedule: Schedule;
    })
  | (WorkloadBase & {
      kind: "lakebase";
      cu: number;
      storageGb: number;
      schedule: Schedule;
    })
  | (WorkloadBase & {
      kind: "storage";
      gbMonth: number;
      managed: boolean;
    })
  | (WorkloadBase & {
      kind: "egress";
      gbMonth: number;
      pricePerGb?: number;
    })
  | (WorkloadBase & {
      kind: "metered";
      sku: MeteredSku;
      dbuPerMonth: number;
    });

export interface ForecastSettings {
  months: 12 | 24 | 36;
  annualGrowth: number;
  seasonality: SeasonalityPreset;
  customSeasonality?: number[];
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
}

export interface ForecastPoint {
  month: number;
  dbuCost: number;
  cloudCost: number;
  addonCost: number;
  total: number;
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
