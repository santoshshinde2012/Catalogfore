import type { UnitCostCatalog, UnitCostFilters, UnitCostRow } from "@cayfore/engine/unit-costs";
import { Search } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { statusLabels } from "./rate-presentation";

export function RateFilters({
  catalog,
  filters,
  onChange,
  onClear,
}: {
  catalog: UnitCostCatalog;
  filters: UnitCostFilters;
  onChange: (next: UnitCostFilters) => void;
  onClear: () => void;
}) {
  const forCloud = catalog.rows.filter((row) => !filters.cloud || row.cloud === filters.cloud || row.cloud === null);
  const regions = [
    ...new Map(
      forCloud.filter((row) => row.region !== null).map((row) => [row.region!, row.regionLabel ?? row.region!]),
    ).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1]));
  const productRows = forCloud.filter((row) => !filters.productId || row.productId === filters.productId);
  const components = [...new Map(productRows.map((row) => [row.componentId, row.componentName])).entries()].sort(
    (a, b) => a[1].localeCompare(b[1]),
  );
  const domains = [
    ...new Map(catalog.products.map((product) => [product.domainId, product.domainName])).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1]));
  function set(key: keyof UnitCostFilters, value: string) {
    onChange({ ...filters, [key]: value || undefined });
  }
  return (
    <section aria-label="Filter unit costs" className="rounded-2xl border bg-card p-4 sm:p-5">
      <label className="field" htmlFor="rate-search">
        Search rates and services
      </label>
      <div className="relative mt-2">
        <Search
          className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground sm:top-2.5"
          aria-hidden="true"
        />
        <Input
          id="rate-search"
          type="search"
          placeholder="Service, SKU, model, unit, or source…"
          value={filters.query ?? ""}
          onChange={(event) => set("query", event.target.value)}
          className="pl-9"
        />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="field">
          Product or service
          <select
            value={filters.productId ?? ""}
            onChange={(event) =>
              onChange({ ...filters, productId: event.target.value || undefined, componentId: undefined })
            }
          >
            <option value="">All products and services</option>
            {catalog.products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
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
        <label className="field">
          Cloud
          <select
            value={filters.cloud ?? ""}
            onChange={(event) => onChange({ ...filters, cloud: event.target.value || undefined, region: undefined })}
          >
            <option value="">All clouds</option>
            <option value="aws">AWS</option>
            <option value="azure">Azure</option>
            <option value="gcp">GCP</option>
          </select>
        </label>
        <label className="field">
          Region
          <select value={filters.region ?? ""} onChange={(event) => set("region", event.target.value)}>
            <option value="">All regions</option>
            {regions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Edition
          <select value={filters.tier ?? ""} onChange={(event) => set("tier", event.target.value)}>
            <option value="">All editions</option>
            <option value="premium">Premium</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </label>
        <label className="field">
          Cost component
          <select value={filters.componentId ?? ""} onChange={(event) => set("componentId", event.target.value)}>
            <option value="">All components</option>
            {components.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
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
        <div className="flex items-end">
          <Button type="button" variant="ghost" className="min-h-11" onClick={onClear}>
            Reset all filters
          </Button>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Starts with your forecast placement. Cloud-independent context remains visible. Changing these filters does not
        change your forecast.
      </p>
    </section>
  );
}
