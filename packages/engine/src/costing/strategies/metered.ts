import { discountDbu, lineShell, priceDbu } from "../support.js";
import { defineStrategy } from "../types.js";

export const meteredStrategy = defineStrategy("metered", (workload, context) => {
  const dbu = Math.max(0, workload.dbuPerMonth);
  const base = lineShell(workload);
  const cloud = context.placement.cloud;
  if (workload.rateByPlacement) {
    const units = Math.max(0, workload.units ?? 0);
    const rate = workload.rateByPlacement[cloud]?.[context.placement.tier];
    if (rate == null) base.notes.push("No list rate is stored for this cloud.");
    return {
      ...base,
      sku: workload.sku,
      hours: 0,
      dbu: 0,
      dbuCost: rate == null ? 0 : discountDbu(units * rate, context.portfolio),
      cloudCost: 0,
    };
  }
  if (workload.fixedUsdByCloud) {
    const usd = workload.fixedUsdByCloud[cloud];
    if (usd == null) base.notes.push("No list rate is stored for this cloud.");
    return {
      ...base,
      sku: workload.sku,
      hours: 0,
      dbu: 0,
      dbuCost: usd == null ? 0 : discountDbu(usd, context.portfolio),
      cloudCost: 0,
    };
  }
  if (workload.rateByCloud) {
    const rate = workload.rateByCloud[cloud];
    if (rate == null) base.notes.push("No list rate is stored for this cloud.");
    return {
      ...base,
      sku: workload.sku,
      hours: 0,
      dbu,
      dbuCost: rate == null ? 0 : discountDbu(dbu * rate, context.portfolio),
      cloudCost: 0,
    };
  }
  return { ...base, sku: workload.sku, hours: 0, dbu, dbuCost: priceDbu(dbu, context, workload.sku), cloudCost: 0 };
});
