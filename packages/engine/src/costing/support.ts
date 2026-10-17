import type { PricingCatalog } from "../catalog/pricing-catalog.js";
import { clamp } from "../money.js";
import type { Portfolio, SkuId, Workload } from "../types.js";
import type { CostContext, Placement, RawLine } from "./types.js";

export interface SkuCharge {
  perDbu: number;
  text: string;
}

export function resolvePlacement(catalog: PricingCatalog, portfolio: Portfolio, workload: Workload): Placement {
  const cloud = workload.cloud ?? portfolio.cloud;
  const region = catalog.region(cloud, workload.region ?? portfolio.region);
  return {
    cloud,
    region: region.id,
    tier: workload.tier ?? portfolio.tier,
    factor: region.factor,
    regionSource: region.source,
  };
}

export function discountDbu(amount: number, portfolio: Portfolio): number {
  return amount * (1 - clamp(portfolio.commitment.dbuDiscount, 0, 0.95));
}

export function skuCharge(context: CostContext, sku: SkuId): SkuCharge {
  const { catalog, placement } = context;
  const conflict = catalog.firstPartyDbuConflict?.(placement.cloud, placement.region, placement.tier, sku);
  if (conflict)
    return { perDbu: 0, text: "Unpriced: first-party sources disagree for this SKU and placement; cost is withheld" };
  const regional = catalog.regionalSkuRate?.(placement.cloud, placement.region, placement.tier, sku) ?? null;
  if (regional != null) {
    return {
      perDbu: regional,
      text: `$${regional}/DBU from the ${placement.cloud === "azure" ? "Azure meter" : "Databricks public price card"} for this region`,
    };
  }
  const rate = catalog.skuRate(placement.cloud, placement.tier, sku);
  return { perDbu: rate * placement.factor, text: `$${rate}/DBU × ${factorText(placement.factor)}` };
}

export function priceDbu(dbu: number, context: CostContext, sku: SkuId): number {
  return discountDbu(dbu * skuCharge(context, sku).perDbu, context.portfolio);
}

export function cloudCommit(onDemand: number, spot: number, portfolio: Portfolio): number {
  const discount = clamp(portfolio.commitment.cloudDiscount, 0, 0.95);
  return onDemand * (1 - discount) + spot;
}

export function countText(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

export function hoursText(hours: number): string {
  return `${Math.round(hours * 10) / 10} h`;
}

export function factorText(factor: number): string {
  const text = Math.abs(factor - 1) < 1e-9 ? "1" : String(Math.round(factor * 1e6) / 1e6);
  return `region ×${text}`;
}

export function commitText(portfolio: Portfolio): string {
  const commit = portfolio.commitment.dbuDiscount;
  return commit > 0 ? ` A ${Math.round(commit * 100)}% DBU commit comes off after that.` : "";
}

export function lineShell(
  workload: Workload,
): Pick<RawLine, "workloadId" | "name" | "kind" | "approximateVm" | "notes"> {
  return {
    workloadId: workload.id,
    name: workload.name,
    kind: workload.kind,
    approximateVm: false,
    notes: [],
  };
}
