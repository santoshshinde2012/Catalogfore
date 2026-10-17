import type { UsageImportPreview } from "@cayfore/engine";
import { CircleAlert } from "lucide-react";
import { money } from "../../format";

export function UsageImportSummary({ preview }: { preview: UsageImportPreview }) {
  const partial = preview.selectedMonth && !preview.completeMonths.includes(preview.selectedMonth);
  return (
    <div className="grid gap-4">
      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">
            {preview.source === "focus" ? "FOCUS billing data" : "Databricks billing export"}
          </p>
          <span className="rounded-full border bg-muted px-2 py-0.5 text-[11px] font-medium">
            {partial ? "Partial month" : preview.selectedMonth ? "Closed calendar month" : "No month selected"}
          </span>
        </div>
        {preview.sourceLabel && <p className="mt-2 text-xs text-muted-foreground">{preview.sourceLabel}</p>}
        <p className="mt-4 text-xs text-muted-foreground">Known exported cost · USD</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
          {preview.monthlyDollars == null ? "Unavailable" : money(preview.monthlyDollars, 2)}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {preview.monthlyDollars == null ? "No exported prices were found. " : "Excludes rows without a price. "}
          Cost basis: {preview.costBasis.replaceAll("-", " ")} · cutoff {preview.asOf}.
        </p>
        <dl className="mt-4 grid grid-cols-3 gap-3 border-t pt-4">
          <Stat label="Rows selected" value={preview.usedRows} />
          <Stat label="Rows with prices" value={preview.pricedRows} />
          <Stat label="Without prices" value={preview.unpricedRows} />
        </dl>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {partial && "This month is incomplete and will not be scaled to a full month. "}
        Known DBU SKUs can use catalog estimates when exported prices are missing. Unsupported quantities remain
        unresolved. A closed month does not guarantee that every billing record is in this file.
      </p>
      {preview.warnings.length > 0 && (
        <details className="rounded-lg border bg-muted/40 p-3" open={preview.unpricedRows > 0}>
          <summary className="cursor-pointer text-sm font-medium">
            <CircleAlert className="mr-2 inline size-4 align-text-bottom text-muted-foreground" aria-hidden="true" />
            {preview.warnings.length} import {preview.warnings.length === 1 ? "note" : "notes"} to review
          </summary>
          <ul className="mt-3 grid list-disc gap-2 pl-5 text-xs leading-relaxed text-muted-foreground">
            {preview.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[11px] leading-snug text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums">{value.toLocaleString()}</dd>
    </div>
  );
}
