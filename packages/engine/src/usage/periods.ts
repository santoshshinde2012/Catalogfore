import { UploadError } from "../untrusted.js";
import { skuCatalog } from "../catalog.js";
import { dateField } from "./fields.js";
import type { UsageImportOptions, UsageRecord } from "./types.js";

export interface UsagePeriods {
  availableMonths: string[];
  completeMonths: string[];
  selectedMonth: string | null;
  selectedRecords: UsageRecord[];
  historicalRecords: UsageRecord[];
  warnings: string[];
}

/** Application boundaries inject today's date; domain-only calls use a reproducible catalog cutoff. */
export const defaultUsageAsOf = skuCatalog.verifiedOn;

/** Calendar closure is independent of how frequently a customer emits usage. */
export function selectUsagePeriods(records: readonly UsageRecord[], options: UsageImportOptions = {}): UsagePeriods {
  const asOf = options.asOf ?? defaultUsageAsOf;
  if (!dateField(asOf) || asOf.length !== 10) throw new UploadError("asOf must be a valid YYYY-MM-DD date.");
  if (options.month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(options.month))
    throw new UploadError("Select a month in YYYY-MM format.");
  const cutoffMonth = asOf.slice(0, 7);
  const availableMonths = [
    ...new Set(records.flatMap((record) => (record.date ? [record.date.slice(0, 7)] : []))),
  ].sort();
  const knownRecords = records.filter((record) => !record.ingestionDate || record.ingestionDate <= asOf);
  const completeMonths = [
    ...new Set(
      knownRecords.flatMap((record) =>
        record.date && record.date.slice(0, 7) < cutoffMonth ? [record.date.slice(0, 7)] : [],
      ),
    ),
  ].sort();
  const selectedMonth = options.month ?? completeMonths.at(-1) ?? null;
  const hasDatedRows = availableMonths.length > 0;
  const warnings: string[] = [];
  if (knownRecords.length < records.length)
    warnings.push(
      `${records.length - knownRecords.length} records ingested after ${asOf} were excluded from this historical observation.`,
    );
  const partial = availableMonths.filter((month) => month >= cutoffMonth);
  if (partial.length)
    warnings.push(
      `${partial.join(", ")} is not a complete observed month and is excluded from the default baseline and trend.`,
    );
  if (options.month && !availableMonths.includes(options.month))
    warnings.push(`No usage rows were found for ${options.month}.`);
  if (options.month && options.month >= cutoffMonth)
    warnings.push(
      `${options.month} was explicitly selected as a partial month. Its amounts are not extrapolated to a full month.`,
    );
  if (hasDatedRows && records.some((record) => !record.date))
    warnings.push("Undated rows were excluded from the dated monthly baseline and history.");
  if (hasDatedRows && !selectedMonth)
    warnings.push(
      "No complete calendar month is available. Select a partial month explicitly to inspect its observed costs.",
    );
  const selectedRecords = knownRecords.filter((record) =>
    selectedMonth ? record.date?.slice(0, 7) === selectedMonth && record.date <= asOf : !hasDatedRows && !record.date,
  );
  const historicalRecords = knownRecords.filter(
    (record) =>
      record.date &&
      record.date.slice(0, 7) < cutoffMonth &&
      (!selectedMonth || record.date.slice(0, 7) <= selectedMonth),
  );
  return { availableMonths, completeMonths, selectedMonth, selectedRecords, historicalRecords, warnings };
}
