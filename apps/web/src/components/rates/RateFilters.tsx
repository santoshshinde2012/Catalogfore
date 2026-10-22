import type { UnitCostCatalog, UnitCostFilters } from "@cayfore/engine/unit-costs";
import { Search } from "lucide-react";
import { Button } from "../ui/button";
import { AwsMark, AzureMark, GcpMark } from "../ui/cloud-marks";
import { Input } from "../ui/input";
import { OptionSelect } from "../ui/option-select";
import { RateFilterRefinements } from "./RateFilterRefinements";

const clouds = [
  { value: "", label: "All clouds" },
  { value: "aws", label: "AWS", leading: <AwsMark /> },
  { value: "azure", label: "Azure", leading: <AzureMark /> },
  { value: "gcp", label: "GCP", leading: <GcpMark /> },
];
const editions = [
  { value: "", label: "All editions" },
  { value: "premium", label: "Premium" },
  { value: "enterprise", label: "Enterprise" },
];

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
    { value: "", label: "All regions" },
    ...[
      ...new Map(
        forCloud.filter((row) => row.region !== null).map((row) => [row.region!, row.regionLabel ?? row.region!]),
      ).entries(),
    ]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([id, name]) => ({ value: id, label: name })),
  ];
  const productRows = forCloud.filter((row) => !filters.productId || row.productId === filters.productId);
  const components = [
    { value: "", label: "All components" },
    ...[...new Map(productRows.map((row) => [row.componentId, row.componentName])).entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([id, name]) => ({ value: id, label: name })),
  ];
  const products = [
    { value: "", label: "All products and services" },
    ...catalog.products.map((product) => ({ value: product.id, label: product.name })),
  ];
  function set(key: keyof UnitCostFilters, value: string) {
    onChange({ ...filters, [key]: value || undefined });
  }
  return (
    <section aria-label="Filter unit costs" className="border-y bg-card/60 px-3 py-3 sm:px-4">
      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <div className="grid min-w-0 gap-2">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="rate-search">
            Search rates and services
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="rate-search"
              type="search"
              placeholder="Service, SKU, or model"
              value={filters.query ?? ""}
              onChange={(event) => set("query", event.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <OptionSelect
          className="min-w-0"
          label="Product or service"
          value={filters.productId ?? ""}
          onValueChange={(productId) =>
            onChange({ ...filters, productId: productId || undefined, componentId: undefined })
          }
          options={products}
        />
        <OptionSelect
          className="min-w-0"
          label="Cloud"
          value={filters.cloud ?? ""}
          onValueChange={(cloud) => onChange({ ...filters, cloud: cloud || undefined, region: undefined })}
          options={clouds}
        />
        <OptionSelect
          className="min-w-0"
          label="Region"
          value={filters.region ?? ""}
          onValueChange={(region) => set("region", region)}
          options={regions}
        />
        <OptionSelect
          className="min-w-0"
          label="Edition"
          value={filters.tier ?? ""}
          onValueChange={(tier) => set("tier", tier)}
          options={editions}
        />
        <OptionSelect
          className="min-w-0"
          label="Cost component"
          value={filters.componentId ?? ""}
          onValueChange={(componentId) => set("componentId", componentId)}
          options={components}
        />
      </div>
      <div className="mt-2 flex items-start gap-2">
        <RateFilterRefinements catalog={catalog} filters={filters} onChange={onChange} />
        <Button type="button" variant="ghost" size="sm" className="mt-0.5 shrink-0 text-xs" onClick={onClear}>
          Reset all filters
        </Button>
      </div>
    </section>
  );
}
