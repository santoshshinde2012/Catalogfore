import { lineShell, priceDbu } from "../support.js";
import { defineStrategy } from "../types.js";

export const meteredStrategy = defineStrategy("metered", (workload, context) => {
  const dbu = Math.max(0, workload.dbuPerMonth);
  const base = lineShell(workload);
  return { ...base, sku: workload.sku, hours: 0, dbu, dbuCost: priceDbu(dbu, context, workload.sku), cloudCost: 0 };
});
