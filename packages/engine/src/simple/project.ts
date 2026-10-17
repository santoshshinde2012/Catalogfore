import { fitUsageForecast, type UsageForecast } from "../forecast.js";
import { usageHistory } from "../usage.js";
import { estimate, type EstimateDependencies } from "../estimate.js";
import { defaultEstimateDependencies } from "../costing/estimate-portfolio.js";
import { forecast } from "../forecast.js";
import { clamp, roundMoney } from "../money.js";
import type { UncertaintyBand } from "../recommend.js";
import type { Cloud, Estimate, ForecastPoint, Portfolio, SimpleBasket, Tier, WorkloadMix } from "../types.js";
import { importUsageCsv } from "../usage.js";
import { bucketDbu, normalizeMix } from "./mix.js";
import { explain } from "./explain.js";
import { rollForward, spreadPercent } from "./roll-forward.js";
import { UploadError } from "../untrusted.js";
import { annualGrowthFromMonthly, basketForDbu, portfolioShell, regionFor, workloadsFromBasket } from "./shape.js";

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
}

/** Turn four inputs into a priced year. The basket is already chosen. This function does not pick a SKU rate. */
export function projectSimple(
  plan: SimplePlan,
  dependencies: EstimateDependencies = defaultEstimateDependencies,
): SimpleProjection {
  const region = regionFor(plan.cloud, plan.region);
  const normalized = { ...plan, region, mix: normalizeMix(plan.mix) };
  let portfolio = portfolioShell(normalized, workloadsFromBasket(normalized, normalized.basket));
  if (normalized.usageDbu && normalized.usageDbu > 0) {
    const probe = estimate(portfolio, dependencies);
    const scale = probe.dbu > 0 ? clamp(normalized.usageDbu / probe.dbu, 0.0001, 1000) : 1;
    portfolio = { ...portfolio, usageScale: snapScale(scale), usageCalibrated: true };
  }
  const result = estimate(portfolio, dependencies);
  const points = forecast(result, portfolio.forecast);
  const rolled = rollForward(portfolio, result, points);
  const fittedMonths = applyFittedMonths(normalized.usageForecast, result.total);
  const months = fittedMonths ?? rolled.months;
  const annual = fittedMonths
    ? roundMoney(fittedMonths.reduce((sum, month) => sum + month.expected, 0))
    : rolled.annual;
  const band = fittedMonths
    ? {
        ...rolled.band,
        low: roundMoney(fittedMonths.reduce((sum, month) => sum + month.low, 0)),
        expected: annual,
        high: roundMoney(fittedMonths.reduce((sum, month) => sum + month.high, 0)),
        calibrated: true,
      }
    : rolled.band;
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
    spreadPercent: spreadPercent(band),
    listMonthly: rolled.listMonthly,
    cloudShare: rolled.cloudShare,
    assumptions: explain(stored, result, band),
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
  delete draft.usageForecast;
  return { ...draft, monthlySpend: projectSimple(draft, dependencies).listMonthly };
}

export function planFromUsage(
  plan: SimplePlan,
  text: string,
  dependencies?: EstimateDependencies,
): { ok: true; plan: SimplePlan } | { ok: false; error: string } {
  try {
    return planFromUsageText(plan, text, dependencies);
  } catch (error) {
    if (error instanceof UploadError) return { ok: false, error: error.message };
    throw error;
  }
}

function planFromUsageText(
  plan: SimplePlan,
  text: string,
  dependencies?: EstimateDependencies,
): { ok: true; plan: SimplePlan } | { ok: false; error: string } {
  const history = usageHistory(text);
  const latest = history.months.length ? history.months[history.months.length - 1].period : undefined;
  const usage = importUsageCsv(text, history.months.length > 1 ? latest : undefined);
  if (!(usage.dbu > 0)) return { ok: false, error: "That file did not contain usage rows." };
  const buckets = bucketDbu(usage);
  const basket = basketForDbu(plan, buckets, dependencies);
  const fitted = fitUsageForecast(history);
  const draft: SimplePlan = {
    ...plan,
    mix: normalizeMix(buckets),
    basket,
    usageDbu: usage.dbu,
    monthlySpend: 0,
    ...(fitted
      ? {
          usageForecast: fitted,
          monthlyGrowth: clamp(fitted.monthlyGrowth, 0, 0.2),
        }
      : {}),
  };
  return { ok: true, plan: { ...draft, monthlySpend: projectSimple(draft, dependencies).listMonthly } };
}

function applyFittedMonths(forecast: UsageForecast | undefined, baseline: number): SimpleMonth[] | null {
  if (!forecast || !(baseline > 0) || forecast.ratios.length < 12) return null;
  return forecast.ratios.slice(0, 12).map((ratio, index) => ({
    month: index + 1,
    low: roundMoney(baseline * Math.min(ratio.low, ratio.expected)),
    expected: roundMoney(baseline * ratio.expected),
    high: roundMoney(baseline * Math.max(ratio.expected, ratio.high)),
  }));
}

function snapScale(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

export { annualGrowthFromMonthly };

export { defaultPlan, planForMix, planForPreset, planForSpend, withCommit, withGrowth } from "./plan-edits.js";
export { explain } from "./explain.js";
export { listMonthlyOf, rollForward, spreadPercent } from "./roll-forward.js";
