import type { UnitCostRow } from "@cayfore/engine/unit-costs";
import { ArrowUpRight, SearchX } from "lucide-react";
import { useRef } from "react";
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
  onSelected,
}: {
  rows: UnitCostRow[];
  selectedId?: string;
  limit: number;
  onSelect: (id: string) => void;
  onMore: () => void;
  onClear: () => void;
  onSelected: () => void;
}) {
  const list = useRef<HTMLUListElement>(null);
  function showMore() {
    onMore();
    requestAnimationFrame(() => list.current?.children[limit]?.querySelector("button")?.focus());
  }
  return (
    <section
      id="rate-directory"
      aria-label="Unit cost directory"
      tabIndex={-1}
      className="min-w-0 rounded-2xl border bg-card p-3 sm:p-4 lg:max-h-[calc(100svh-var(--workspace-header-height)-2rem)] lg:overflow-y-auto lg:overscroll-contain"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b px-1 pb-3">
        <h2 className="text-base font-semibold tracking-tight">Matching rates</h2>
        <p role="status" className="text-xs text-muted-foreground">
          {rows.length.toLocaleString("en-US")} matching {rows.length === 1 ? "row" : "rows"}
        </p>
      </div>
      {selectedId && (
        <Button type="button" variant="outline" size="sm" className="mb-3 w-full lg:hidden" onClick={onSelected}>
          View selected rate
        </Button>
      )}
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
          <ul ref={list} className="grid gap-2">
            {rows.slice(0, limit).map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  aria-pressed={row.id === selectedId}
                  onClick={() => onSelect(row.id)}
                  className={cn(
                    "w-full min-w-0 rounded-xl border border-transparent bg-background/60 p-3 text-left transition-colors hover:border-foreground/20 hover:bg-muted/50",
                    row.id === selectedId && "border-primary bg-primary/5 ring-1 ring-primary/10",
                  )}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{row.productName}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                        {row.componentName}
                      </span>
                    </span>
                    <span className="max-w-[45%] shrink-0 text-right">
                      <span className="block break-words font-mono text-base font-medium tabular-nums">
                        {rowPrice(row)}
                      </span>
                      {row.rateKind !== "unpriced" && (
                        <span className="mt-0.5 block text-xs text-muted-foreground">/ {rowBasis(row)}</span>
                      )}
                    </span>
                  </span>
                  {variantLabel(row) && <span className="mt-2 block text-xs leading-relaxed">{variantLabel(row)}</span>}
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                    {placementLabel(row)}
                  </span>
                  <span className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <EvidenceBadge level={row.evidenceLevel} />
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      {row.id === selectedId ? "Selected" : statusLabels[row.status]}
                      <ArrowUpRight className="size-3.5" aria-hidden="true" />
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {limit < rows.length && (
            <Button type="button" variant="outline" className="mt-4 min-h-11 w-full" onClick={showMore}>
              Show {Math.min(12, rows.length - limit)} more ({Math.min(limit, rows.length)} of{" "}
              {rows.length.toLocaleString("en-US")})
            </Button>
          )}
        </>
      )}
    </section>
  );
}
