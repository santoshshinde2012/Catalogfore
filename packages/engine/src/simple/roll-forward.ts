import { annualTotal } from "../forecast.js";
import { clamp, roundMoney } from "../money.js";
import { uncertaintyBand, uncertaintyFactors, type UncertaintyBand } from "../recommend.js";
import type { Estimate, ForecastPoint, Portfolio } from "../types.js";
import type { SimpleMonth } from "./project.js";

/** Twelve (or more) months from one estimate, including the uncertainty band. */
export function rollForward(portfolio: Portfolio, result: Estimate, points: ForecastPoint[]) {
  const annual = annualTotal(points);
  const band = uncertaintyBand(annual, portfolio, result);
  const factors = uncertaintyFactors(portfolio, result);
  const months: SimpleMonth[] = points.map((point) => ({
    month: point.month,
    low: roundMoney(point.total * factors.low),
    expected: point.total,
    high: roundMoney(point.total * factors.high),
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

/** Half-width of the band as a percent of the expected year. */
export function spreadPercent(band: UncertaintyBand): number {
  if (!(band.expected > 0)) return 0;
  const width = Math.max(band.expected - band.low, band.high - band.expected);
  return Math.round((width / band.expected) * 100);
}

/** List monthly dollars before the Databricks commitment discount. Cloud dollars stay. */
export function listMonthlyOf(result: Estimate, commitDiscount: number): number {
  const keep = 1 - clamp(commitDiscount, 0, 0.95);
  const listDbu = keep > 0 ? result.dbuCost / keep : result.dbuCost;
  return roundMoney(listDbu + result.cloudCost + result.addonCost);
}
