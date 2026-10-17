import { domainById, productMap, type ProductMapEntry } from "@cayfore/catalog/map";
import { ArrowUpRight, Search, SearchX, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { CoverageBadge, DomainIcon, domainColor } from "./map-presentation";

export function ProductDirectory({
  entries,
  selectedId,
  query,
  domainId,
  kind,
  limit,
  onQuery,
  onDomain,
  onKind,
  onSelect,
  onMore,
  onClear,
}: {
  entries: ProductMapEntry[];
  selectedId?: string;
  query: string;
  domainId: string;
  kind: string;
  limit: number;
  onQuery: (value: string) => void;
  onDomain: (value: string) => void;
  onKind: (value: string) => void;
  onSelect: (id: string) => void;
  onMore: () => void;
  onClear: () => void;
}) {
  return (
    <section aria-label="Product directory" id="product-directory" tabIndex={-1} className="min-w-0">
      <div className="mb-5">
        <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Explore the catalog
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">Find the right building block</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Search current names, older names, or what you want to do.
        </p>
      </div>
      <div className="rounded-2xl border bg-card p-4">
        <label className="field" htmlFor="product-search">
          Search Databricks products
        </label>
        <div className="relative mt-2">
          <Search
            className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground sm:top-2.5"
            aria-hidden="true"
          />
          <Input
            id="product-search"
            type="search"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Product, alias, or use case…"
            className="pr-10 pl-9"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              className="absolute top-0 right-0 flex h-full w-10 items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground"
              onClick={() => onQuery("")}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="field">
            Filter by domain
            <select value={domainId} onChange={(event) => onDomain(event.target.value)}>
              <option value="">All domains</option>
              {productMap.domains.map((domain) => (
                <option key={domain.id} value={domain.id}>
                  {domain.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Filter by entry type
            <select value={kind} onChange={(event) => onKind(event.target.value)}>
              <option value="">All entries</option>
              <option value="catalog-product">Catalog products</option>
              <option value="platform-service">Platform concepts</option>
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <p role="status">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
            {domainId ? " across primary and related domains" : " to explore"}
          </p>
          {(query || domainId || kind) && (
            <Button type="button" variant="ghost" size="sm" onClick={onClear}>
              Clear filters
            </Button>
          )}
        </div>
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
          <ul className="mt-4 grid gap-2.5">
            {entries.slice(0, limit).map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  aria-pressed={selectedId === entry.id}
                  onClick={() => onSelect(entry.id)}
                  className={cn(
                    "group flex w-full min-w-0 items-start gap-3 rounded-2xl border bg-card p-4 text-left transition-colors hover:border-foreground/30",
                    selectedId === entry.id && "border-primary bg-primary/5 ring-1 ring-primary/15",
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
                      <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
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
