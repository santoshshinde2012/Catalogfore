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
export const METERED_SKUS = [
  "managed_services",
  "lakeflow_connect",
  "model_training",
  "jobs_serverless",
  "sql_serverless",
  "model_serving",
  "apps",
] as const;
export type MeteredSku = (typeof METERED_SKUS)[number];

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
  /** Set when Advanced added this row from the product catalog. */
  productId?: string;
  /** Which composition part this row is, when the product bills more than one SKU. */
  partId?: string;
  /** Editable drivers for a catalog formula. Quantities here are not list rates unless the note says so. */
  inputs?: Record<string, number | string>;
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
      /** Multiplier on the DSU or object rate. Omitted means 1. Point-in-time restore uses 8.7. */
      rateMultiplier?: number;
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
      /** Dollars per DBU for clouds that publish one. A missing cloud is unpriced, not zero by assumption. */
      rateByCloud?: Partial<Record<Cloud, number>>;
      /** A non-DBU list charge, such as a daily collaborator fee. A missing cloud is unpriced. */
      fixedUsdByCloud?: Partial<Record<Cloud, number>>;
      /** Quantity multiplied by `rateByPlacement`. Zerobus uses gigabytes. */
      units?: number;
      /** Dollars per unit for one cloud and tier. A missing cell is unpriced, not a guessed zero. */
      rateByPlacement?: Partial<Record<Cloud, Partial<Record<Tier, number>>>>;
    });

export type {
  ForecastSettings,
  WorkloadMix,
  SimpleBasket,
  StoredSimple,
  Portfolio,
  LineItem,
  Estimate,
  ForecastPoint,
  ScenarioPresetId,
  ScenarioResult,
  Tip,
  UsageImport,
} from "./plan-types.js";
