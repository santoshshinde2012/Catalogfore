import { roundMoney } from "../money.js";
import {
  attributeUsageRecords,
  dbuFromRecords,
  historyFromRecords,
  productsFromRecords,
  usageCoverage,
} from "./aggregate.js";
import { parseUsageRecords } from "./parse.js";
import { defaultUsageAsOf, selectUsagePeriods } from "./periods.js";
import type { UsageImportOptions, UsageImportPreview, UsageParseResult } from "./types.js";

export function previewUsageImport(text: string, options: UsageImportOptions = {}): UsageImportPreview {
  return previewUsageRecords(parseUsageRecords(text, options), options);
}

/** Re-select a month without reparsing a potentially large upload. */
export function previewUsageRecords(parsed: UsageParseResult, options: UsageImportOptions = {}): UsageImportPreview {
  const asOf = options.asOf ?? defaultUsageAsOf;
  const periods = selectUsagePeriods(parsed.records, { ...options, asOf });
  const coverage = usageCoverage(periods.selectedRecords, parsed.skippedRows);
  const history = historyFromRecords(periods.historicalRecords);
  const products = productsFromRecords(periods.selectedRecords);
  const warnings = [...parsed.warnings, ...periods.warnings, ...history.warnings];
  if (coverage.unpricedRows)
    warnings.push(
      `${coverage.unpricedRows} selected rows have no exported price. Known DBU SKUs use catalog estimates; other quantities remain explicitly unpriced.`,
    );
  if (products.unmapped.length)
    warnings.push(
      `${products.unmapped.length} SKU names are not in the catalog map. Their exported monetary costs are retained.`,
    );
  const bases = [...new Set(periods.selectedRecords.flatMap((record) => (record.cost ? [record.cost.basis] : [])))];
  return {
    source: parsed.source,
    asOf,
    parseWarnings: parsed.warnings,
    records: parsed.records,
    ...periods,
    ...products,
    ...coverage,
    ...dbuFromRecords(periods.selectedRecords),
    history,
    monthlyDollars: coverage.pricedRows
      ? roundMoney(periods.selectedRecords.reduce((sum, record) => sum + (record.cost?.amount ?? 0), 0))
      : null,
    costBasis: bases.length ? bases.join(" + ") : "catalog estimate",
    attribution: attributeUsageRecords(periods.selectedRecords),
    warnings: [...new Set(warnings)],
  };
}

export function selectUsageMonth(preview: UsageImportPreview, month: string): UsageImportPreview {
  return {
    ...previewUsageRecords(
      {
        source: preview.source,
        records: preview.records,
        skippedRows: preview.skippedRows,
        warnings: preview.parseWarnings,
      },
      { month, asOf: preview.asOf },
    ),
    ...(preview.sourceLabel ? { sourceLabel: preview.sourceLabel } : {}),
  };
}
