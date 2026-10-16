import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { defaultInstanceId, listRegions, skuCatalog } from "./catalog.js";
import { clamp, uid } from "./money.js";
import { FLAT_SEASONALITY } from "./forecast.js";
import type {
  Addon,
  Cloud,
  Portfolio,
  SeasonalityPreset,
  SimpleBasket,
  StoredSimple,
  Tier,
  Workload,
  WorkloadMix,
} from "./types.js";

const CLOUDS: Cloud[] = ["aws", "azure", "gcp"];
const TIERS: Tier[] = ["premium", "enterprise"];
const ADDONS: Addon[] = ["none", "compliance", "mission_critical"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function num(value: unknown, fallback: number, min = 0, max = Number.POSITIVE_INFINITY): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return clamp(parsed, min, max);
}

function str(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function schedule(value: unknown, fallbackHours: number, fallbackDays: number) {
  const record = isRecord(value) ? value : {};
  return {
    hoursPerDay: num(record.hoursPerDay, fallbackHours, 0, 24),
    daysPerWeek: num(record.daysPerWeek, fallbackDays, 0, 7),
  };
}

function scale(value: unknown, fallbackMin: number, fallbackMax: number, fallbackUtil: number) {
  const record = isRecord(value) ? value : {};
  return {
    min: num(record.min, fallbackMin, 0, 1_000_000),
    max: num(record.max, fallbackMax, 0, 1_000_000),
    utilization: num(record.utilization, fallbackUtil, 0, 1),
  };
}

function cloudOf(value: unknown): Cloud | undefined {
  return CLOUDS.includes(value as Cloud) ? (value as Cloud) : undefined;
}

function tierOf(value: unknown): Tier | undefined {
  return TIERS.includes(value as Tier) ? (value as Tier) : undefined;
}

function base(record: Record<string, unknown>, fallbackName: string) {
  const cloud = cloudOf(record.cloud);
  const tier = tierOf(record.tier);
  return {
    id: str(record.id, uid()),
    name: str(record.name, fallbackName).slice(0, 80),
    ...(cloud ? { cloud } : {}),
    ...(typeof record.region === "string" ? { region: record.region } : {}),
    ...(tier ? { tier } : {}),
  };
}

export function normalizeWorkload(input: unknown, cloud: Cloud): Workload | null {
  if (!isRecord(input) || typeof input.kind !== "string") return null;
  const kind = input.kind;
  if (kind === "cluster") {
    const sku = ["jobs_classic", "all_purpose_classic", "dlt_core", "dlt_pro", "dlt_advanced"].includes(
      String(input.sku),
    )
      ? (input.sku as Extract<Workload, { kind: "cluster" }>["sku"])
      : "jobs_classic";
    const instanceCloud = cloudOf(input.cloud) ?? cloud;
    return {
      ...base(input, "Cluster"),
      kind,
      sku,
      instanceId: str(input.instanceId, defaultInstanceId(instanceCloud)),
      scale: scale(input.scale, 1, 2, 1),
      photon: Boolean(input.photon),
      spotShare: num(input.spotShare, 0, 0, 1),
      spotDiscount: num(input.spotDiscount, skuCatalog.defaultSpotDiscount, 0, 0.95),
      schedule: schedule(input.schedule, 8, 5),
    };
  }
  if (kind === "serverless_compute") {
    const sku = ["jobs_serverless", "all_purpose_serverless", "dlt_serverless"].includes(String(input.sku))
      ? (input.sku as Extract<Workload, { kind: "serverless_compute" }>["sku"])
      : "jobs_serverless";
    return {
      ...base(input, "Serverless"),
      kind,
      sku,
      dbuPerHour: num(input.dbuPerHour, 4, 0, 100000),
      schedule: schedule(input.schedule, 4, 5),
    };
  }
  if (kind === "sql") {
    const edition = input.edition === "pro" || input.edition === "serverless" ? input.edition : "classic";
    const sizes = ["2xs", "xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl"] as const;
    const size = sizes.includes(input.size as (typeof sizes)[number]) ? (input.size as (typeof sizes)[number]) : "s";
    return {
      ...base(input, "SQL warehouse"),
      kind,
      edition,
      size,
      scale: scale(input.scale, 1, 1, 1),
      schedule: schedule(input.schedule, 8, 5),
      ...(input.vmPerDbuHour == null
        ? {}
        : { vmPerDbuHour: num(input.vmPerDbuHour, skuCatalog.sqlVmDollarsPerDbuHour, 0, 100) }),
    };
  }
  if (kind === "model_serving") {
    return {
      ...base(input, "Model serving"),
      kind,
      mode: input.mode === "gpu" ? "gpu" : "cpu",
      concurrency: num(input.concurrency, 1, 0, 10000),
      gpuId: str(input.gpuId, "t4"),
      replicas: num(input.replicas, 1, 0, 100),
      schedule: schedule(input.schedule, 12, 7),
    };
  }
  if (kind === "foundation_model") {
    return {
      ...base(input, "Foundation model"),
      kind,
      modelId: str(input.modelId, "llama-3.1-8b"),
      inputTokensPerMonth: num(input.inputTokensPerMonth, 1_000_000, 0, 1e15),
      outputTokensPerMonth: num(input.outputTokensPerMonth, 250_000, 0, 1e15),
      provisionedHoursPerMonth: num(input.provisionedHoursPerMonth, 0, 0, 1000),
    };
  }
  if (kind === "ai_search") {
    return {
      ...base(input, "AI Search"),
      kind,
      variant: input.variant === "storage_optimized" ? "storage_optimized" : "standard",
      units: num(input.units, 1, 0, 1000),
      storageGb: num(input.storageGb, 0, 0, 1e9),
      schedule: schedule(input.schedule, 24, 7),
    };
  }
  if (kind === "app") {
    return {
      ...base(input, "App"),
      kind,
      size: input.size === "large" ? "large" : "medium",
      schedule: schedule(input.schedule, 10, 5),
    };
  }
  if (kind === "lakebase") {
    return {
      ...base(input, "Lakebase"),
      kind,
      cu: num(input.cu, 1, 0, 10000),
      storageGb: num(input.storageGb, 20, 0, 1e9),
      schedule: schedule(input.schedule, 12, 7),
    };
  }
  if (kind === "storage") {
    return {
      ...base(input, "Storage"),
      kind,
      gbMonth: num(input.gbMonth, 100, 0, 1e12),
      managed: input.managed !== false,
    };
  }
  if (kind === "egress") {
    return {
      ...base(input, "Egress"),
      kind,
      gbMonth: num(input.gbMonth, 100, 0, 1e12),
      ...(input.pricePerGb == null ? {} : { pricePerGb: num(input.pricePerGb, 0.09, 0, 10) }),
    };
  }
  if (kind === "metered") {
    const sku = ["managed_services", "lakeflow_connect", "model_training"].includes(String(input.sku))
      ? (input.sku as Extract<Workload, { kind: "metered" }>["sku"])
      : "managed_services";
    return { ...base(input, "Metered DBUs"), kind, sku, dbuPerMonth: num(input.dbuPerMonth, 100, 0, 1e12) };
  }
  return null;
}

export function blankPortfolio(cloud: Cloud = "aws"): Portfolio {
  const region = listRegions(cloud)[0]?.id ?? "us-east-1";
  return {
    version: 1,
    name: "Untitled forecast",
    cloud,
    region,
    tier: "premium",
    workloads: [],
    commitment: { dbuDiscount: 0, cloudDiscount: 0 },
    addon: "none",
    usageScale: 1,
    forecast: { months: 12, annualGrowth: 0.08, seasonality: "flat", customSeasonality: [...FLAT_SEASONALITY] },
  };
}

export function normalizePortfolio(input: unknown): Portfolio {
  const fallback = blankPortfolio();
  if (!isRecord(input)) return fallback;
  const cloud = cloudOf(input.cloud) ?? "aws";
  const regions = listRegions(cloud);
  const region =
    typeof input.region === "string" && regions.some((item) => item.id === input.region) ? input.region : regions[0].id;
  const tier = tierOf(input.tier) ?? "premium";
  const commitment = isRecord(input.commitment) ? input.commitment : {};
  const forecast = isRecord(input.forecast) ? input.forecast : {};
  const seasonality: SeasonalityPreset =
    forecast.seasonality === "retail" || forecast.seasonality === "custom" ? forecast.seasonality : "flat";
  const months = forecast.months === 24 || forecast.months === 36 ? forecast.months : 12;
  const workloads = Array.isArray(input.workloads)
    ? input.workloads
        .map((workload) => normalizeWorkload(workload, cloud))
        .filter((workload): workload is Workload => workload !== null)
    : [];
  const addon = ADDONS.includes(input.addon as Addon) ? (input.addon as Addon) : "none";
  const budget = num(input.budgetAnnual, 0, 0, 1e12);
  const simple = normalizeSimple(input.simple);
  return {
    version: 1,
    name: str(input.name, fallback.name).slice(0, 80),
    cloud,
    region,
    tier,
    workloads,
    commitment: {
      dbuDiscount: num(commitment.dbuDiscount, 0, 0, 0.95),
      cloudDiscount: num(commitment.cloudDiscount, 0, 0, 0.95),
    },
    addon,
    usageScale: num(input.usageScale, 1, 0.0001, 1000),
    ...(budget > 0 ? { budgetAnnual: budget } : {}),
    ...(input.usageCalibrated === true ? { usageCalibrated: true } : {}),
    ...(simple ? { simple } : {}),
    forecast: {
      months,
      annualGrowth: num(forecast.annualGrowth, 0, -0.9, 10),
      seasonality,
      customSeasonality: Array.from({ length: 12 }, (_, index) =>
        num(Array.isArray(forecast.customSeasonality) ? forecast.customSeasonality[index] : 1, 1, 0.05, 5),
      ),
    },
  };
}

function mixOf(value: unknown): WorkloadMix {
  const record = isRecord(value) ? value : {};
  const etl = Math.max(0, num(record.etl, 0, 0, 1_000_000));
  const sql = Math.max(0, num(record.sql, 0, 0, 1_000_000));
  const ml = Math.max(0, num(record.ml, 0, 0, 1_000_000));
  const sum = etl + sql + ml;
  if (sum <= 0) return { etl: 1 / 3, sql: 1 / 3, ml: 1 / 3 };
  return { etl: etl / sum, sql: sql / sum, ml: ml / sum };
}

function basketOf(value: unknown): SimpleBasket {
  const record = isRecord(value) ? value : {};
  return {
    etlNodes: num(record.etlNodes, 0, 0, 1_000_000),
    etlHoursPerDay: num(record.etlHoursPerDay, 8, 0, 24),
    sqlClusters: num(record.sqlClusters, 0, 0, 1_000_000),
    mlInputTokens: num(record.mlInputTokens, 0, 0, 1e15),
  };
}

function normalizeSimple(value: unknown): StoredSimple | undefined {
  if (!isRecord(value)) return undefined;
  const usage = num(value.usageDbu, 0, 0, 1e15);
  return {
    monthlySpend: num(value.monthlySpend, 0, 0, 1e12),
    mix: mixOf(value.mix),
    monthlyGrowth: num(value.monthlyGrowth, 0, 0, 0.2),
    commitDiscount: num(value.commitDiscount, 0, 0, 0.95),
    basket: basketOf(value.basket),
    ...(usage > 0 ? { usageDbu: usage } : {}),
  };
}

export function encodePortfolio(portfolio: Portfolio): string {
  return compressToEncodedURIComponent(JSON.stringify(portfolio));
}

export function decodePortfolio(encoded: string): Portfolio | null {
  if (!encoded) return null;
  const json = decompressFromEncodedURIComponent(encoded);
  if (!json) return null;
  try {
    return normalizePortfolio(JSON.parse(json));
  } catch {
    return null;
  }
}
