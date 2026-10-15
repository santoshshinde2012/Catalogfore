import { hoursPerMonth } from "../../money.js";
import { lineShell, priceDbu } from "../support.js";
import { defineStrategy } from "../types.js";

export const appStrategy = defineStrategy("app", (workload, context) => {
  const hours = hoursPerMonth(workload.schedule.hoursPerDay, workload.schedule.daysPerWeek);
  const dbu = context.catalog.appsDbuPerHour[workload.size] * hours;
  const base = lineShell(workload);
  base.notes.push("Apps bill interactive-serverless DBUs. Medium is 0.5 DBU/hour, Large is 1.");
  return { ...base, sku: "apps", hours, dbu, dbuCost: priceDbu(dbu, context, "apps"), cloudCost: 0 };
});
