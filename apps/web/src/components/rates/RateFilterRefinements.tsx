import type { UnitCostCatalog, UnitCostFilters, UnitCostRow } from "@cayfore/engine/unit-costs";
import { SlidersHorizontal } from "lucide-react";
import { evidenceLabels, statusLabels } from "./rate-presentation";

export function RateFilterRefinements({
  catalog,
  filters,
  onChange,
}: {
  catalog: UnitCostCatalog;
  filters: UnitCostFilters;
  onChange: (next: UnitCostFilters) => void;
}) {
  const domains = [
    ...new Map(catalog.products.map((product) => [product.domainId, product.domainName])).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1]));
  const active = [filters.domainId, filters.status, filters.evidenceLevel].filter(Boolean).length;
  function set(key: keyof UnitCostFilters, value: string) {
    onChange({ ...filters, [key]: value || undefined });
  }
  return (
    <details className="group min-w-0 flex-1" data-testid="rate-refinements">
      <summary className="flex min-h-10 w-fit cursor-pointer list-none items-center gap-2 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground [&::-webkit-details-marker]:hidden">
        <SlidersHorizontal className="size-3.5" aria-hidden="true" />
        <span>More filters</span>
        {active > 0 && <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-link">{active} active</span>}
        <span className="text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true">
          ⌄
        </span>
      </summary>
      <div className="mt-2 grid gap-3 border-t pt-3 sm:grid-cols-3">
        <label className="field text-xs">
          Domain
          <select value={filters.domainId ?? ""} onChange={(event) => set("domainId", event.target.value)}>
            <option value="">All domains</option>
            {domains.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="field text-xs">
          Pricing coverage
          <select value={filters.status ?? ""} onChange={(event) => set("status", event.target.value)}>
            <option value="">All coverage</option>
            {Object.entries(statusLabels).map(([id, name]) => (
              <option key={id} value={id as UnitCostRow["status"]}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="field text-xs">
          Evidence basis
          <select value={filters.evidenceLevel ?? ""} onChange={(event) => set("evidenceLevel", event.target.value)}>
            <option value="">All evidence</option>
            {Object.entries(evidenceLabels).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </details>
  );
}
