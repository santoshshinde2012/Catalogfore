import { productMap } from "@cayfore/catalog/map";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export function ProductFilters({
  query,
  domainId,
  kind,
  hasFilters,
  onQuery,
  onDomain,
  onKind,
  onClear,
}: {
  query: string;
  domainId: string;
  kind: string;
  hasFilters: boolean;
  onQuery: (value: string) => void;
  onDomain: (value: string) => void;
  onKind: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <section aria-label="Find products and services" className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="grid grid-cols-2 items-end gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="col-span-2 min-w-0 md:col-span-1">
          <label className="field" htmlFor="product-search">
            Search Databricks products
          </label>
          <div className="relative mt-2">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="product-search"
              type="search"
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              placeholder="Product, alias, or use case…"
              className="pr-10 pl-9"
              aria-controls="product-directory"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                className="absolute top-0 right-0 flex h-full w-11 items-center justify-center rounded-r-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => onQuery("")}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
        <label className="field min-w-0">
          Filter by domain
          <select value={domainId} onChange={(event) => onDomain(event.target.value)} aria-controls="product-directory">
            <option value="">All domains</option>
            {productMap.domains.map((domain) => (
              <option key={domain.id} value={domain.id}>
                {domain.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field min-w-0">
          Filter by entry type
          <select value={kind} onChange={(event) => onKind(event.target.value)} aria-controls="product-directory">
            <option value="">All entries</option>
            <option value="catalog-product">Catalog products</option>
            <option value="platform-service">Platform concepts</option>
          </select>
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <p className="flex items-center gap-2">
          <SlidersHorizontal className="size-3.5 shrink-0" aria-hidden="true" />
          Search current names, older aliases, or a task.
        </p>
        {hasFilters && (
          <Button type="button" variant="ghost" size="sm" className="-mr-2" onClick={onClear}>
            Clear filters
          </Button>
        )}
      </div>
    </section>
  );
}
