import { defaultEstimateDependencies, estimate, type EstimateDependencies } from "../estimate.js";
import { roundMoney } from "../money.js";
import { addonEligibleCost } from "../pricing-basis.js";
import { recomputeProduct } from "../formulas/product.js";
import type { Estimate, ForecastPoint, Portfolio } from "../types.js";
import { isMonth, shiftMonth } from "./calendar.js";
import { seasonalityVector } from "./model.js";
import { forecastRatioAt } from "./ratios.js";

export interface PricedMonth {
  point: ForecastPoint;
  estimate: Estimate;
  factor: number;
  addonRate: number;
}

/** Formula inputs, events, and list prices are evaluated for each calendar month. */
export function forecastPortfolioMonths(
  portfolio: Portfolio,
  dependencies: EstimateDependencies = defaultEstimateDependencies,
  baseline?: Estimate,
): PricedMonth[] {
  const start = isMonth(portfolio.forecast.startMonth)
    ? portfolio.forecast.startMonth
    : dependencies.catalog.verifiedOn.slice(0, 7);
  const seasons = seasonalityVector(portfolio.forecast);
  const mean = seasons.reduce((sum, value) => sum + value, 0) / seasons.length;
  const annualGrowth = Number.isFinite(portfolio.forecast.annualGrowth) ? portfolio.forecast.annualGrowth : 0;
  const fitted = portfolio.simple?.usageForecast ?? portfolio.usage?.forecast;
  const addonRate = dependencies.catalog.addonRates[portfolio.addon];
  return Array.from({ length: portfolio.forecast.months }, (_, index) => {
    const period = shiftMonth(start, index);
    const dated = {
      ...portfolio,
      workloads: portfolio.workloads.map((workload) => recomputeProduct(workload, `${period}-01`)),
    };
    const formulasChanged = dated.workloads.some(
      (workload, workloadIndex) => workload !== portfolio.workloads[workloadIndex],
    );
    const priced = baseline && !formulasChanged ? baseline : estimate(dated, dependencies);
    const adjusted = applyEvents(priced, portfolio, period, addonRate);
    const season = seasons[(Number(period.slice(5, 7)) - 1) % 12] / mean;
    const ratio = forecastRatioAt(fitted, period, index)?.expected;
    const factor = ratio ?? Math.pow(1 + annualGrowth, index / 12) * season;
    const dbuCost = roundMoney(adjusted.dbuCost * factor);
    const cloudCost = roundMoney(adjusted.cloudCost * factor);
    const addonCost = roundMoney(adjusted.addonCost * factor);
    return {
      estimate: adjusted,
      factor,
      addonRate,
      point: {
        month: index + 1,
        period,
        dbuCost,
        cloudCost,
        addonCost,
        total: roundMoney(dbuCost + cloudCost + addonCost),
      },
    };
  });
}

function applyEvents(result: Estimate, portfolio: Portfolio, period: string, addonRate: number): Estimate {
  const active = portfolio.events?.filter((event) => event.month <= period) ?? [];
  if (!active.length) return result;
  const lines = result.lines.map((line) => {
    const factor = active
      .filter((event) => !event.workloadId || event.workloadId === line.workloadId)
      .reduce((value, event) => value * event.usageMultiplier, 1);
    const dbuCost = roundMoney(line.dbuCost * factor);
    const cloudCost = roundMoney(line.cloudCost * factor);
    return { ...line, dbu: line.dbu * factor, dbuCost, cloudCost, total: roundMoney(dbuCost + cloudCost) };
  });
  const dbuCost = roundMoney(lines.reduce((sum, line) => sum + line.dbuCost, 0));
  const cloudCost = roundMoney(lines.reduce((sum, line) => sum + line.cloudCost, 0));
  const addonCost = roundMoney(addonEligibleCost(lines) * addonRate);
  return {
    ...result,
    lines,
    dbu: lines.reduce((sum, line) => sum + line.dbu, 0),
    dbuCost,
    cloudCost,
    addonCost,
    total: roundMoney(dbuCost + cloudCost + addonCost),
  };
}
