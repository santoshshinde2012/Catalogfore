import { uid } from "../money.js";
import type { MeteredSku, Portfolio, Workload } from "../types.js";
import type { UnitCostRow } from "./types.js";
import { unitCostQuote } from "./quote.js";
import { billableQuantity, canAdjust, canCreate, matchingWorkloads, quantityScale } from "./plan-quantity-match.js";

/** Matches the saved workload quantity limit, including after usage calibration. */
export const MAX_PLAN_QUANTITY = 1e12;

export type UnitCostPlanTarget = Pick<
  UnitCostRow,
  | "productId"
  | "productName"
  | "componentName"
  | "partId"
  | "sku"
  | "unit"
  | "cloud"
  | "region"
  | "tier"
  | "rateKind"
  | "status"
  | "confidence"
  | "unitQuantity"
  | "unitPriceUsd"
  | "usdPerUnit"
>;

export interface PlanQuantity {
  /** Billable baseline-month quantity after the portfolio's usage calibration. */
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
    quantity:
      matches.reduce((sum, workload) => sum + (billableQuantity(workload, row.unit) ?? 0), 0) *
      quantityScale(portfolio),
    unit: row.unit,
    workloadIds: matches.map((workload) => workload.id),
    adjustable: matches.every((workload) => canAdjust(workload, row.unit)),
  };
}

export function planQuantityUnavailableReason(portfolio: Portfolio, row: UnitCostPlanTarget): string | null {
  const quote = unitCostQuote(row);
  if (quote.reason) return quote.reason;
  const matches = matchingWorkloads(portfolio, row);
  if (matches.some((workload) => workload.kind === "metered" && workload.fixedUsdByCloud))
    return "This usage includes a fixed or exported cost. Edit it in the forecast to preserve the recorded amount.";
  if (matches.some((workload) => (billableQuantity(workload, row.unit) ?? 0) < 0))
    return "This usage includes billing corrections. Edit individual workloads in the forecast to preserve their signs.";
  if (matches.length)
    return matches.every((workload) => canAdjust(workload, row.unit))
      ? null
      : "Edit this product's usage drivers in the forecast; this component quantity cannot safely replace them.";
  return canCreate(row)
    ? null
    : "Only resolved DBU components without product usage formulas can be added here. Add this product in the forecast to set its usage drivers.";
}

/** Update an adjustable monthly quantity, or append a catalog-priced DBU workload. */
export function planQuantityAction(portfolio: Portfolio, row: UnitCostPlanTarget): "update" | "add" | null {
  if (planQuantityUnavailableReason(portfolio, row)) return null;
  return planQuantityForUnitCost(portfolio, row) ? "update" : "add";
}

export function applyPlanQuantity(
  portfolio: Portfolio,
  row: UnitCostPlanTarget,
  quantity: number,
  nextId: () => string = uid,
): PlanQuantityUpdate | null {
  const rawQuantity = quantity / quantityScale(portfolio);
  if (!Number.isFinite(quantity) || quantity < 0 || quantity > MAX_PLAN_QUANTITY || rawQuantity > MAX_PLAN_QUANTITY)
    return null;
  if (!planQuantityAction(portfolio, row)) return null;
  const current = planQuantityForUnitCost(portfolio, row);
  if (current) return scaleMatches(portfolio, row, current, quantity, rawQuantity);
  const id = nextId();
  if (!id || portfolio.workloads.some((workload) => workload.id === id)) return null;
  const workload: Workload = {
    id,
    name: `${row.productName} · ${row.componentName}`,
    productId: row.productId,
    ...(row.partId ? { partId: row.partId } : {}),
    kind: "metered",
    sku: row.sku as MeteredSku,
    dbuPerMonth: rawQuantity,
    ...(row.cloud ? { cloud: row.cloud } : {}),
    ...(row.region ? { region: row.region } : {}),
    ...(row.tier ? { tier: row.tier } : {}),
    inputs: { usageUnit: "DBU", usageQuantity: rawQuantity },
  };
  return { portfolio: { ...portfolio, workloads: [...portfolio.workloads, workload] }, selectedId: id };
}

function scaleMatches(
  portfolio: Portfolio,
  row: UnitCostPlanTarget,
  current: PlanQuantity,
  quantity: number,
  rawQuantity: number,
): PlanQuantityUpdate {
  const ids = new Set(current.workloadIds);
  const selectedId = current.workloadIds[0];
  const workloads = portfolio.workloads.map((workload) => {
    if (!ids.has(workload.id) || workload.kind !== "metered") return workload;
    const next =
      current.quantity > 0
        ? ((billableQuantity(workload, row.unit) ?? 0) / current.quantity) * quantity
        : workload.id === selectedId
          ? rawQuantity
          : 0;
    const inputs =
      workload.inputs?.usageUnit === row.unit ? { ...workload.inputs, usageQuantity: next } : workload.inputs;
    return {
      ...workload,
      ...(row.unit === "DBU" ? { dbuPerMonth: next } : { units: next }),
      ...(inputs ? { inputs } : {}),
    };
  });
  return { portfolio: { ...portfolio, workloads }, selectedId };
}
