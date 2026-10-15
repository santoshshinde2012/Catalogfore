import { hoursPerMonth, scaledCount } from "../../money.js";
import type { SkuId } from "../../types.js";
import { cloudCommit, commitText, countText, factorText, hoursText, lineShell, priceDbu } from "../support.js";
import { defineStrategy } from "../types.js";

function sqlSku(edition: "classic" | "pro" | "serverless"): SkuId {
  if (edition === "pro") return "sql_pro";
  if (edition === "serverless") return "sql_serverless";
  return "sql_classic";
}

export const sqlStrategy = defineStrategy("sql", (workload, context) => {
  const { catalog, portfolio, placement } = context;
  const hours = hoursPerMonth(workload.schedule.hoursPerDay, workload.schedule.daysPerWeek);
  const clusters = scaledCount(workload.scale.min, workload.scale.max, workload.scale.utilization);
  const sku = sqlSku(workload.edition);
  const dbu = catalog.sqlDbuPerHour[workload.size] * clusters * hours;
  const rate = catalog.skuRate(placement.cloud, placement.tier, sku);
  const base = lineShell(workload);
  base.notes.push(
    `${catalog.sqlDbuPerHour[workload.size]} DBU/h × ${countText(clusters)} × ${hoursText(hours)} × $${rate}/DBU × ${factorText(placement.factor)}.${commitText(portfolio)}`,
  );
  let cloudCost = 0;
  if (workload.edition !== "serverless") {
    const perDbu = workload.vmPerDbuHour ?? catalog.sqlVmDollarsPerDbuHour;
    cloudCost = cloudCommit(dbu * Math.max(0, perDbu), 0, portfolio);
    base.notes.push(catalog.sqlVmNote);
    base.approximateVm = workload.vmPerDbuHour == null;
  } else {
    base.notes.push("Serverless SQL includes compute in the DBU rate.");
  }
  return { ...base, sku, hours, dbu, dbuCost: priceDbu(dbu, context, sku), cloudCost };
});
