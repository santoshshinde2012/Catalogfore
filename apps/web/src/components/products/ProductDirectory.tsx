import { domainById, type ProductMapEntry } from "@cayfore/catalog/map";
import { ArrowUpRight, Check, SearchX } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { CoverageBadge, DomainIcon, domainColor } from "./map-presentation";

export function ProductDirectory({
  entries,
  selectedId,
  limit,
  hasFilters,
  onSelect,
  onMore,
  onClear,
}: {
  entries: ProductMapEntry[];
  selectedId?: string;
  limit: number;
  hasFilters: boolean;
  onSelect: (id: string) => void;
  onMore: () => void;
  onClear: () => void;
}) {
  return (
    <section aria-label="Product directory" id="product-directory" tabIndex={-1} className="min-w-0">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Products and services</h2>
          <p className="mt-1 text-xs text-muted-foreground" role="status">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
            {hasFilters ? " match your filters" : " to explore"}
          </p>
        </div>
        <span className="rounded-lg border bg-card px-2.5 py-1 text-[11px] tabular-nums text-muted-foreground">
          {Math.min(limit, entries.length)} shown
        </span>
      </div>
      {entries.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed bg-card px-5 py-12 text-center">
          <SearchX className="mx-auto size-7 text-muted-foreground" aria-hidden="true" />
          <h3 className="mt-3 text-sm font-semibold">No matching entries</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Try a broader name, an older product name, or clear a filter.
          </p>
          <Button type="button" variant="outline" className="mt-4" onClick={onClear}>
            Reset search
          </Button>
        </div>
      ) : (
        <>
          <ul className="grid gap-2.5 lg:max-h-[min(44rem,calc(100svh-var(--workspace-header-height)-8rem))] lg:overflow-y-auto lg:overscroll-contain lg:pr-2">
            {entries.slice(0, limit).map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  aria-pressed={selectedId === entry.id}
                  onClick={() => onSelect(entry.id)}
                  className={cn(
                    "group relative flex min-h-24 w-full min-w-0 items-start gap-3 rounded-xl border bg-card p-3.5 text-left transition-colors hover:border-foreground/30 hover:bg-muted/30",
                    selectedId === entry.id &&
                      "border-primary bg-primary/5 shadow-sm ring-1 ring-inset ring-primary/10",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-xl border",
                      domainColor(entry.domainId),
                    )}
                  >
                    <DomainIcon id={entry.domainId} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold">{entry.name}</span>
                      {selectedId === entry.id ? (
                        <Check className="mt-0.5 size-3.5 shrink-0 text-link" aria-hidden="true" />
                      ) : (
                        <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                      )}
                    </span>
                    <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">
                      {entry.summary}
                    </span>
                    <span className="mt-2 flex flex-wrap items-center gap-2">
                      <CoverageBadge entry={entry} />
                      <span className="text-[10px] text-muted-foreground">{domainById(entry.domainId)?.name}</span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {entries.length > limit && (
            <Button type="button" variant="outline" className="mt-4 min-h-11 w-full" onClick={onMore}>
              Show {Math.min(12, entries.length - limit)} more entries
              <span className="text-muted-foreground">({entries.length - limit} remaining)</span>
            </Button>
          )}
        </>
      )}
    </section>
  );
}
