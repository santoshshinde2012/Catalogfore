import { lineShell } from "../support.js";
import { defineStrategy } from "../types.js";

export const egressStrategy = defineStrategy("egress", (workload, context) => {
  const rate = workload.pricePerGb ?? context.catalog.defaultEgressPerGb[context.placement.cloud];
  const base = lineShell(workload);
  base.notes.push("Egress uses a single editable $/GB. Cross-region and cross-AZ tariffs are not itemized.");
  return {
    ...base,
    sku: "egress",
    hours: 0,
    dbu: 0,
    dbuCost: 0,
    cloudCost: Math.max(0, workload.gbMonth) * Math.max(0, rate),
  };
});
