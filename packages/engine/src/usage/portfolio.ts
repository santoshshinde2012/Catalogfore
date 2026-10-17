import { blankPortfolio } from "../portfolio.js";
import { listRegions } from "../catalog.js";
import { fitUsageForecast } from "../forecast/series.js";
import { shiftMonth } from "../forecast/calendar.js";
import { UploadError } from "../untrusted.js";
import type { Cloud, Portfolio } from "../types.js";
import { previewUsageImport } from "./preview.js";
import type { UsageImportOptions, UsageImportPreview } from "./types.js";
import { workloadsFromUsagePreview } from "./workloads.js";

export interface UsagePortfolioOptions extends UsageImportOptions {
  base?: Portfolio;
  mode?: "replace" | "append";
  cloud?: Cloud;
}

/** Exported monetary costs remain the baseline; no synthetic VM spend is added. */
export function portfolioFromUsage(
  input: string | UsageImportPreview,
  options: UsagePortfolioOptions = {},
): {
  portfolio: Portfolio;
  preview: UsageImportPreview;
  warnings: string[];
} {
  const preview = typeof input === "string" ? previewUsageImport(input, options) : input;
  if (!preview.usedRows) throw new UploadError("Select a month with usage rows before applying the import.");
  const loaded = workloadsFromUsagePreview(preview);
  const cloud =
    options.cloud ?? preview.selectedRecords.find((record) => record.cloud)?.cloud ?? options.base?.cloud ?? "aws";
  const base = options.base ?? blankPortfolio(cloud);
  const append = options.mode === "append";
  const sourceFingerprint = usageFingerprint(preview);
  const sourcePeriod = `${preview.source}:${preview.selectedMonth ?? "undated"}`;
  if (
    append &&
    (base.usage?.sourceFingerprint === sourceFingerprint ||
      base.workloads.some(
        (workload) =>
          workload.inputs?.usageSourceFingerprint === sourceFingerprint ||
          workload.inputs?.usageSourcePeriod === sourcePeriod,
      ))
  ) {
    throw new UploadError(
      "This source and usage month is already in the portfolio. Replace it to reconcile overlapping exports without adding the same costs twice.",
    );
  }
  const importedWorkloads = loaded.workloads.map((workload) => ({
    ...workload,
    inputs: { ...workload.inputs, usageSourceFingerprint: sourceFingerprint, usageSourcePeriod: sourcePeriod },
  }));
  const fitted =
    preview.history.months.at(-1)?.period === preview.selectedMonth &&
    (preview.history.coverage.unpricedRows === 0 || preview.history.unit === "dbu")
      ? fitUsageForecast(preview.history)
      : null;
  const forecast = {
    ...base.forecast,
    ...(!append && preview.selectedMonth ? { startMonth: shiftMonth(preview.selectedMonth, 1) } : {}),
    ...(fitted && !append
      ? { annualGrowth: Math.max(-0.99, Math.min(10, Math.pow(1 + fitted.monthlyGrowth, 12) - 1)) }
      : {}),
  };
  const { simple: _simple, events: existingEvents, ...detailedBase } = base;
  const warnings = [...loaded.warnings];
  if (fitted && preview.history.unit === "dbu")
    warnings.push(
      "The fitted DBU trend assumes stable unit pricing and workload composition when applied to future dollars.",
    );
  if (append)
    warnings.push(
      "Observed history describes this imported source. It does not include other workloads already in the portfolio.",
    );
  if (append && base.usage?.selectedMonth && base.usage.selectedMonth !== preview.selectedMonth)
    warnings.push(
      `The existing baseline uses ${base.usage.selectedMonth}; this addition uses ${preview.selectedMonth ?? "an undated aggregate"}. Review their combined monthly scope.`,
    );
  if (!append && existingEvents?.length)
    warnings.push(
      "Existing dated planning events were cleared when the usage baseline was replaced. Add any changes that still apply to this new baseline.",
    );
  const portfolio: Portfolio = {
    ...detailedBase,
    ...(append
      ? {}
      : {
          cloud,
          region: listRegions(cloud).find((region) => region.id === base.region)?.id ?? listRegions(cloud)[0].id,
        }),
    name: options.base?.name ?? `Usage forecast${preview.selectedMonth ? ` · ${preview.selectedMonth}` : ""}`,
    workloads: append ? [...base.workloads, ...importedWorkloads] : importedWorkloads,
    usageScale: 1,
    usageCalibrated: true,
    forecast,
    ...(append && existingEvents ? { events: existingEvents } : {}),
    ...(append ? {} : { commitment: { dbuDiscount: 0, cloudDiscount: 0 }, addon: "none" as const }),
    usage: {
      source: preview.source,
      selectedMonth: preview.selectedMonth,
      costBasis: preview.costBasis,
      currency: "USD",
      ...(preview.sourceLabel ? { sourceLabel: preview.sourceLabel } : {}),
      sourceFingerprint,
      attribution: preview.attribution,
      ...(fitted && !append ? { forecast: fitted } : {}),
      observedMonths: preview.history.months,
      observedUnit: preview.history.unit,
      coverage: {
        usedRows: preview.usedRows,
        skippedRows: preview.skippedRows,
        pricedRows: preview.pricedRows,
        unpricedRows: preview.unpricedRows,
      },
      warnings,
    },
  };
  return { portfolio, preview, warnings };
}

/** Deterministic accidental-duplicate guard; not a cryptographic authenticity claim. */
function usageFingerprint(preview: UsageImportPreview): string {
  const rows = preview.selectedRecords.map((record) => JSON.stringify(record)).sort();
  let first = 2166136261;
  let second = 5381;
  for (const row of rows)
    for (let index = 0; index < row.length; index += 1) {
      first = Math.imul(first ^ row.charCodeAt(index), 16777619);
      second = Math.imul(second, 33) ^ row.charCodeAt(index);
    }
  return `${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0).toString(16).padStart(8, "0")}`;
}
