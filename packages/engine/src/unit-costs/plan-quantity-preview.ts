import { roundMoney } from "../money.js";
import { detachSimple, normalizePortfolio } from "../portfolio.js";
import { projectPortfolio } from "../projection.js";
import type { Portfolio } from "../types.js";
import { applyPlanQuantity, type UnitCostPlanTarget } from "./plan-quantity.js";

export interface PlanQuantityPreview {
  currentMonthly: number;
  proposedMonthly: number;
  monthlyDelta: number;
  currentAnnual: number;
  proposedAnnual: number;
  annualDelta: number;
  hasUnpriced: boolean;
}

/** Price the same calendar-aware plan that applying this quantity will produce. */
export function previewPlanQuantity(
  portfolio: Portfolio,
  row: UnitCostPlanTarget,
  quantity: number,
): PlanQuantityPreview | null {
  let previewId = "unit-cost-preview";
  while (portfolio.workloads.some((workload) => workload.id === previewId)) previewId += "-next";
  const update = applyPlanQuantity(portfolio, row, quantity, () => previewId);
  if (!update) return null;
  const current = projectPortfolio(portfolio);
  const proposed = projectPortfolio(normalizePortfolio(detachSimple(update.portfolio)));
  const currentMonthly = current.points[0].total;
  const proposedMonthly = proposed.points[0].total;
  return {
    currentMonthly,
    proposedMonthly,
    monthlyDelta: roundMoney(proposedMonthly - currentMonthly),
    currentAnnual: current.annual,
    proposedAnnual: proposed.annual,
    annualDelta: roundMoney(proposed.annual - current.annual),
    hasUnpriced: current.hasUnpriced || proposed.hasUnpriced,
  };
}
