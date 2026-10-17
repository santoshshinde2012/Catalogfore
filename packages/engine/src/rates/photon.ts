import type { Cloud, ClusterSku } from "../types.js";

/**
 * Azure's instance tables rate Jobs Photon at 2.5×, All-Purpose at 2×.
 * Its Lakeflow feature table separately specifies 2.9× for classic pipelines.
 * AWS/GCP job ratings retain the published 2.9× planning factor; All-Purpose
 * uses the approximately 2× factor described by Databricks. Per-instance
 * ratings can differ; this is an explicit assumption, not a runtime speedup.
 * https://azure.microsoft.com/en-us/pricing/details/databricks/
 * https://www.databricks.com/blog/chaos-control-cost-maturity-journey-databricks
 */
export function publishedPhotonMultiplier(cloud: Cloud, sku: ClusterSku): number {
  if (sku === "all_purpose_classic") return 2;
  if (cloud === "azure" && sku === "jobs_classic") return 2.5;
  return 2.9;
}
