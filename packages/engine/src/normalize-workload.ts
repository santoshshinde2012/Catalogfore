import { defaultInstanceId, skuCatalog } from "./catalog.js";
import { METERED_SKUS, type Cloud, type Workload } from "./types.js";
import { base, cloudOf, cloudRates, isRecord, num, placementRates, scale, schedule, str } from "./portfolio-fields.js";

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
      ...(input.rateMultiplier == null ? {} : { rateMultiplier: num(input.rateMultiplier, 1, 0, 100) }),
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
    const sku = (METERED_SKUS as readonly string[]).includes(String(input.sku))
      ? (input.sku as Extract<Workload, { kind: "metered" }>["sku"])
      : "managed_services";
    const rateByCloud = cloudRates(input.rateByCloud);
    const fixedUsdByCloud = cloudRates(input.fixedUsdByCloud);
    const rateByPlacement = placementRates(input.rateByPlacement);
    return {
      ...base(input, "Metered DBUs"),
      kind,
      sku,
      dbuPerMonth: num(input.dbuPerMonth, 100, 0, 1e12),
      ...(input.units == null ? {} : { units: num(input.units, 0, 0, 1e12) }),
      ...(rateByCloud ? { rateByCloud } : {}),
      ...(fixedUsdByCloud ? { fixedUsdByCloud } : {}),
      ...(rateByPlacement ? { rateByPlacement } : {}),
    };
  }
  return null;
}
