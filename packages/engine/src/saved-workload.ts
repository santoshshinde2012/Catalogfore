import { cloudOf, isRecord, tierOf } from "./portfolio-fields.js";
import { finite, text, oneOf } from "./saved-values.js";
import { listRegions } from "./catalog.js";
import { METERED_SKUS, type Cloud } from "./types.js";
import { validWorkloadAssumptions } from "./saved-assumptions.js";

export function validWorkload(value: unknown, defaultCloud: Cloud): value is Record<string, unknown> {
  if (!isRecord(value) || !text(value.id) || !text(value.name)) return false;
  if (!validWorkloadAssumptions(value)) return false;
  if (value.cloud != null && !cloudOf(value.cloud)) return false;
  if (value.tier != null && !tierOf(value.tier)) return false;
  if (
    value.region != null &&
    !listRegions(cloudOf(value.cloud) ?? defaultCloud).some((region) => region.id === value.region)
  )
    return false;
  const numeric = (keys: string[], signed = false) => keys.every((key) => finite(value[key], signed ? -1e15 : 0));
  const schedule = () =>
    isRecord(value.schedule) && finite(value.schedule.hoursPerDay, 0, 24) && finite(value.schedule.daysPerWeek, 0, 7);
  const scale = () =>
    isRecord(value.scale) &&
    finite(value.scale.min) &&
    finite(value.scale.max) &&
    value.scale.min <= value.scale.max &&
    finite(value.scale.utilization, 0, 1);
  switch (value.kind) {
    case "cluster":
      return (
        oneOf(value.sku, ["jobs_classic", "all_purpose_classic", "dlt_core", "dlt_pro", "dlt_advanced"]) &&
        text(value.instanceId) &&
        typeof value.photon === "boolean" &&
        finite(value.spotShare, 0, 1) &&
        finite(value.spotDiscount, 0, 0.95) &&
        schedule() &&
        scale()
      );
    case "serverless_compute":
      return (
        oneOf(value.sku, ["jobs_serverless", "all_purpose_serverless", "dlt_serverless"]) &&
        numeric(["dbuPerHour"]) &&
        schedule()
      );
    case "sql":
      return (
        oneOf(value.edition, ["classic", "pro", "serverless"]) &&
        oneOf(value.size, ["2xs", "xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl"]) &&
        scale() &&
        schedule()
      );
    case "model_serving":
      return (
        oneOf(value.mode, ["cpu", "gpu"]) && text(value.gpuId) && numeric(["concurrency", "replicas"]) && schedule()
      );
    case "foundation_model":
      return (
        text(value.modelId) && numeric(["inputTokensPerMonth", "outputTokensPerMonth", "provisionedHoursPerMonth"])
      );
    case "ai_search":
      return oneOf(value.variant, ["standard", "storage_optimized"]) && numeric(["units", "storageGb"]) && schedule();
    case "app":
      return oneOf(value.size, ["medium", "large"]) && schedule();
    case "lakebase":
      return numeric(["cu", "storageGb"]) && schedule();
    case "storage":
      return numeric(["gbMonth"]) && typeof value.managed === "boolean";
    case "egress":
      return numeric(["gbMonth"]);
    case "metered":
      return (
        oneOf(value.sku, METERED_SKUS) &&
        numeric(["dbuPerMonth"], isRecord(value.rateProvenance) && value.rateProvenance.kind === "imported")
      );
    default:
      return false;
  }
}
