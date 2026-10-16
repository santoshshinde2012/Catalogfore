import type { ForecastRatio, UsageForecast, UsagePoint } from "./series.js";
import { Z, design, dot, ordinaryLeastSquares, seasonIndex } from "./linear.js";

export function logLinearForecast(
  points: UsagePoint[],
  season: number,
  method?: UsageForecast["method"],
): UsageForecast | null {
  const amounts = points.map((point) => point.amount);
  const seasons = points.map((point) => seasonIndex(point.period, season));
  const withSeason = season > 1 && points.length >= season + 2;
  const fitted = fitLogLinear(amounts, seasons, withSeason ? season : 0);
  if (!fitted) return null;
  const horizon = 12;
  const ratios = projectLogLinear(amounts, seasons, fitted, horizon, withSeason ? season : 0);
  if (!ratios) return null;
  const monthly = ratios;
  const name: UsageForecast["method"] = method ?? (withSeason ? "log-linear-seasonal" : "log-linear");
  const back = backtestLogLinear(amounts, seasons, withSeason ? season : 0, season === 7 ? 14 : 3);
  return {
    method: name,
    mape: back.mape,
    holdout: back.holdout,
    monthlyGrowth: (monthly[0]?.expected ?? 1) - 1,
    ratios: monthly,
  };
}

interface LinearFit {
  beta: number[];
  sigma: number;
  season: number;
}

function fitLogLinear(amounts: number[], seasons: number[], season: number): LinearFit | null {
  const y = amounts.map((amount) => Math.log(amount));
  const rows = y.map((_, index) => design(index, seasons[index] ?? 0, season));
  const beta = ordinaryLeastSquares(rows, y);
  if (!beta) return null;
  const residuals = y.map((value, index) => value - dot(beta, rows[index]));
  const freedom = Math.max(1, y.length - beta.length);
  const sigma = Math.sqrt(residuals.reduce((sum, value) => sum + value * value, 0) / freedom);
  return { beta, sigma, season };
}

function projectLogLinear(
  amounts: number[],
  seasons: number[],
  fitted: LinearFit,
  horizon: number,
  season: number,
): ForecastRatio[] | null {
  const last = amounts[amounts.length - 1];
  if (!(last > 0)) return null;
  const ratios: ForecastRatio[] = [];
  if (season === 7) {
    const buckets = Array.from({ length: 12 }, () => ({ low: 0, expected: 0, high: 0 }));
    for (let step = 1; step <= 365; step += 1) {
      const index = amounts.length - 1 + step;
      const month = Math.min(11, Math.floor((step - 1) / 30.4375));
      const dow = ((seasons[seasons.length - 1] ?? 0) + step) % 7;
      const band = stepBand(fitted, index, dow, season, amounts.length);
      buckets[month].low += band.low;
      buckets[month].expected += band.expected;
      buckets[month].high += band.high;
    }
    const anchor = amounts.slice(-30).reduce((sum, value) => sum + value, 0) / Math.min(30, amounts.length);
    if (!(anchor > 0)) return null;
    return buckets.map((bucket) => ({
      low: bucket.low / (anchor * 30.4375),
      expected: bucket.expected / (anchor * 30.4375),
      high: bucket.high / (anchor * 30.4375),
    }));
  }
  for (let step = 1; step <= horizon; step += 1) {
    const index = amounts.length - 1 + step;
    const seasonAt = season > 1 ? (seasons[seasons.length - 1] + step) % season : 0;
    const band = stepBand(fitted, index, seasonAt, season, amounts.length);
    ratios.push({
      low: band.low / last,
      expected: band.expected / last,
      high: band.high / last,
    });
  }
  return ratios;
}

function stepBand(fitted: LinearFit, index: number, seasonAt: number, season: number, count: number): ForecastRatio {
  const yhat = dot(fitted.beta, design(index, seasonAt, season));
  const spread = Z * fitted.sigma * Math.sqrt(1 + (index + 1) / count);
  return {
    low: Math.exp(yhat - spread),
    expected: Math.exp(yhat),
    high: Math.exp(yhat + spread),
  };
}

function backtestLogLinear(
  amounts: number[],
  seasons: number[],
  season: number,
  holdout: number,
): { mape: number | null; holdout: number } {
  if (amounts.length - holdout < Math.max(6, season === 0 ? 4 : season)) return { mape: null, holdout: 0 };
  const train = amounts.slice(0, -holdout);
  const trainSeasons = seasons.slice(0, -holdout);
  const fitted = fitLogLinear(train, trainSeasons, season);
  if (!fitted) return { mape: null, holdout: 0 };
  let total = 0;
  let used = 0;
  for (let step = 1; step <= holdout; step += 1) {
    const actual = amounts[train.length - 1 + step];
    if (!(actual > 0)) continue;
    const seasonAt = season > 1 ? (trainSeasons[trainSeasons.length - 1] + step) % season : 0;
    const expected = Math.exp(dot(fitted.beta, design(train.length - 1 + step, seasonAt, season)));
    total += Math.abs(expected - actual) / actual;
    used += 1;
  }
  return { mape: used ? total / used : null, holdout: used };
}
