import { hoursPerMonth } from "../../money.js";
import { commitText, countText, hoursText, lineShell, priceDbu, skuCharge } from "../support.js";
import { defineStrategy } from "../types.js";

export const serverlessComputeStrategy = defineStrategy("serverless_compute", (workload, context) => {
  const hours = hoursPerMonth(workload.schedule.hoursPerDay, workload.schedule.daysPerWeek);
  const dbu = Math.max(0, workload.dbuPerHour) * hours;
  const charge = skuCharge(context, workload.sku);
  const base = lineShell(workload);
  base.notes.push(
    `${countText(workload.dbuPerHour)} DBU/h × ${hoursText(hours)} × ${charge.text}.${commitText(context.portfolio)} Serverless includes compute, so there is no VM line.`,
  );
  return { ...base, sku: workload.sku, hours, dbu, dbuCost: priceDbu(dbu, context, workload.sku), cloudCost: 0 };
});
