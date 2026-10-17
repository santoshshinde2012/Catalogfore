import { annualTotal } from "../forecast.js";
import { clamp, roundMoney } from "../money.js";
import { uncertaintyBand, uncertaintyFactors, type UncertaintyBand } from "../recommend.js";
import type { Estimate, ForecastPoint, Portfolio } from "../types.js";
import type { SimpleMonth } from "./project.js";
import { isNetImportedRate } from "../pricing-basis.js";

/** Twelve (or more) months from one estimate, including the uncertainty band. */
export function rollForward(portfolio: Portfolio, result: Estimate, points: ForecastPoint[]) {
  const annual = annualTotal(points);
  const band = uncertaintyBand(annual, portfolio, result);
  const factors = uncertaintyFactors(portfolio, result);
  const months: SimpleMonth[] = points.map((point) => ({
    month: point.month,
    low: roundMoney(Math.min(point.total * factors.low, point.total * factors.high)),
    expected: point.total,
    high: roundMoney(Math.max(point.total * factors.low, point.total * factors.high)),
  }));
  return {
    annual,
    band,
    months,
    spreadPercent: spreadPercent(band),
    listMonthly: listMonthlyOf(result, portfolio.commitment.dbuDiscount),
    cloudShare: result.total > 0 ? result.cloudCost / result.total : 0,
  };
}

/** Half-width relative to the expected magnitude; credits retain their visible uncertainty. */
export function spreadPercent(band: UncertaintyBand): number {
  const magnitude = Math.abs(band.expected);
  if (!(magnitude > 0)) return 0;
  const width = Math.max(band.expected - band.low, band.high - band.expected);
  return Math.round((width / magnitude) * 100);
}

/** List monthly dollars before the Databricks commitment discount. Cloud dollars stay. */
export function listMonthlyOf(result: Estimate, commitDiscount: number): number {
  const keep = 1 - clamp(commitDiscount, 0, 0.95);
  const netImports = result.lines
    .filter((line) => isNetImportedRate(line.rateProvenance))
    .reduce((sum, line) => sum + line.dbuCost, 0);
  const listDbu = keep > 0 ? (result.dbuCost - netImports) / keep + netImports : result.dbuCost;
  const listAddon = keep > 0 ? result.addonCost / keep : result.addonCost;
  return roundMoney(listDbu + result.cloudCost + listAddon);
}
