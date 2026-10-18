import { buildUnitCostComparison, type UnitCostRow } from "@cayfore/engine/unit-costs";
import { ChartNoAxesColumnIncreasing, ChevronsDown, ChevronsUp, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../ui/button";
import { RateComparisonRow } from "./RateComparisonRow";
import { regionalQuoteDelta, rowBasis, rowPrice, unitMoney, variantLabel } from "./rate-presentation";

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
  const [query, setQuery] = useState("");
  const [trackedId, setTrackedId] = useState(selected.id);
  if (trackedId !== selected.id) {
    setTrackedId(selected.id);
    setQuery("");
  }
  const baseline = selected.unitPriceUsd;
  const queryActive = query.trim().length > 0;
  const matched = comparison.points.filter((point) => {
    if (!queryActive) return true;
    const label = `${point.row.regionLabel ?? ""} ${point.row.region ?? ""}`.toLowerCase();
    return label.includes(query.trim().toLowerCase());
  });
  const collapsed = !expanded && !queryActive && comparison.points.length > 7;
  const visible = collapsed
    ? matched.filter((point, index) => index < 6 || index === matched.length - 1 || point.isSelected)
    : matched;
  const prices = comparison.points
    .map((point) => point.row.unitPriceUsd)
    .filter((price): price is number => price !== null);
  const lowest = prices.length ? Math.min(...prices) : null;
  const highest = prices.length ? Math.max(...prices) : null;
  const uniform = lowest !== null && highest !== null && highest - lowest <= 1e-9;
  return (
    <section aria-label="Regional unit cost comparison" className="min-w-0 rounded-2xl border bg-card p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <ChartNoAxesColumnIncreasing className="size-5 shrink-0 text-link" aria-hidden="true" />
            Compare the same unit
          </h2>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground">
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
      {comparison.state === "available" && lowest !== null && highest !== null ? (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              [
                ["Regions", comparison.points.length.toLocaleString("en-US")],
                ["Lowest", unitMoney(lowest)],
                ["Highest", unitMoney(highest)],
                ["Spread", uniform ? "None" : unitMoney(highest - lowest)],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-xl border bg-background px-3 py-2.5">
                <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
                <dd className="mt-1 font-mono text-sm font-medium tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          {uniform && (
            <p className="mt-3 rounded-xl border border-dashed bg-muted/20 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              This snapshot has the same unit price in every comparable region. The bars match because none of these
              quotes is higher than the others.
            </p>
          )}
          {collapsed && (
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Showing the lowest quotes, the highest quote, and your selected region. Expand to see every comparable
              region.
            </p>
          )}
          {comparison.points.length > 8 && (
            <div className="relative mt-3">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="Filter regions"
                placeholder="Filter regions"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-11 w-full rounded-lg border border-input bg-background pr-3 pl-9 text-sm outline-none focus-visible:border-ring sm:h-10"
              />
            </div>
          )}
          <div className="mt-4 flex justify-between gap-3 text-xs text-muted-foreground" aria-hidden="true">
            <span>$0</span>
            <span>Bars start at zero · {rowPrice(comparison.points.at(-1)!.row)} maximum</span>
          </div>
          {visible.length === 0 && (
            <p className="mt-3 rounded-xl border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
              No regions match that filter.
            </p>
          )}
          <ol className="mt-2 grid gap-2">
            {visible.map((point) => (
              <RateComparisonRow
                key={point.row.id}
                point={point}
                delta={baseline === null ? "" : regionalQuoteDelta(baseline, point.row.unitPriceUsd ?? baseline)}
                onSelect={onSelect}
              />
            ))}
          </ol>
          {collapsed && (
            <Button type="button" variant="outline" className="mt-3 min-h-11 w-full" onClick={() => setExpanded(true)}>
              <ChevronsDown aria-hidden="true" />
              Show all {comparison.points.length} comparable regions
            </Button>
          )}
          {expanded && !queryActive && comparison.points.length > 7 && (
            <Button type="button" variant="ghost" className="mt-3 min-h-11 w-full" onClick={() => setExpanded(false)}>
              <ChevronsUp aria-hidden="true" />
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
