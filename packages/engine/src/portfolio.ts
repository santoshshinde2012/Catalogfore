import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { listRegions, skuCatalog } from "./catalog.js";
import { FLAT_SEASONALITY } from "./forecast.js";
import { normalizeWorkload } from "./normalize-workload.js";
import { cloudOf, isRecord, num, str, tierOf } from "./portfolio-fields.js";
import { err, ok, type Result } from "./result.js";
import { JSON_MAX_CHARS, SHARE_MAX_CHARS, parseUntrustedJson } from "./untrusted.js";
import { savedPortfolioInput } from "./saved-schema.js";
import { normalizeSimple } from "./simple-fields.js";
import { normalizeEvents, normalizeUsage } from "./plan-fields.js";
import { isMonth } from "./forecast/calendar.js";
import type { Addon, Cloud, Portfolio, SeasonalityPreset, Workload } from "./types.js";

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
    priceBook: { version: skuCatalog.version, verifiedOn: skuCatalog.verifiedOn },
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
    ...(input.budgetAnnual != null ? { budgetAnnual: budget } : {}),
    ...(input.usageCalibrated === true ? { usageCalibrated: true } : {}),
    ...(simple ? { simple } : {}),
    priceBook:
      isRecord(input.priceBook) &&
      typeof input.priceBook.version === "string" &&
      typeof input.priceBook.verifiedOn === "string"
        ? { version: input.priceBook.version.slice(0, 80), verifiedOn: input.priceBook.verifiedOn.slice(0, 10) }
        : fallback.priceBook,
    ...(normalizeUsage(input.usage) ? { usage: normalizeUsage(input.usage) } : {}),
    ...(normalizeEvents(input.events, workloads) ? { events: normalizeEvents(input.events, workloads) } : {}),
    forecast: {
      months,
      ...(isMonth(forecast.startMonth) ? { startMonth: forecast.startMonth } : {}),
      annualGrowth: num(forecast.annualGrowth, 0, -0.99, 10),
      seasonality,
      customSeasonality: Array.from({ length: 12 }, (_, index) =>
        num(Array.isArray(forecast.customSeasonality) ? forecast.customSeasonality[index] : 1, 1, 0.05, 5),
      ),
    },
  };
}

export function encodePortfolio(portfolio: Portfolio): string {
  const shared = { ...portfolio };
  if (portfolio.usage) {
    const usage = { ...portfolio.usage };
    delete usage.attribution;
    shared.usage = usage;
  }
  return compressToEncodedURIComponent(JSON.stringify(shared));
}

/** Preserve an imported legacy fit when moving from the quick basket to detailed editing. */
export function detachSimple(portfolio: Portfolio): Portfolio {
  const next = { ...portfolio };
  if (portfolio.simple?.usageForecast && !portfolio.usage?.forecast) {
    next.usage = {
      source: "system-billing",
      selectedMonth: null,
      currency: "USD",
      costBasis: "Legacy usage-calibrated model; original history unavailable",
      observedMonths: [],
      observedUnit: "dbu",
      coverage: { pricedRows: 0, unpricedRows: 0, usedRows: 0, skippedRows: 0 },
      warnings: [],
      ...portfolio.usage,
      forecast: portfolio.simple.usageForecast,
    };
  }
  delete next.simple;
  return next;
}

export function parseSavedForecast(input: unknown): Result<Portfolio> {
  const validated = savedPortfolioInput(input);
  return validated.ok ? ok(normalizePortfolio(validated.value)) : validated;
}

/** Acknowledges deliberate repricing against the currently installed public price book. */
export function repricePortfolio(portfolio: Portfolio): Portfolio {
  return normalizePortfolio({
    ...portfolio,
    priceBook: { version: skuCatalog.version, verifiedOn: skuCatalog.verifiedOn },
  });
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
    const parsed = parseSavedForecast(parseUntrustedJson(json));
    return parsed.ok ? parsed.value : null;
  } catch {
    return null;
  }
}
