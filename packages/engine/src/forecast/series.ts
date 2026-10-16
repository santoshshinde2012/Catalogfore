/** Trend and seasonality fit for an imported usage series. Pure functions, no network. */

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

const Z = 1.96;

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

function logLinearForecast(
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

function holtWintersForecast(points: UsagePoint[]): UsageForecast | null {
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
  const back = backtestHoltWinters(amounts, season, best, 3);
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
          const sigma = Math.sqrt(sse / errors.length);
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
    errors.push(amounts[index] - forecast);
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

function backtestHoltWinters(amounts: number[], season: number, params: HoltParams, holdout: number): number | null {
  if (amounts.length - holdout < season * 2) return null;
  const train = amounts.slice(0, -holdout);
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

function design(index: number, seasonAt: number, season: number): number[] {
  const row = [1, index];
  if (season > 1) {
    for (let slot = 1; slot < season; slot += 1) row.push(seasonAt === slot ? 1 : 0);
  }
  return row;
}

function ordinaryLeastSquares(rows: number[][], y: number[]): number[] | null {
  const width = rows[0]?.length ?? 0;
  if (!width || rows.length < width) return null;
  const xtx = Array.from({ length: width }, () => Array.from({ length: width }, () => 0));
  const xty = Array.from({ length: width }, () => 0);
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    for (let left = 0; left < width; left += 1) {
      xty[left] += row[left] * y[rowIndex];
      for (let right = 0; right < width; right += 1) xtx[left][right] += row[left] * row[right];
    }
  }
  for (let index = 0; index < width; index += 1) xtx[index][index] += 1e-8;
  return solve(xtx, xty);
}

function solve(matrix: number[][], vector: number[]): number[] | null {
  const size = vector.length;
  const rows = matrix.map((row, index) => [...row, vector[index]]);
  for (let col = 0; col < size; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < size; row += 1) {
      if (Math.abs(rows[row][col]) > Math.abs(rows[pivot][col])) pivot = row;
    }
    const swap = rows[col];
    rows[col] = rows[pivot];
    rows[pivot] = swap;
    const scale = rows[col][col];
    if (Math.abs(scale) < 1e-10) return null;
    for (let colIndex = col; colIndex <= size; colIndex += 1) rows[col][colIndex] /= scale;
    for (let row = 0; row < size; row += 1) {
      if (row === col) continue;
      const factor = rows[row][col];
      for (let colIndex = col; colIndex <= size; colIndex += 1) rows[row][colIndex] -= factor * rows[col][colIndex];
    }
  }
  return rows.map((row) => row[size]);
}

function dot(left: number[], right: number[]): number {
  return left.reduce((sum, value, index) => sum + value * right[index], 0);
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function seasonIndex(period: string, season: number): number {
  if (season === 7) {
    const date = new Date(`${period.slice(0, 10)}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? 0 : date.getUTCDay();
  }
  if (season === 12) {
    const month = Number(period.slice(5, 7));
    return Number.isFinite(month) ? month - 1 : 0;
  }
  return 0;
}
