/** Trend and seasonality fit for an imported usage series. Pure functions, no network. */

import { holtWintersForecast } from "./holt-winters.js";
import { logLinearForecast } from "./log-linear.js";
import { calendarDay, isMonth, monthIndex, shiftMonth } from "./calendar.js";

export interface UsagePoint {
  period: string;
  amount: number;
}

export interface ForecastRatio {
  low: number;
  expected: number;
  high: number;
}

export interface UsageForecast {
  method: "holt-winters" | "log-linear-seasonal" | "log-linear-weekly" | "log-linear";
  /** Mean absolute percentage error on a holdout. Null when the series is too short to hold any months back. */
  mape: number | null;
  holdout: number;
  /** Expected change from the last observation to the next period, before the 20% control clamp. */
  monthlyGrowth: number;
  ratios: ForecastRatio[];
  /** Calendar month of ratios[0], YYYY-MM. Absent on legacy saved fits. */
  originPeriod?: string;
}

export function fitUsageForecast(input: { months: UsagePoint[]; days: UsagePoint[] }): UsageForecast | null {
  if (input.months.some((point) => point.amount < 0)) return null;
  const months = observed(input.months);
  const contiguous = months.every(
    (point, index) => index === 0 || monthIndex(point.period) - monthIndex(months[index - 1].period) === 1,
  );
  if (months.length >= 24 && contiguous && months.every((point) => point.amount > 0))
    return withOrigin(holtWintersForecast(months), months);
  if (months.length >= 14) return withOrigin(logLinearForecast(months, 12), months);
  if (months.length >= 6) return withOrigin(logLinearForecast(months, 0), months);
  const days = observed(input.days, true);
  if (days.length >= 28) return withOrigin(logLinearForecast(days, 7, "log-linear-weekly"), days);
  return null;
}

function withOrigin(forecast: UsageForecast | null, points: UsagePoint[]): UsageForecast | null {
  return forecast ? { ...forecast, originPeriod: shiftMonth(points[points.length - 1].period.slice(0, 7), 1) } : null;
}

function observed(points: UsagePoint[], daily = false): UsagePoint[] {
  // A signed correction is not consumption. Refuse to fit that series instead of dropping it.
  if (points.some((point) => !Number.isFinite(point.amount) || point.amount < 0)) return [];
  if (points.some((point) => (daily ? !calendarDay(point.period) : !isMonth(point.period)))) return [];
  return points
    .map((point) => ({ ...point, period: daily ? calendarDay(point.period)! : point.period }))
    .sort((left, right) => left.period.localeCompare(right.period));
}
