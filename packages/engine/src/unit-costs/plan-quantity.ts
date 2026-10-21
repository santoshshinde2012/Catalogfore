import { uid } from "../money.js";
import { METERED_SKUS, type Cloud, type MeteredSku, type Portfolio, type Tier, type Workload } from "../types.js";
import type { UnitCostConfidence, UnitCostRow, UnitCostStatus } from "./types.js";

/** The fields the plan needs from a unit-cost row. Callers may pass a full row. */
export interface UnitCostPlanTarget {
  productId: string;
  productName: string;
  componentName: string;
  partId: string | null;
  sku: string | null;
  unit: string;
  cloud: Cloud | null;
  region: string | null;
  tier: Tier | null;
  rateKind: UnitCostRow["rateKind"];
  status: UnitCostStatus;
  confidence: UnitCostConfidence;
}

export interface PlanQuantity {
  quantity: number;
  unit: string;
  workloadIds: readonly string[];
  adjustable: boolean;
}

export interface PlanQuantityUpdate {
  portfolio: Portfolio;
  selectedId: string;
}

export function planQuantityForUnitCost(portfolio: Portfolio, row: UnitCostPlanTarget): PlanQuantity | null {
  const matches = matchingWorkloads(portfolio, row);
  if (!matches.length) return null;
  return {
    quantity: matches.reduce((sum, workload) => sum + (billableQuantity(workload, row.unit) ?? 0), 0),
    unit: row.unit,
    workloadIds: matches.map((workload) => workload.id),
    adjustable: matches.every((workload) => canAdjust(workload, row.unit)),
  };
}

/** Update an adjustable workload, or append a catalog-priced DBU workload. Observed costs stay put. */
export function planQuantityAction(portfolio: Portfolio, row: UnitCostPlanTarget): "update" | "add" | null {
  const current = planQuantityForUnitCost(portfolio, row);
  if (current?.adjustable) return "update";
  if (current) return null;
  return canCreate(row) ? "add" : null;
}

export function applyPlanQuantity(
  portfolio: Portfolio,
  row: UnitCostPlanTarget,
  quantity: number,
  nextId: () => string = uid,
): PlanQuantityUpdate | null {
  if (!Number.isFinite(quantity) || quantity < 0 || quantity > 1e12) return null;
  const current = planQuantityForUnitCost(portfolio, row);
  if (current?.adjustable) return scaleMatches(portfolio, row, current, quantity);
  if (current || !canCreate(row)) return null;
  const id = nextId();
  const workload: Workload = {
    id,
    name: `${row.productName} · ${row.componentName}`,
    productId: row.productId,
    ...(row.partId ? { partId: row.partId } : {}),
    kind: "metered",
    sku: row.sku as MeteredSku,
    dbuPerMonth: quantity,
    ...(row.cloud ? { cloud: row.cloud } : {}),
    ...(row.region ? { region: row.region } : {}),
    ...(row.tier ? { tier: row.tier } : {}),
    inputs: { usageUnit: "DBU", usageQuantity: quantity },
  };
  return { portfolio: { ...portfolio, workloads: [...portfolio.workloads, workload] }, selectedId: id };
}

function scaleMatches(
  portfolio: Portfolio,
  row: UnitCostPlanTarget,
  current: PlanQuantity,
  quantity: number,
): PlanQuantityUpdate {
  const ids = new Set(current.workloadIds);
  let selectedId = current.workloadIds[0];
  const workloads = portfolio.workloads.map((workload) => {
    if (!ids.has(workload.id)) return workload;
    const share = current.quantity > 0 ? (billableQuantity(workload, row.unit) ?? 0) / current.quantity : 0;
    const next = current.quantity > 0 ? share * quantity : workload.id === selectedId ? quantity : 0;
    if (workload.id === selectedId) selectedId = workload.id;
    return withQuantity(workload, next, row.unit);
  });
  return { portfolio: { ...portfolio, workloads }, selectedId };
}

function matchingWorkloads(portfolio: Portfolio, row: UnitCostPlanTarget): Workload[] {
  return portfolio.workloads.filter((workload) => {
    if (workload.productId !== row.productId) return false;
    if (row.partId && workload.partId !== row.partId) return false;
    if (row.sku && skuOf(workload) !== row.sku) return false;
    if (billableQuantity(workload, row.unit) === null) return false;
    const cloud = workload.cloud ?? portfolio.cloud;
    const region = workload.region ?? portfolio.region;
    const tier = workload.tier ?? portfolio.tier;
    return (
      (!row.cloud || row.cloud === cloud) && (!row.region || row.region === region) && (!row.tier || row.tier === tier)
    );
  });
}

function billableQuantity(workload: Workload, unit: string): number | null {
  if (workload.kind !== "metered") return null;
  if (unit === "DBU" && Number.isFinite(workload.dbuPerMonth)) return workload.dbuPerMonth;
  const recorded = workload.inputs?.usageQuantity;
  if (workload.inputs?.usageUnit === unit && typeof recorded === "number" && Number.isFinite(recorded)) return recorded;
  if (unit !== "DBU" && typeof workload.units === "number" && Number.isFinite(workload.units)) return workload.units;
  return null;
}

function canAdjust(workload: Workload, unit: string): boolean {
  if (workload.kind !== "metered" || workload.fixedUsdByCloud || billableQuantity(workload, unit) === null)
    return false;
  return unit === "DBU" ? !workload.rateByPlacement : true;
}

function withQuantity(workload: Workload, quantity: number, unit: string): Workload {
  if (workload.kind !== "metered") return workload;
  const inputs =
    workload.inputs?.usageUnit === unit ? { ...workload.inputs, usageQuantity: quantity } : workload.inputs;
  if (unit === "DBU") return { ...workload, dbuPerMonth: quantity, ...(inputs ? { inputs } : {}) };
  return { ...workload, units: quantity, ...(inputs ? { inputs } : {}) };
}

function skuOf(workload: Workload): string | undefined {
  return "sku" in workload ? workload.sku : undefined;
}

function canCreate(row: UnitCostPlanTarget): boolean {
  return (
    row.unit === "DBU" &&
    row.rateKind === "money" &&
    row.status !== "unpriced" &&
    row.status !== "not_applicable" &&
    row.confidence !== "conflict" &&
    row.sku !== null &&
    (METERED_SKUS as readonly string[]).includes(row.sku)
  );
}
