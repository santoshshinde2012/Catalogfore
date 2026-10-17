import { isRecord, num } from "./portfolio-fields.js";
import { forecastOf } from "./forecast-fields.js";
import type { SimpleBasket, StoredSimple, WorkloadMix } from "./types.js";

function mixOf(value: unknown): WorkloadMix {
  const record = isRecord(value) ? value : {};
  const etl = Math.max(0, num(record.etl, 0, 0, 1_000_000));
  const sql = Math.max(0, num(record.sql, 0, 0, 1_000_000));
  const ml = Math.max(0, num(record.ml, 0, 0, 1_000_000));
  const sum = etl + sql + ml;
  if (sum <= 0) return { etl: 1 / 3, sql: 1 / 3, ml: 1 / 3 };
  return { etl: etl / sum, sql: sql / sum, ml: ml / sum };
}

function basketOf(value: unknown): SimpleBasket {
  const record = isRecord(value) ? value : {};
  return {
    etlNodes: num(record.etlNodes, 0, 0, 1_000_000),
    etlHoursPerDay: num(record.etlHoursPerDay, 8, 0, 24),
    sqlClusters: num(record.sqlClusters, 0, 0, 1_000_000),
    mlInputTokens: num(record.mlInputTokens, 0, 0, 1e15),
  };
}

export function normalizeSimple(value: unknown): StoredSimple | undefined {
  if (!isRecord(value)) return undefined;
  const usage = num(value.usageDbu, 0, 0, 1e15);
  const usageForecast = forecastOf(value.usageForecast);
  return {
    monthlySpend: num(value.monthlySpend, 0, 0, 1e12),
    mix: mixOf(value.mix),
    monthlyGrowth: num(value.monthlyGrowth, 0, -0.2, 0.2),
    commitDiscount: num(value.commitDiscount, 0, 0, 0.95),
    basket: basketOf(value.basket),
    ...(usage > 0 ? { usageDbu: usage } : {}),
    ...(usageForecast ? { usageForecast } : {}),
  };
}
