/** Trend and seasonality fit for an imported usage series. Pure functions, no network. */

import { holtWintersForecast } from "./holt-winters.js";
import { logLinearForecast } from "./log-linear.js";

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
}

export function fitUsageForecast(input: { months: UsagePoint[]; days: UsagePoint[] }): UsageForecast | null {
  const months = positive(input.months);
  if (months.length >= 24) return holtWintersForecast(months);
  if (months.length >= 14) return logLinearForecast(months, 12);
  if (months.length >= 6) return logLinearForecast(months, 0);
  const days = positive(input.days);
  if (days.length >= 28) return logLinearForecast(days, 7, "log-linear-weekly");
  return null;
}

function positive(points: UsagePoint[]): UsagePoint[] {
  return points.filter((point) => Number.isFinite(point.amount) && point.amount > 0);
}
