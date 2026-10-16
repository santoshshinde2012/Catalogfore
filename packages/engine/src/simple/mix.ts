import type { UsageImport, WorkloadMix } from "../types.js";

const ETL = new Set(["jobs_classic", "jobs_serverless", "dlt_core", "dlt_pro", "dlt_advanced", "dlt_serverless"]);
const SQL = new Set(["sql_classic", "sql_pro", "sql_serverless", "all_purpose_classic", "all_purpose_serverless"]);
const ML = new Set(["model_serving", "model_training", "ai_search"]);

export function normalizeMix(mix: WorkloadMix): WorkloadMix {
  const etl = finite(mix.etl);
  const sql = finite(mix.sql);
  const ml = finite(mix.ml);
  const sum = etl + sql + ml;
  if (sum <= 0) return { etl: 1 / 3, sql: 1 / 3, ml: 1 / 3 };
  return { etl: etl / sum, sql: sql / sum, ml: ml / sum };
}

/** Move one share and rescale the other two so the mix still sums to 1. */
export function adjustMix(current: WorkloadMix, key: keyof WorkloadMix, nextValue: number): WorkloadMix {
  const clamped = Math.min(1, Math.max(0, finite(nextValue)));
  const others = (["etl", "sql", "ml"] as const).filter((item) => item !== key);
  const rest = 1 - clamped;
  const otherSum = others.reduce((sum, item) => sum + finite(current[item]), 0);
  const next: WorkloadMix = { ...normalizeMix(current), [key]: clamped };
  if (otherSum <= 0) {
    const share = rest / others.length;
    for (const item of others) next[item] = share;
  } else {
    for (const item of others) next[item] = (finite(current[item]) / otherSum) * rest;
  }
  return normalizeMix(next);
}

export function bucketDbu(usage: UsageImport): WorkloadMix {
  let etl = 0;
  let sql = 0;
  let ml = 0;
  for (const row of usage.bySku) {
    if (ETL.has(row.sku)) etl += row.dbu;
    else if (ML.has(row.sku)) ml += row.dbu;
    else if (SQL.has(row.sku)) sql += row.dbu;
    else etl += row.dbu;
  }
  return { etl, sql, ml };
}

export function mixFromUsage(usage: UsageImport): WorkloadMix {
  return normalizeMix(bucketDbu(usage));
}

function finite(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}
