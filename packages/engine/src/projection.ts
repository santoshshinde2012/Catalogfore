import { defaultEstimateDependencies, type EstimateDependencies } from "./estimate.js";
import { annualTotal } from "./forecast.js";
import { forecastPortfolioMonths } from "./forecast/portfolio.js";
import { forecastRatioAt } from "./forecast/ratios.js";
import { roundMoney } from "./money.js";
import type { UncertaintyBand } from "./recommend.js";
import { listMonthlyOf, spreadPercent } from "./simple/roll-forward.js";
import type { SimpleMonth } from "./simple/project.js";
import type { Estimate, ForecastPoint, Portfolio } from "./types.js";
import { uncertaintyFactors } from "./uncertainty.js";

export interface PortfolioProjection {
  portfolio: Portfolio;
  estimate: Estimate;
  points: ForecastPoint[];
  months: SimpleMonth[];
  /** Usage-model interval, separate from price/infrastructure planning assumptions. */
  predictionMonths?: SimpleMonth[];
  annual: number;
  band: UncertaintyBand;
  spreadPercent: number;
  listMonthly: number;
  cloudShare: number;
  assumptions: string[];
}

/** All presentation and export callers consume these same reconciled monthly amounts. */
export function projectPortfolio(
  portfolio: Portfolio,
  dependencies: EstimateDependencies = defaultEstimateDependencies,
): PortfolioProjection {
  const priced = forecastPortfolioMonths(portfolio, dependencies);
  const result = priced[0].estimate;
  const points = priced.map((month) => month.point);
  const factors = uncertaintyFactors(portfolio, result);
  const fit = portfolio.simple?.usageForecast ?? portfolio.usage?.forecast;
  const predictionMonths = fit
    ? points.map((point, index) => {
        const ratio = forecastRatioAt(fit, point.period!, index);
        const denominator = ratio?.expected ?? 0;
        const values =
          ratio && denominator > 0
            ? [point.total, (point.total * ratio.low) / denominator, (point.total * ratio.high) / denominator]
            : [point.total];
        return {
          month: point.month,
          low: roundMoney(Math.min(...values)),
          expected: point.total,
          high: roundMoney(Math.max(...values)),
        };
      })
    : undefined;
  const months = points.map((point, index) => {
    const bounds = [predictionMonths?.[index].low ?? point.total, predictionMonths?.[index].high ?? point.total];
    const values = [point.total, ...bounds.flatMap((bound) => [bound * factors.low, bound * factors.high])];
    return {
      month: point.month,
      low: roundMoney(Math.min(...values)),
      expected: point.total,
      high: roundMoney(Math.max(...values)),
    };
  });
  const annual = annualTotal(points);
  const reasons = [...factors.reasons];
  if (fit)
    reasons.push(
      `Usage-model interval from ${fit.method}; price/infrastructure planning assumptions are applied separately. The combined range is not a calibrated probability interval.`,
    );
  if (fit && points.length > fit.ratios.length)
    reasons.push(
      `The fitted usage model covers ${fit.ratios.length} months. Later points use the configured growth and seasonality, with the separate planning range.`,
    );
  if (fit?.originPeriod && points[0].period !== fit.originPeriod)
    reasons.push(
      `The usage model originates in ${fit.originPeriod}. Ratios align to calendar months; periods outside its fitted window use configured growth and seasonality.`,
    );
  const band = {
    low: roundMoney(months.slice(0, 12).reduce((sum, month) => sum + month.low, 0)),
    expected: annual,
    high: roundMoney(months.slice(0, 12).reduce((sum, month) => sum + month.high, 0)),
    calibrated: factors.calibrated,
    reasons,
  };
  const assumptions = [
    fit
      ? `The active usage forecast is ${fit.method}.`
      : `Growth is ${(portfolio.forecast.annualGrowth * 100).toFixed(1)}% per year with ${portfolio.forecast.seasonality} seasonality.`,
    `Prices use catalog ${result.catalogVersion}, verified ${result.verifiedOn}; forecast starts ${points[0].period}.`,
    ...reasons,
    ...result.warnings,
  ];
  return {
    portfolio,
    estimate: result,
    points,
    months,
    annual,
    band,
    spreadPercent: spreadPercent(band),
    listMonthly: listMonthlyOf(result, portfolio.commitment.dbuDiscount),
    cloudShare: result.total > 0 ? result.cloudCost / result.total : 0,
    assumptions,
    ...(predictionMonths ? { predictionMonths } : {}),
  };
}
