import { buildUnitCostComparison, type UnitCostRow } from "@cayfore/engine/unit-costs";
import { ChartNoAxesColumnIncreasing, Check, MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { evidenceLabels, rowBasis, rowPrice, variantLabel } from "./rate-presentation";

export function RateComparison({
  rows,
  selected,
  onSelect,
}: {
  rows: UnitCostRow[];
  selected: UnitCostRow;
  onSelect: (row: UnitCostRow) => void;
}) {
  const comparison = useMemo(() => buildUnitCostComparison(rows, selected), [rows, selected]);
  const [expanded, setExpanded] = useState(false);
  const visible = comparison.points.filter(
    (point, index) => expanded || index < 6 || index === comparison.points.length - 1 || point.isSelected,
  );
  return (
    <section aria-label="Regional unit cost comparison" className="min-w-0 rounded-2xl border bg-card p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <ChartNoAxesColumnIncreasing className="size-5 shrink-0 text-link" aria-hidden="true" />
            Compare the same unit
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            One component across regions. Each bar uses the same product, cloud, edition, billing unit, and variant.
          </p>
        </div>
        <span className="rounded-lg border bg-muted/30 px-2.5 py-1.5 text-xs font-medium">
          {selected.rateKind === "money" ? `USD / ${rowBasis(selected)}` : "No monetary comparison"}
        </span>
      </header>
      <div className="mt-4 rounded-xl border bg-muted/20 p-3 text-xs leading-relaxed">
        <p className="font-semibold">
          {selected.productName} · {selected.componentName}
        </p>
        <p className="mt-1 text-muted-foreground">
          {[selected.cloud?.toUpperCase(), selected.tier, variantLabel(selected)].filter(Boolean).join(" · ")}
        </p>
        <p className="mt-1 text-muted-foreground">
          This comparison expands beyond the region filter. Select a region to inspect its source; your forecast stays
          unchanged.
        </p>
      </div>
      {comparison.state === "available" ? (
        <>
          <div className="mt-5 flex justify-between gap-3 text-xs text-muted-foreground" aria-hidden="true">
            <span>$0</span>
            <span>Bars start at zero · {rowPrice(comparison.points.at(-1)!.row)} maximum</span>
          </div>
          {visible.length < comparison.points.length && (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Showing the lowest quotes, the highest quote, and your selected region. Expand to see every comparable
              region.
            </p>
          )}
          {comparison.points.every((point) => point.barPercent === 100) && (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              This snapshot has the same unit price in every comparable region.
            </p>
          )}
          <ol className="mt-2 grid gap-2">
            {visible.map(({ row, barPercent, isSelected }) => (
              <li key={row.id}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelect(row)}
                  className={cn(
                    "group w-full min-w-0 rounded-xl border px-3 py-2.5 text-left transition-colors hover:border-foreground/30",
                    isSelected ? "border-primary bg-primary/5" : "bg-background",
                  )}
                >
                  <span className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                    <span className="flex min-w-0 items-start gap-2 text-xs font-medium">
                      {isSelected ? (
                        <Check className="mt-0.5 size-3.5 shrink-0 text-link" aria-hidden="true" />
                      ) : (
                        <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                      )}
                      <span className="break-words">{row.regionLabel ?? row.region ?? "Not region-specific"}</span>
                    </span>
                    <span className="font-mono text-sm font-medium tabular-nums">
                      {rowPrice(row)}
                      <span className="sr-only"> per {rowBasis(row)}</span>
                    </span>
                  </span>
                  <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                    <span
                      className={cn(
                        "block h-full rounded-full",
                        isSelected ? "bg-primary" : "bg-[var(--chart-actual)]",
                      )}
                      style={{ width: `${barPercent}%` }}
                    />
                  </span>
                  <span className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">{evidenceLabels[row.evidenceLevel]}</span>
                    <span className="text-xs text-muted-foreground">
                      {isSelected ? "Selected region" : "Inspect source →"}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
          {visible.length < comparison.points.length && (
            <Button type="button" variant="outline" className="mt-3 min-h-11 w-full" onClick={() => setExpanded(true)}>
              Show all {comparison.points.length} comparable regions
            </Button>
          )}
          {expanded && comparison.points.length > 7 && (
            <Button type="button" variant="ghost" className="mt-3 min-h-11 w-full" onClick={() => setExpanded(false)}>
              Show fewer regions
            </Button>
          )}
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {comparison.points.length} comparable priced rows.{" "}
            {comparison.unpricedRows.length > 0 &&
              `${comparison.unpricedRows.length} additional regional rows have no resolved price and are excluded from the bars. `}
            Evidence labels distinguish published rates from estimates. Lower unit cost does not establish availability
            or the total cost of a workload.
          </p>
        </>
      ) : (
        <p
          className="mt-4 rounded-xl border border-dashed p-4 text-sm leading-relaxed text-muted-foreground"
          role="status"
        >
          {comparison.reason}
        </p>
      )}
    </section>
  );
}
