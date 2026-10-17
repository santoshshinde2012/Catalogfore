import { hoursPerMonth } from "../../money.js";
import { lineShell, priceDbu } from "../support.js";
import { defineStrategy } from "../types.js";
import { SERVING_DBU_PER_CONCURRENT_REQUEST_HOUR } from "../../rates/components.js";

export const modelServingStrategy = defineStrategy("model_serving", (workload, context) => {
  const hours = hoursPerMonth(workload.schedule.hoursPerDay, workload.schedule.daysPerWeek);
  const gpu = context.catalog.servingGpuDbuPerHour.find((row) => row.id === workload.gpuId);
  const dbu =
    workload.mode === "cpu"
      ? Math.max(0, workload.concurrency) * hours * SERVING_DBU_PER_CONCURRENT_REQUEST_HOUR
      : (gpu?.dbuPerHour ?? 0) * Math.max(0, workload.replicas) * hours;
  const base = lineShell(workload);
  if (workload.mode === "gpu" && !gpu) base.notes.push("Unknown GPU profile.");
  if (workload.mode === "cpu") base.notes.push("CPU serving: 1 concurrent request-hour = 1 DBU.");
  return { ...base, sku: "model_serving", hours, dbu, dbuCost: priceDbu(dbu, context, "model_serving"), cloudCost: 0 };
});
