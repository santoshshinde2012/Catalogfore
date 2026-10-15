import { hoursPerMonth } from "../../money.js";
import { lineShell, priceDbu } from "../support.js";
import { defineStrategy } from "../types.js";

export const aiSearchStrategy = defineStrategy("ai_search", (workload, context) => {
  const spec = context.catalog.aiSearch[workload.variant];
  const hours = hoursPerMonth(workload.schedule.hoursPerDay, workload.schedule.daysPerWeek);
  const units = Math.max(0, workload.units);
  const dbu = units * spec.dbuPerHour * hours;
  const billableGb = Math.max(0, workload.storageGb - spec.freeGb);
  const base = lineShell(workload);
  if (spec.freeGb > 0) base.notes.push(`First ${spec.freeGb} GB of index storage are free on this endpoint.`);
  return {
    ...base,
    sku: "ai_search",
    hours,
    dbu,
    cloudCost: billableGb * spec.storagePerGbMonth,
    dbuCost: priceDbu(dbu, context, "ai_search"),
  };
});
