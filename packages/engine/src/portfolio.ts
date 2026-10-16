import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { listRegions } from "./catalog.js";
import { FLAT_SEASONALITY } from "./forecast.js";
import { normalizeWorkload } from "./normalize-workload.js";
import { cloudOf, isRecord, num, str, tierOf } from "./portfolio-fields.js";
import { err, ok, type Result } from "./result.js";
import { JSON_MAX_CHARS, SHARE_MAX_CHARS, parseUntrustedJson } from "./untrusted.js";
import type {
  Addon,
  Cloud,
  Portfolio,
  SeasonalityPreset,
  SimpleBasket,
  StoredSimple,
  Workload,
  WorkloadMix,
} from "./types.js";

const ADDONS: Addon[] = ["none", "compliance", "mission_critical"];

export function blankPortfolio(cloud: Cloud = "aws"): Portfolio {
  const region = listRegions(cloud)[0]?.id ?? "us-east-1";
  return {
    version: 1,
    name: "Untitled forecast",
    cloud,
    region,
    tier: "premium",
    workloads: [],
    commitment: { dbuDiscount: 0, cloudDiscount: 0 },
    addon: "none",
    usageScale: 1,
    forecast: { months: 12, annualGrowth: 0.08, seasonality: "flat", customSeasonality: [...FLAT_SEASONALITY] },
  };
}

export function normalizePortfolio(input: unknown): Portfolio {
  const fallback = blankPortfolio();
  if (!isRecord(input)) return fallback;
  const cloud = cloudOf(input.cloud) ?? "aws";
  const regions = listRegions(cloud);
  const region =
    typeof input.region === "string" && regions.some((item) => item.id === input.region) ? input.region : regions[0].id;
  const tier = tierOf(input.tier) ?? "premium";
  const commitment = isRecord(input.commitment) ? input.commitment : {};
  const forecast = isRecord(input.forecast) ? input.forecast : {};
  const seasonality: SeasonalityPreset =
    forecast.seasonality === "retail" || forecast.seasonality === "custom" ? forecast.seasonality : "flat";
  const months = forecast.months === 24 || forecast.months === 36 ? forecast.months : 12;
  const workloads = Array.isArray(input.workloads)
    ? input.workloads
        .map((workload) => normalizeWorkload(workload, cloud))
        .filter((workload): workload is Workload => workload !== null)
    : [];
  const addon = ADDONS.includes(input.addon as Addon) ? (input.addon as Addon) : "none";
  const budget = num(input.budgetAnnual, 0, 0, 1e12);
  const simple = normalizeSimple(input.simple);
  return {
    version: 1,
    name: str(input.name, fallback.name).slice(0, 80),
    cloud,
    region,
    tier,
    workloads,
    commitment: {
      dbuDiscount: num(commitment.dbuDiscount, 0, 0, 0.95),
      cloudDiscount: num(commitment.cloudDiscount, 0, 0, 0.95),
    },
    addon,
    usageScale: num(input.usageScale, 1, 0.0001, 1000),
    ...(budget > 0 ? { budgetAnnual: budget } : {}),
    ...(input.usageCalibrated === true ? { usageCalibrated: true } : {}),
    ...(simple ? { simple } : {}),
    forecast: {
      months,
      annualGrowth: num(forecast.annualGrowth, 0, -0.9, 10),
      seasonality,
      customSeasonality: Array.from({ length: 12 }, (_, index) =>
        num(Array.isArray(forecast.customSeasonality) ? forecast.customSeasonality[index] : 1, 1, 0.05, 5),
      ),
    },
  };
}

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

function normalizeSimple(value: unknown): StoredSimple | undefined {
  if (!isRecord(value)) return undefined;
  const usage = num(value.usageDbu, 0, 0, 1e15);
  const usageForecast = forecastOf(value.usageForecast);
  return {
    monthlySpend: num(value.monthlySpend, 0, 0, 1e12),
    mix: mixOf(value.mix),
    monthlyGrowth: num(value.monthlyGrowth, 0, 0, 0.2),
    commitDiscount: num(value.commitDiscount, 0, 0, 0.95),
    basket: basketOf(value.basket),
    ...(usage > 0 ? { usageDbu: usage } : {}),
    ...(usageForecast ? { usageForecast } : {}),
  };
}

function forecastOf(value: unknown): StoredSimple["usageForecast"] | undefined {
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
      low: num(row.low, expected, 0, 100),
      expected,
      high: num(row.high, expected, 0, 100),
    };
  });
  const mape = typeof value.mape === "number" && Number.isFinite(value.mape) ? value.mape : null;
  const holdout = num(value.holdout, 0, 0, 36);
  return { method, mape, holdout, monthlyGrowth: num(value.monthlyGrowth, 0, -0.9, 10), ratios };
}

export function encodePortfolio(portfolio: Portfolio): string {
  return compressToEncodedURIComponent(JSON.stringify(portfolio));
}

/** Decode a share link. A bad link is an error value, not an exception. */
export function decodePortfolioResult(encoded: string): Result<Portfolio> {
  const portfolio = decodePortfolio(encoded);
  if (!portfolio) return err("That link is not a forecast.");
  return ok(portfolio);
}

export function decodePortfolio(encoded: string): Portfolio | null {
  if (!encoded || encoded.length > SHARE_MAX_CHARS) return null;
  const json = decompressFromEncodedURIComponent(encoded);
  if (!json || json.length > JSON_MAX_CHARS) return null;
  try {
    return normalizePortfolio(parseUntrustedJson(json));
  } catch {
    return null;
  }
}
