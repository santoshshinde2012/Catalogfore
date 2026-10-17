import { discountDbu, lineShell, priceDbu } from "../support.js";
import { defineStrategy } from "../types.js";
import { isNetImportedRate } from "../../pricing-basis.js";

export const meteredStrategy = defineStrategy("metered", (workload, context) => {
  const imported = workload.rateProvenance?.kind === "imported";
  const netImported = isNetImportedRate(workload.rateProvenance);
  const dbu = imported ? workload.dbuPerMonth : Math.max(0, workload.dbuPerMonth);
  const base = lineShell(workload);
  if (workload.priceStatus === "unpriced") {
    base.notes.push("Usage retained but unpriced; provide a labelled rate or a supported catalog mapping.");
    return { ...base, sku: workload.sku, hours: 0, dbu, dbuCost: 0, cloudCost: 0 };
  }
  const cloud = context.placement.cloud;
  if (workload.rateByPlacement) {
    const units = imported ? (workload.units ?? 0) : Math.max(0, workload.units ?? 0);
    const rate = workload.rateByPlacement[cloud]?.[context.placement.tier];
    if (rate == null) base.notes.push("No list rate is stored for this cloud.");
    return {
      ...base,
      sku: workload.sku,
      hours: 0,
      dbu: imported ? dbu : 0,
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
      dbu: imported ? dbu : 0,
      dbuCost: usd == null ? 0 : netImported ? usd : discountDbu(usd, context.portfolio),
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
