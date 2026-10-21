import { productCatalog } from "@cayfore/catalog";
import { formulaFor } from "../formulas/product.js";
import { METERED_SKUS, type Portfolio, type Workload } from "../types.js";
import type { UnitCostPlanTarget } from "./plan-quantity.js";

export function quantityScale(portfolio: Portfolio): number {
  return Number.isFinite(portfolio.usageScale) && portfolio.usageScale > 0 ? portfolio.usageScale : 1;
}

export function matchingWorkloads(portfolio: Portfolio, row: UnitCostPlanTarget): Workload[] {
  return portfolio.workloads.filter((workload) => {
    if (workload.productId !== row.productId) return false;
    if (!partMatches(workload, row)) return false;
    if (row.sku && (!("sku" in workload) || workload.sku !== row.sku)) return false;
    if (billableQuantity(workload, row.unit) === null) return false;
    const cloud = workload.cloud ?? portfolio.cloud;
    const region = workload.region ?? portfolio.region;
    const tier = workload.tier ?? portfolio.tier;
    return (
      (!row.cloud || row.cloud === cloud) && (!row.region || row.region === region) && (!row.tier || row.tier === tier)
    );
  });
}

function partMatches(workload: Workload, row: UnitCostPlanTarget): boolean {
  if ((workload.partId ?? null) === row.partId) return true;
  // Usage exports identify a product and SKU, but do not carry catalog part IDs.
  if (workload.partId || !row.partId || !row.sku) return false;
  const parts = productCatalog.products.find((product) => product.id === row.productId)?.parts ?? [];
  const candidates = parts.filter((part) => part.patch.sku === row.sku);
  return candidates.length === 1 && candidates[0].id === row.partId;
}

export function billableQuantity(workload: Workload, unit: string): number | null {
  if (workload.kind !== "metered") return null;
  // A metered import may carry a non-DBU unit and a zero DBU placeholder.
  if (workload.inputs?.usageUnit && workload.inputs.usageUnit !== unit) return null;
  if (unit === "DBU" && Number.isFinite(workload.dbuPerMonth)) return workload.dbuPerMonth;
  if (workload.inputs?.usageUnit !== unit) return null;
  if (typeof workload.units === "number" && Number.isFinite(workload.units)) return workload.units;
  const recorded = workload.inputs.usageQuantity;
  return typeof recorded === "number" && Number.isFinite(recorded) ? recorded : null;
}

export function canAdjust(workload: Workload, unit: string): boolean {
  const quantity = billableQuantity(workload, unit);
  if (
    workload.kind !== "metered" ||
    workload.fixedUsdByCloud ||
    quantity === null ||
    quantity < 0 ||
    workload.priceStatus === "unpriced"
  )
    return false;
  if (workload.rateProvenance?.kind !== "imported" && formulaFor(workload)) return false;
  return unit === "DBU"
    ? !workload.rateByPlacement
    : Boolean(workload.rateByPlacement && typeof workload.units === "number");
}

export function canCreate(row: UnitCostPlanTarget): boolean {
  if (row.unit !== "DBU" || !row.sku || !(METERED_SKUS as readonly string[]).includes(row.sku)) return false;
  const product = productCatalog.products.find((product) => product.id === row.productId);
  if (!product) return false;
  const formula = row.partId ? product.parts?.find((part) => part.id === row.partId)?.formula : product.formula;
  return !formula && (!row.partId || Boolean(product.parts?.some((part) => part.id === row.partId)));
}
