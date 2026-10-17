import { isRecord, num } from "./portfolio-fields.js";
import type { StoredSimple } from "./types.js";
import { isMonth } from "./forecast/calendar.js";

export function forecastOf(value: unknown): StoredSimple["usageForecast"] | undefined {
  if (!isRecord(value) || !Array.isArray(value.ratios) || value.ratios.length < 12) return undefined;
  const method = value.method;
  if (
    method !== "holt-winters" &&
    method !== "log-linear-seasonal" &&
    method !== "log-linear-weekly" &&
    method !== "log-linear"
  ) {
    return undefined;
  }
  const ratios = value.ratios.slice(0, 12).map((ratio) => {
    const row = isRecord(ratio) ? ratio : {};
    const expected = num(row.expected, 1, 0, 100);
    return {
      low: Math.min(expected, num(row.low, expected, 0, 100)),
      expected,
      high: Math.max(expected, num(row.high, expected, 0, 100)),
    };
  });
  const mape = typeof value.mape === "number" && Number.isFinite(value.mape) ? value.mape : null;
  const holdout = num(value.holdout, 0, 0, 36);
  return {
    method,
    mape,
    holdout,
    monthlyGrowth: num(value.monthlyGrowth, 0, -1, 10),
    ratios,
    ...(isMonth(value.originPeriod) ? { originPeriod: value.originPeriod } : {}),
  };
}
