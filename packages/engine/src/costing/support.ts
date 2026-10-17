import type { PricingCatalog } from "../catalog/pricing-catalog.js";
import { resolveDbuRate } from "../catalog/resolve-dbu-rate.js";
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
  const quote = resolveDbuRate(context.catalog, context.placement, sku);
  return { perDbu: quote.usdPerDbu ?? 0, text: quote.summary };
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
