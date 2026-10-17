import type { Portfolio } from "@cayfore/engine";
import { buildUnitCostCatalog, filterUnitCosts, type UnitCostFilters } from "@cayfore/engine/unit-costs";
import { ArrowLeft, CircleDollarSign, Info } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { navigateToSection } from "../../lib/page-navigation";
import type { RatePlacement } from "../../hooks/useAppView";
import { Button } from "../ui/button";
import { RateDetails } from "./RateDetails";
import { RateDirectory } from "./RateDirectory";
import { RateDownloads } from "./RateDownloads";
import { RateFilters } from "./RateFilters";

const catalog = buildUnitCostCatalog();

export function UnitCostsPage({
  portfolio,
  productId,
  onProduct,
  onBack,
  placement,
}: {
  portfolio: Portfolio;
  productId: string;
  onProduct: (id: string) => void;
  onBack: () => void;
  placement?: RatePlacement;
}) {
  const [filters, setFilters] = useState<UnitCostFilters>(() => ({
    productId: productId || undefined,
    cloud: placement?.cloud ?? portfolio.cloud,
    region: placement?.region ?? portfolio.region,
    tier: placement?.tier ?? portfolio.tier,
  }));
  const [selectedId, setSelectedId] = useState("");
  const [limit, setLimit] = useState(12);
  useEffect(() => {
    navigateToSection("unit-costs");
  }, []);
  useEffect(() => {
    setFilters((previous) => ({ ...previous, productId: productId || undefined, componentId: undefined }));
    setLimit(12);
  }, [productId]);
  const cloud = placement?.cloud ?? portfolio.cloud;
  const region = placement?.region ?? portfolio.region;
  const tier = placement?.tier ?? portfolio.tier;
  useEffect(() => {
    setFilters((previous) => ({ ...previous, cloud, region, tier }));
    setLimit(12);
  }, [cloud, region, tier]);
  const rows = useMemo(() => filterUnitCosts(catalog.rows, filters), [filters]);
  const selected = rows.find((row) => row.id === selectedId) ?? rows[0];
  const productKnown = !productId || catalog.products.some((product) => product.id === productId);
  function change(next: UnitCostFilters) {
    setFilters(next);
    setLimit(12);
    if ((next.productId ?? "") !== productId) onProduct(next.productId ?? "");
  }
  function clear() {
    change({});
  }
  function select(id: string) {
    setSelectedId(id);
    requestAnimationFrame(() => navigateToSection("rate-details"));
  }
  return (
    <article className="mx-auto w-full max-w-6xl px-4 pt-7 pb-12 sm:px-6 lg:pb-16">
      <Button type="button" variant="ghost" size="sm" className="-ml-2 mb-5 text-muted-foreground" onClick={onBack}>
        <ArrowLeft aria-hidden="true" />
        Back to planner
      </Button>
      <header className="mb-7 flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            <CircleDollarSign className="size-4 text-link" aria-hidden="true" />
            The numbers behind your forecast
          </p>
          <h1
            id="unit-costs"
            tabIndex={-1}
            className="mt-3 text-4xl font-semibold tracking-tight text-balance sm:text-5xl"
          >
            Know the cost of every unit.
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Explore source prices, billing dimensions, and the calculations behind each component. Check a quantity,
            follow its evidence, or take the catalog into your own spreadsheet.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="rounded-xl border bg-card px-3 py-2">
            <strong className="font-semibold text-foreground">{catalog.products.length}</strong> products and concepts
          </span>
          <span className="rounded-xl border bg-card px-3 py-2">
            <strong className="font-semibold text-foreground">{catalog.rows.length.toLocaleString("en-US")}</strong>{" "}
            dimension rows
          </span>
        </div>
      </header>
      <div className="grid gap-6">
        <aside className="flex items-start gap-3 rounded-2xl border bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold text-foreground">A unit price is one part of the bill.</p>
            <p className="mt-1">
              DBU consumption, cloud machines, storage, and network can be separate components. Rates use different
              units; adding them together would not give a service total. Unresolved prices stay empty in downloads.
            </p>
            <p className="mt-2">
              Catalog {catalog.catalogVersion} · verified {catalog.verifiedOn}. Source observation dates are shown on
              each row.
            </p>
          </div>
        </aside>
        {!productKnown && (
          <p role="status" className="rounded-xl border border-dashed p-4 text-sm">
            This product link is not in the installed catalog. Reset the filters to explore available services.
          </p>
        )}
        <RateFilters catalog={catalog} filters={filters} onChange={change} onClear={clear} />
        <RateDownloads catalog={catalog} rows={rows} />
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <RateDirectory
            rows={rows}
            selectedId={selected?.id}
            limit={limit}
            onSelect={select}
            onMore={() => setLimit((value) => value + 12)}
            onClear={clear}
          />
          {selected && (
            <RateDetails key={selected.id} row={selected} onResults={() => navigateToSection("rate-directory")} />
          )}
        </div>
        <p className="rounded-2xl border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
          {catalog.disclaimer}
        </p>
      </div>
    </article>
  );
}
