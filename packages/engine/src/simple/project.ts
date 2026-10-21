import type { UsageForecast } from "../forecast.js";
import { estimate, type EstimateDependencies } from "../estimate.js";
import { defaultEstimateDependencies } from "../costing/estimate-portfolio.js";
import { clamp, roundMoney } from "../money.js";
import type { UncertaintyBand } from "../recommend.js";
import type { Cloud, Estimate, ForecastPoint, Portfolio, SimpleBasket, Tier, WorkloadMix } from "../types.js";
import { normalizeMix } from "./mix.js";
import { explain } from "./explain.js";
import { projectPortfolio } from "../projection.js";
import { UploadError } from "../untrusted.js";
import { annualGrowthFromMonthly, portfolioShell, regionFor, workloadsFromBasket } from "./shape.js";
import { importedPlan } from "./import-plan.js";

export interface SimplePlan {
  cloud: Cloud;
  tier: Tier;
  region: string;
  monthlySpend: number;
  mix: WorkloadMix;
  monthlyGrowth: number;
  commitDiscount: number;
  basket: SimpleBasket;
  usageDbu?: number;
  usageForecast?: UsageForecast;
  importedPortfolio?: Portfolio;
}

export interface SimpleMonth {
  month: number;
  low: number;
  expected: number;
  high: number;
}

export interface SimpleProjection {
  plan: SimplePlan;
  portfolio: Portfolio;
  estimate: Estimate;
  points: ForecastPoint[];
  months: SimpleMonth[];
  annual: number;
  band: UncertaintyBand;
  spreadPercent: number;
  listMonthly: number;
  cloudShare: number;
  assumptions: string[];
  hasUnpriced: boolean;
}

/** Turn four inputs into a priced year. The basket is already chosen. This function does not pick a SKU rate. */
export function projectSimple(
  plan: SimplePlan,
  dependencies: EstimateDependencies = defaultEstimateDependencies,
): SimpleProjection {
  if (plan.importedPortfolio) {
    const projection = projectPortfolio(plan.importedPortfolio, dependencies);
    return { ...projection, plan: { ...plan, monthlySpend: projection.listMonthly } };
  }
  const region = regionFor(plan.cloud, plan.region);
  const normalized = { ...plan, region, mix: normalizeMix(plan.mix) };
  let portfolio = portfolioShell(normalized, workloadsFromBasket(normalized, normalized.basket));
  if (normalized.usageDbu && normalized.usageDbu > 0) {
    const probe = estimate(portfolio, dependencies);
    const scale = probe.dbu > 0 ? clamp(normalized.usageDbu / probe.dbu, 0.0001, 1000) : 1;
    portfolio = { ...portfolio, usageScale: snapScale(scale), usageCalibrated: true };
  }
  const rolled = projectPortfolio(portfolio, dependencies);
  const { estimate: result, points, months, annual, band } = rolled;
  const stored: SimplePlan = {
    ...normalized,
    monthlySpend: roundMoney(normalized.monthlySpend),
    commitDiscount: portfolio.commitment.dbuDiscount,
    monthlyGrowth: portfolio.simple?.monthlyGrowth ?? normalized.monthlyGrowth,
    basket: portfolio.simple?.basket ?? normalized.basket,
    ...(portfolio.simple?.usageDbu ? { usageDbu: portfolio.simple.usageDbu } : {}),
    ...(normalized.usageForecast ? { usageForecast: normalized.usageForecast } : {}),
  };
  return {
    plan: stored,
    portfolio,
    estimate: result,
    points,
    months,
    annual,
    band,
    spreadPercent: rolled.spreadPercent,
    listMonthly: rolled.listMonthly,
    cloudShare: rolled.cloudShare,
    assumptions: explain(stored, result, band),
    hasUnpriced: rolled.hasUnpriced,
  };
}

export function withRates(
  plan: SimplePlan,
  next: { cloud: Cloud; tier: Tier; region: string },
  dependencies?: EstimateDependencies,
): SimplePlan {
  const draft: SimplePlan = {
    ...plan,
    cloud: next.cloud,
    tier: next.tier,
    region: regionFor(next.cloud, next.region),
  };
  if (draft.importedPortfolio) draft.importedPortfolio = { ...draft.importedPortfolio, ...next, region: draft.region };
  delete draft.usageForecast;
  return { ...draft, monthlySpend: projectSimple(draft, dependencies).listMonthly };
}

export function planFromUsage(
  plan: SimplePlan,
  text: string,
  dependencies?: EstimateDependencies,
): { ok: true; plan: SimplePlan } | { ok: false; error: string } {
  try {
    return { ok: true, plan: importedPlan(plan, text, dependencies) };
  } catch (error) {
    if (error instanceof UploadError) return { ok: false, error: error.message };
    throw error;
  }
}

function snapScale(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

export { annualGrowthFromMonthly };

export { defaultPlan, planForMix, planForPreset, planForSpend, withCommit, withGrowth } from "./plan-edits.js";
export { explain } from "./explain.js";
export { listMonthlyOf, rollForward, spreadPercent } from "./roll-forward.js";
