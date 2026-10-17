import type { ImportedUsageSummary } from "@cayfore/engine";
import { History } from "lucide-react";
import { money } from "../../format";
import { UsageOwnership } from "./UsageOwnership";

export function ActualUsageDetails({ usage }: { usage: ImportedUsageSummary }) {
  return (
    <details className="group rounded-xl border bg-card p-4 sm:p-5">
      <summary className="cursor-pointer text-sm font-semibold">
        <History className="mr-2 inline size-4 align-text-bottom text-muted-foreground" aria-hidden="true" />
        Imported history and ownership
        <span className="mt-1 block pl-6 text-xs font-normal text-muted-foreground">
          {usage.observedMonths.length} observed {usage.observedMonths.length === 1 ? "month" : "months"} · billing
          snapshot
        </span>
      </summary>
      <p className="mt-4 border-t pt-4 text-xs leading-relaxed text-muted-foreground">
        {usage.sourceLabel ?? "Uploaded billing snapshot"} · {usage.costBasis} · baseline{" "}
        {usage.selectedMonth ?? "undated aggregate"}. This is uploaded history, not a live workspace connection.
      </p>
      <div className="mt-5 grid gap-6 sm:grid-cols-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">
            Observed {usage.observedUnit === "usd" ? "spend (USD)" : "usage (DBU)"}
          </h3>
          <div
            className="mt-3 max-h-80 overflow-auto rounded-lg border"
            role="region"
            tabIndex={0}
            aria-label="Imported monthly history"
          >
            <table className="w-full text-sm">
              <caption className="sr-only">
                Observed {usage.observedUnit === "usd" ? "spend (USD)" : "usage (DBU)"}
              </caption>
              <thead className="sticky top-0 bg-muted">
                <tr className="text-left text-xs text-muted-foreground">
                  <th scope="col" className="px-3 py-2.5">
                    Month
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {usage.observedMonths.map((point) => (
                  <tr
                    key={point.period}
                    className={`border-t ${point.period === usage.selectedMonth ? "bg-primary/5" : ""}`}
                  >
                    <th scope="row" className="px-3 py-2.5 text-left font-normal">
                      {point.period}
                      {point.period === usage.selectedMonth && (
                        <span className="ml-2 text-[10px] font-medium text-muted-foreground">Baseline</span>
                      )}
                    </th>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {usage.observedUnit === "usd" ? money(point.amount, 2) : point.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {!usage.observedMonths.length && (
                  <tr>
                    <td colSpan={2} className="px-3 py-5 text-center text-xs text-muted-foreground">
                      No dated history was included in this snapshot.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">Ownership of the selected baseline</h3>
          <UsageOwnership rows={usage.attribution ?? []} />
        </div>
      </div>
      {usage.warnings.length > 0 && (
        <ul className="mt-5 grid list-disc gap-1.5 rounded-lg bg-muted/50 py-3 pr-3 pl-7 text-xs leading-relaxed text-muted-foreground">
          {usage.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
    </details>
  );
}
