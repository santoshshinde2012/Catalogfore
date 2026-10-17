import { logLinearForecast } from "./log-linear.js";
import type { UsageForecast, UsagePoint } from "./series.js";
import { Z } from "./linear.js";

export function holtWintersForecast(points: UsagePoint[]): UsageForecast | null {
  const amounts = points.map((point) => point.amount);
  const season = 12;
  const best = tuneHoltWinters(amounts, season);
  if (!best) return logLinearForecast(points, 12);
  const future = holtWintersAhead(amounts, season, best, 12);
  const last = amounts[amounts.length - 1];
  const ratios = future.map((value) => {
    const width = Z * best.sigma * Math.max(1, value.step / season);
    return {
      low: Math.max(0, value.expected - width) / last,
      expected: Math.max(0, value.expected) / last,
      high: (value.expected + width) / last,
    };
  });
  const back = backtestHoltWinters(amounts, season, 3);
  return {
    method: "holt-winters",
    mape: back,
    holdout: back == null ? 0 : 3,
    monthlyGrowth: (ratios[0]?.expected ?? 1) - 1,
    ratios,
  };
}

interface HoltParams {
  alpha: number;
  beta: number;
  gamma: number;
  sigma: number;
}

function tuneHoltWinters(amounts: number[], season: number): HoltParams | null {
  if (amounts.length < season * 2) return null;
  let best: { sse: number; params: HoltParams } | null = null;
  for (const alpha of [0.2, 0.4, 0.6]) {
    for (const beta of [0.05, 0.2, 0.4]) {
      for (const gamma of [0.05, 0.2, 0.4]) {
        const errors = holtErrors(amounts, season, alpha, beta, gamma);
        if (!errors) continue;
        const sse = errors.reduce((sum, value) => sum + value * value, 0);
        if (!best || sse < best.sse) {
          const sigma = Math.sqrt(sse / Math.max(1, errors.length));
          best = { sse, params: { alpha, beta, gamma, sigma } };
        }
      }
    }
  }
  return best?.params ?? null;
}

function holtErrors(amounts: number[], season: number, alpha: number, beta: number, gamma: number): number[] | null {
  const state = initHolt(amounts, season);
  if (!state) return null;
  const errors: number[] = [];
  for (let index = season; index < amounts.length; index += 1) {
    const seasonal = state.seasonal[index % season];
    const forecast = state.level + state.trend + seasonal;
    if (index >= season * 2) errors.push(amounts[index] - forecast);
    const level = alpha * (amounts[index] - seasonal) + (1 - alpha) * (state.level + state.trend);
    const trend = beta * (level - state.level) + (1 - beta) * state.trend;
    state.seasonal[index % season] = gamma * (amounts[index] - level) + (1 - gamma) * seasonal;
    state.level = level;
    state.trend = trend;
  }
  return errors;
}

function holtWintersAhead(
  amounts: number[],
  season: number,
  params: HoltParams,
  horizon: number,
): { expected: number; step: number }[] {
  const state = initHolt(amounts, season);
  if (!state) return [];
  for (let index = season; index < amounts.length; index += 1) {
    const seasonal = state.seasonal[index % season];
    const level = params.alpha * (amounts[index] - seasonal) + (1 - params.alpha) * (state.level + state.trend);
    const trend = params.beta * (level - state.level) + (1 - params.beta) * state.trend;
    state.seasonal[index % season] = params.gamma * (amounts[index] - level) + (1 - params.gamma) * seasonal;
    state.level = level;
    state.trend = trend;
  }
  const out: { expected: number; step: number }[] = [];
  for (let step = 1; step <= horizon; step += 1) {
    const seasonal = state.seasonal[(amounts.length - 1 + step) % season];
    out.push({ expected: state.level + step * state.trend + seasonal, step });
  }
  return out;
}

function backtestHoltWinters(amounts: number[], season: number, holdout: number): number | null {
  if (amounts.length - holdout < season * 2) return null;
  const train = amounts.slice(0, -holdout);
  const params = tuneHoltWinters(train, season);
  if (!params) return null;
  const future = holtWintersAhead(train, season, params, holdout);
  let total = 0;
  let used = 0;
  future.forEach((value, index) => {
    const actual = amounts[train.length + index];
    if (!(actual > 0)) return;
    total += Math.abs(value.expected - actual) / actual;
    used += 1;
  });
  return used ? total / used : null;
}

function initHolt(amounts: number[], season: number): { level: number; trend: number; seasonal: number[] } | null {
  if (amounts.length < season * 2) return null;
  const first = average(amounts.slice(0, season));
  const second = average(amounts.slice(season, season * 2));
  return {
    level: first,
    trend: (second - first) / season,
    seasonal: amounts.slice(0, season).map((value) => value - first),
  };
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
