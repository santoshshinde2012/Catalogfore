import type { UnitCostCatalog, UnitCostFilters } from "@cayfore/engine/unit-costs";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { OptionSelect } from "../ui/option-select";
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
    { value: "", label: "All domains" },
    ...[...new Map(catalog.products.map((product) => [product.domainId, product.domainName])).entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([id, name]) => ({ value: id, label: name })),
  ];
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
        <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="mt-2 grid gap-3 border-t pt-3 sm:grid-cols-3">
        <OptionSelect
          label="Domain"
          value={filters.domainId ?? ""}
          onValueChange={(domainId) => set("domainId", domainId)}
          options={domains}
        />
        <OptionSelect
          label="Pricing coverage"
          value={filters.status ?? ""}
          onValueChange={(status) => set("status", status)}
          options={[
            { value: "", label: "All coverage" },
            ...Object.entries(statusLabels).map(([id, name]) => ({ value: id, label: name })),
          ]}
        />
        <OptionSelect
          label="Evidence basis"
          value={filters.evidenceLevel ?? ""}
          onValueChange={(evidenceLevel) => set("evidenceLevel", evidenceLevel)}
          options={[
            { value: "", label: "All evidence" },
            ...Object.entries(evidenceLabels).map(([id, name]) => ({ value: id, label: name })),
          ]}
        />
      </div>
    </details>
  );
}
