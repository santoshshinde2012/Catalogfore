import { skuCatalog } from "./catalog.js";
import { uid } from "./money.js";
import type { Workload } from "./types.js";

export type MenuKind =
  | "jobs"
  | "all_purpose"
  | "dlt"
  | "serverless_jobs"
  | "serverless_notebooks"
  | "serverless_dlt"
  | "sql"
  | "serving"
  | "foundation"
  | "search"
  | "app"
  | "lakebase"
  | "storage"
  | "egress"
  | "metered";

/** Default workload for a template. Product rows patch this; they do not invent a second formula. */
export function createWorkload(kind: MenuKind): Workload {
  const id = uid();
  const day = { hoursPerDay: 8, daysPerWeek: 5 };
  switch (kind) {
    case "jobs":
      return {
        id,
        name: "Jobs cluster",
        kind: "cluster",
        sku: "jobs_classic",
        instanceId: "m5.xlarge",
        scale: { min: 2, max: 4, utilization: 0.6 },
        photon: false,
        spotShare: 0,
        spotDiscount: skuCatalog.defaultSpotDiscount,
        schedule: day,
      };
    case "all_purpose":
      return {
        id,
        name: "Interactive cluster",
        kind: "cluster",
        sku: "all_purpose_classic",
        instanceId: "m5.xlarge",
        scale: { min: 1, max: 1, utilization: 1 },
        photon: false,
        spotShare: 0,
        spotDiscount: skuCatalog.defaultSpotDiscount,
        schedule: { hoursPerDay: 6, daysPerWeek: 5 },
      };
    case "dlt":
      return {
        id,
        name: "Pipeline",
        kind: "cluster",
        sku: "dlt_pro",
        instanceId: "i3.xlarge",
        scale: { min: 2, max: 4, utilization: 0.75 },
        photon: true,
        spotShare: 0,
        spotDiscount: skuCatalog.defaultSpotDiscount,
        schedule: { hoursPerDay: 24, daysPerWeek: 7 },
      };
    case "serverless_jobs":
      return {
        id,
        name: "Serverless jobs",
        kind: "serverless_compute",
        sku: "jobs_serverless",
        dbuPerHour: 8,
        schedule: day,
      };
    case "serverless_notebooks":
      return {
        id,
        name: "Serverless notebooks",
        kind: "serverless_compute",
        sku: "all_purpose_serverless",
        dbuPerHour: 4,
        schedule: { hoursPerDay: 6, daysPerWeek: 5 },
      };
    case "serverless_dlt":
      return {
        id,
        name: "Serverless pipeline",
        kind: "serverless_compute",
        sku: "dlt_serverless",
        dbuPerHour: 12,
        schedule: { hoursPerDay: 24, daysPerWeek: 7 },
      };
    case "sql":
      return {
        id,
        name: "SQL warehouse",
        kind: "sql",
        edition: "serverless",
        size: "s",
        scale: { min: 1, max: 2, utilization: 0.45 },
        schedule: { hoursPerDay: 8, daysPerWeek: 5 },
      };
    case "serving":
      return {
        id,
        name: "Serving endpoint",
        kind: "model_serving",
        mode: "cpu",
        concurrency: 2,
        gpuId: "t4",
        replicas: 1,
        schedule: { hoursPerDay: 12, daysPerWeek: 7 },
      };
    case "foundation":
      return {
        id,
        name: "Foundation model",
        kind: "foundation_model",
        modelId: "llama-3.1-8b",
        inputTokensPerMonth: 5_000_000,
        outputTokensPerMonth: 1_000_000,
        provisionedHoursPerMonth: 0,
      };
    case "search":
      return {
        id,
        name: "AI Search",
        kind: "ai_search",
        variant: "standard",
        units: 1,
        storageGb: 20,
        schedule: { hoursPerDay: 24, daysPerWeek: 7 },
      };
    case "app":
      return { id, name: "Databricks App", kind: "app", size: "medium", schedule: { hoursPerDay: 10, daysPerWeek: 5 } };
    case "lakebase":
      return {
        id,
        name: "Lakebase",
        kind: "lakebase",
        cu: 2,
        storageGb: 50,
        schedule: { hoursPerDay: 16, daysPerWeek: 7 },
      };
    case "storage":
      return { id, name: "Managed storage", kind: "storage", gbMonth: 500, managed: true };
    case "egress":
      return { id, name: "Egress", kind: "egress", gbMonth: 200 };
    case "metered":
      return { id, name: "Predictive optimization", kind: "metered", sku: "managed_services", dbuPerMonth: 200 };
  }
}
