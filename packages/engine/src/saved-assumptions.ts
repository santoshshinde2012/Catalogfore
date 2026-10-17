import { isMonth } from "./forecast/calendar.js";
import { isRecord } from "./portfolio-fields.js";
import { finite, oneOf, text } from "./saved-values.js";

export function validUsageForecast(value: unknown): boolean {
  if (
    !isRecord(value) ||
    !oneOf(value.method, ["holt-winters", "log-linear-seasonal", "log-linear-weekly", "log-linear"])
  )
    return false;
  if (value.mape !== null && !finite(value.mape, 0, 1e6)) return false;
  if (value.originPeriod != null && !isMonth(value.originPeriod)) return false;
  return (
    finite(value.holdout, 0, 365) &&
    Number.isInteger(value.holdout) &&
    finite(value.monthlyGrowth, -1, 10) &&
    Array.isArray(value.ratios) &&
    value.ratios.length >= 12 &&
    value.ratios.length <= 36 &&
    value.ratios.every(
      (ratio) =>
        isRecord(ratio) &&
        finite(ratio.low, 0, 100) &&
        finite(ratio.expected, 0, 100) &&
        finite(ratio.high, 0, 100) &&
        ratio.low <= ratio.expected &&
        ratio.expected <= ratio.high,
    )
  );
}

export function validSimple(value: unknown): boolean {
  if (
    !isRecord(value) ||
    !finite(value.monthlySpend, 0, 1e12) ||
    !finite(value.monthlyGrowth, -0.2, 0.2) ||
    !finite(value.commitDiscount, 0, 0.95)
  )
    return false;
  const mix = value.mix;
  const basket = value.basket;
  if (!isRecord(mix) || !finite(mix.etl) || !finite(mix.sql) || !finite(mix.ml) || mix.etl + mix.sql + mix.ml <= 0)
    return false;
  if (
    !isRecord(basket) ||
    !finite(basket.etlNodes) ||
    !finite(basket.etlHoursPerDay, 0, 24) ||
    !finite(basket.sqlClusters) ||
    !finite(basket.mlInputTokens)
  )
    return false;
  return (
    (value.usageDbu == null || finite(value.usageDbu)) &&
    (value.usageForecast == null || validUsageForecast(value.usageForecast))
  );
}

export function validUsage(value: unknown): boolean {
  if (
    !isRecord(value) ||
    !oneOf(value.source, ["system-billing", "focus"]) ||
    value.currency !== "USD" ||
    !oneOf(value.observedUnit, ["usd", "dbu"]) ||
    !text(value.costBasis)
  )
    return false;
  if (value.selectedMonth !== null && !isMonth(value.selectedMonth)) return false;
  if (
    !Array.isArray(value.observedMonths) ||
    value.observedMonths.length > 120 ||
    value.observedMonths.some((point) => !isRecord(point) || !isMonth(point.period) || !finite(point.amount, -1e15))
  )
    return false;
  if (
    new Set(value.observedMonths.map((point: Record<string, unknown>) => point.period)).size !==
    value.observedMonths.length
  )
    return false;
  if (!Array.isArray(value.warnings) || value.warnings.some((warning) => typeof warning !== "string")) return false;
  const coverage = value.coverage;
  if (
    !isRecord(coverage) ||
    ![coverage.pricedRows, coverage.unpricedRows, coverage.usedRows, coverage.skippedRows].every(
      (amount) => finite(amount, 0, 1e6) && Number.isInteger(amount),
    )
  )
    return false;
  if (
    value.attribution != null &&
    (!Array.isArray(value.attribution) ||
      value.attribution.some(
        (entry) =>
          !isRecord(entry) ||
          !text(entry.key) ||
          !text(entry.label) ||
          !finite(entry.amount, -1e15) ||
          !finite(entry.quantity, -1e15) ||
          !finite(entry.rows, 0, 1e6) ||
          !Number.isInteger(entry.rows) ||
          !finite(entry.unpricedRows, 0, entry.rows) ||
          !Number.isInteger(entry.unpricedRows),
      ))
  )
    return false;
  return value.forecast == null || validUsageForecast(value.forecast);
}

export function validWorkloadAssumptions(value: Record<string, unknown>): boolean {
  const provenance = value.rateProvenance;
  const imported = isRecord(provenance) && provenance.kind === "imported";
  if (
    provenance != null &&
    (!isRecord(provenance) ||
      !oneOf(provenance.kind, ["catalog", "custom", "imported"]) ||
      provenance.currency !== "USD" ||
      !text(provenance.label))
  )
    return false;
  if (
    isRecord(provenance) &&
    provenance.basis != null &&
    !oneOf(provenance.basis, ["list", "effective-list", "effective", "billed"])
  )
    return false;
  if (value.priceStatus != null && !oneOf(value.priceStatus, ["priced", "approximate", "unpriced", "free"]))
    return false;
  for (const key of ["units", "rateMultiplier", "vmPerDbuHour", "pricePerGb"])
    if (value[key] != null && !finite(value[key], imported && key === "units" ? -1e15 : 0)) return false;
  if (
    value.inputs != null &&
    (!isRecord(value.inputs) ||
      Object.values(value.inputs).some((input) =>
        typeof input === "number" ? !Number.isFinite(input) : typeof input !== "string" || input.length > 512,
      ))
  )
    return false;
  for (const key of ["rateByCloud", "fixedUsdByCloud"]) {
    const rates = value[key];
    if (
      rates != null &&
      (!isRecord(rates) ||
        Object.entries(rates).some(
          ([cloud, rate]) =>
            !oneOf(cloud, ["aws", "azure", "gcp"]) ||
            !finite(rate, imported && key === "fixedUsdByCloud" ? -1e12 : 0, 1e12),
        ))
    )
      return false;
  }
  const placement = value.rateByPlacement;
  if (
    placement != null &&
    (!isRecord(placement) ||
      Object.entries(placement).some(
        ([cloud, rates]) =>
          !oneOf(cloud, ["aws", "azure", "gcp"]) ||
          !isRecord(rates) ||
          Object.entries(rates).some(
            ([tier, rate]) => !oneOf(tier, ["premium", "enterprise"]) || !finite(rate, 0, 1e6),
          ),
      ))
  )
    return false;
  return true;
}
