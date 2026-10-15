import { hoursPerMonth } from "../../money.js";
import { discountDbu, lineShell } from "../support.js";
import { defineStrategy } from "../types.js";

export const lakebaseStrategy = defineStrategy("lakebase", (workload, context) => {
  const { catalog, portfolio, placement } = context;
  const hours = hoursPerMonth(workload.schedule.hoursPerDay, workload.schedule.daysPerWeek);
  const base = lineShell(workload);
  if (!catalog.lakebase.available[placement.cloud]) {
    base.notes.push("Lakebase is not priced on this cloud in the bundled catalog.");
    return { ...base, sku: "lakebase", hours, dbu: 0, dbuCost: 0, cloudCost: 0 };
  }
  const compute = Math.max(0, workload.cu) * hours * catalog.lakebase.usdPerCuHour[placement.cloud];
  const storage = Math.max(0, workload.storageGb) * catalog.lakebase.usdPerGbMonth[placement.cloud];
  base.notes.push(catalog.lakebase.note);
  return {
    ...base,
    sku: "lakebase",
    hours,
    dbu: 0,
    dbuCost: discountDbu(compute * placement.factor, portfolio),
    cloudCost: storage,
  };
});
