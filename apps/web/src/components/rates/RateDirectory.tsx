import type { UnitCostRow } from "@cayfore/engine/unit-costs";
import { ArrowUpRight, SearchX } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { EvidenceBadge } from "./RateEvidence";
import { placementLabel, rowBasis, rowPrice, statusLabels, variantLabel } from "./rate-presentation";

export function RateDirectory({
  rows,
  selectedId,
  limit,
  onSelect,
  onMore,
  onClear,
}: {
  rows: UnitCostRow[];
  selectedId?: string;
  limit: number;
  onSelect: (id: string) => void;
  onMore: () => void;
  onClear: () => void;
}) {
  return (
    <section id="rate-directory" aria-label="Unit cost directory" tabIndex={-1} className="min-w-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold tracking-tight">Follow the cost, one unit at a time</h2>
        <p role="status" className="text-xs text-muted-foreground">
          {rows.length.toLocaleString("en-US")} matching {rows.length === 1 ? "row" : "rows"}
        </p>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card p-8 text-center">
          <SearchX className="mx-auto size-7 text-muted-foreground" aria-hidden="true" />
          <h3 className="mt-3 font-semibold">No matching unit costs</h3>
          <p className="mt-2 text-sm text-muted-foreground">Try another placement or reset your filters.</p>
          <Button type="button" variant="outline" className="mt-4" onClick={onClear}>
            Show all rates
          </Button>
        </div>
      ) : (
        <>
          <ul className="grid gap-3">
            {rows.slice(0, limit).map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  aria-pressed={row.id === selectedId}
                  onClick={() => onSelect(row.id)}
                  className={cn(
                    "w-full min-w-0 rounded-2xl border bg-card p-4 text-left transition-colors hover:border-foreground/30",
                    row.id === selectedId && "border-primary bg-primary/5 ring-1 ring-primary/15",
                  )}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{row.productName}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                        {row.componentName}
                      </span>
                      {variantLabel(row) && (
                        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                          {variantLabel(row)}
                        </span>
                      )}
                    </span>
                    <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </span>
                  <span className="mt-3 block break-words font-mono text-lg font-medium tabular-nums">
                    {rowPrice(row)}
                    {row.rateKind !== "unpriced" && (
                      <span className="ml-1 font-sans text-xs font-normal text-muted-foreground">
                        / {rowBasis(row)}
                      </span>
                    )}
                  </span>
                  <span className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-muted-foreground">
                    <span>{placementLabel(row)}</span>
                    <span
                      className={cn(
                        "rounded-md border px-1.5 py-0.5",
                        (row.status === "unpriced" || row.status === "conditional") && "border-dashed",
                      )}
                    >
                      {statusLabels[row.status]}
                    </span>
                  </span>
                  <span className="mt-3 block">
                    <EvidenceBadge level={row.evidenceLevel} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {limit < rows.length && (
            <Button type="button" variant="outline" className="mt-4 min-h-11 w-full" onClick={onMore}>
              Show 12 more ({Math.min(limit, rows.length)} of {rows.length.toLocaleString("en-US")})
            </Button>
          )}
        </>
      )}
    </section>
  );
}
