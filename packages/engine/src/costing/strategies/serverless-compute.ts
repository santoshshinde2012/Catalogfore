import { hoursPerMonth } from "../../money.js";
import { commitText, countText, factorText, hoursText, lineShell, priceDbu } from "../support.js";
import { defineStrategy } from "../types.js";

export const serverlessComputeStrategy = defineStrategy("serverless_compute", (workload, context) => {
  const { catalog, placement } = context;
  const hours = hoursPerMonth(workload.schedule.hoursPerDay, workload.schedule.daysPerWeek);
  const dbu = Math.max(0, workload.dbuPerHour) * hours;
  const rate = catalog.skuRate(placement.cloud, placement.tier, workload.sku);
  const base = lineShell(workload);
  base.notes.push(
    `${countText(workload.dbuPerHour)} DBU/h × ${hoursText(hours)} × $${rate}/DBU × ${factorText(placement.factor)}.${commitText(context.portfolio)} Serverless includes compute, so there is no VM line.`,
  );
  return { ...base, sku: workload.sku, hours, dbu, dbuCost: priceDbu(dbu, context, workload.sku), cloudCost: 0 };
});
