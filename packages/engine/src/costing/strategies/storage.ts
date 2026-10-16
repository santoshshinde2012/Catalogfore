import { lineShell } from "../support.js";
import { defineStrategy } from "../types.js";

export const storageStrategy = defineStrategy("storage", (workload, context) => {
  const { catalog, placement } = context;
  const rate = workload.managed
    ? catalog.managedStoragePerDsu[placement.cloud]
    : catalog.objectStoragePerGbMonth[placement.cloud];
  const multiplier = workload.rateMultiplier ?? 1;
  const base = lineShell(workload);
  base.notes.push(
    workload.managed ? "Managed storage, about 1 DSU per GB-month." : "Customer-owned object storage. Not a DSU.",
  );
  if (multiplier !== 1) base.notes.push(`Storage rate × ${multiplier}.`);
  return {
    ...base,
    sku: workload.managed ? "dsu" : "object_storage",
    hours: 0,
    dbu: 0,
    dbuCost: 0,
    cloudCost: Math.max(0, workload.gbMonth) * rate * multiplier,
  };
});
