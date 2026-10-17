import { matchBilling } from "./billing-skus.js";
import type { UsageImport } from "./types.js";
import { previewUsageImport } from "./usage/preview.js";
import type { ProductUsageImport, UsageHistory, UsageImportOptions } from "./usage/types.js";

export { parseCsv } from "./csv.js";
export * from "./usage/types.js";
export { parseUsageRecords, usageSources, type UsageSource } from "./usage/parse.js";
export { previewUsageImport, previewUsageRecords, selectUsageMonth } from "./usage/preview.js";
export { selectUsagePeriods } from "./usage/periods.js";
export { attributeUsageRecords, historyFromRecords, dbuFromRecords, productsFromRecords } from "./usage/aggregate.js";
export { portfolioFromUsage } from "./usage/portfolio.js";

export function mapSkuName(skuName: string): string {
  return matchBilling(skuName).engineSku;
}

export function usageHistory(text: string, options: UsageImportOptions = {}): UsageHistory {
  const preview = previewUsageImport(text, options);
  return { ...preview.history, warnings: preview.warnings };
}

export function importUsageCsv(text: string, monthOrOptions?: string | UsageImportOptions): UsageImport {
  const options = typeof monthOrOptions === "string" ? { month: monthOrOptions } : monthOrOptions;
  const preview = previewUsageImport(text, options);
  const usedRows = preview.selectedRecords.filter((record) => record.unit === "DBU").length;
  const skippedRows = preview.skippedRows + preview.usedRows - usedRows;
  const warnings = [...preview.warnings];
  if (skippedRows) warnings.push(`${skippedRows} non-DBU or unreadable rows were skipped in the DBU summary.`);
  return { dbu: preview.dbu, bySku: preview.bySku, usedRows, skippedRows, warnings };
}

export function importUsageProducts(text: string, options: UsageImportOptions = {}): ProductUsageImport {
  const { products, unmapped, warnings, selectedMonth } = previewUsageImport(text, options);
  return { products, unmapped, warnings, selectedMonth };
}

export function scaleForActuals(estimatedDbu: number, actualDbu: number): number {
  return estimatedDbu <= 0 || actualDbu < 0 ? 1 : actualDbu / estimatedDbu;
}
