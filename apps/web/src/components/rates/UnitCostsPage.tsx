import type { Portfolio } from "@cayfore/engine";
import {
  buildUnitCostCatalog,
  filterUnitCosts,
  planQuantityAction,
  planQuantityForUnitCost,
  type UnitCostFilters,
  type UnitCostRow,
} from "@cayfore/engine/unit-costs";
import { ArrowDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { navigateToSection } from "../../lib/page-navigation";
import type { RatePlacement } from "../../hooks/useAppView";
import { Button } from "../ui/button";
import { Tabs, TabsContent } from "../ui/tabs";
import { RateComparison } from "./RateComparison";
import { RateDetails } from "./RateDetails";
import { RateDirectory } from "./RateDirectory";
import { RateDownloads } from "./RateDownloads";
import { RateEvidenceOverview } from "./RateEvidenceOverview";
import { RateFilters } from "./RateFilters";
import { RateCatalogNotes, RateWorkspaceHeader } from "./RateWorkspaceHeader";
import { RateWorkspaceTabs } from "./RateWorkspaceTabs";

const catalog = buildUnitCostCatalog();

export function UnitCostsPage({
  portfolio,
  productId,
  onProduct,
  onBack,
  onApplyUsage,
  placement,
}: {
  portfolio: Portfolio;
  productId: string;
  onProduct: (id: string) => void;
  onBack: () => void;
  onApplyUsage: (row: UnitCostRow, quantity: number) => void;
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
  const [panel, setPanel] = useState("rates");
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
    setPanel("rates");
    setSelectedId(id);
    requestAnimationFrame(() => navigateToSection("rate-details"));
  }
  function selectRegion(row: UnitCostRow) {
    setPanel("rates");
    setSelectedId(row.id);
    setFilters((previous) => {
      const next = { ...previous, region: row.region ?? undefined };
      return filterUnitCosts([row], next).length > 0
        ? next
        : { ...next, query: undefined, status: undefined, evidenceLevel: undefined };
    });
    setLimit(12);
    requestAnimationFrame(() => navigateToSection("rate-details"));
  }
  function inspect(row: UnitCostRow) {
    change({
      productId: row.productId,
      cloud: row.cloud ?? undefined,
      region: row.region ?? undefined,
      tier: row.tier ?? undefined,
    });
    select(row.id);
  }
  return (
    <article className="mx-auto w-full max-w-7xl px-4 pt-4 pb-12 sm:px-6 sm:pt-6 lg:pb-16">
      <RateWorkspaceHeader catalog={catalog} onBack={onBack} />
      {selected && panel === "rates" && (
        <div className="mb-4 flex flex-wrap items-center gap-3 sm:hidden">
          <Button type="button" variant="outline" size="sm" onClick={() => select(selected.id)}>
            View selected rate <ArrowDown aria-hidden="true" />
          </Button>
          <span className="text-xs text-muted-foreground">{rows.length.toLocaleString("en-US")} matching rows</span>
        </div>
      )}
      <div className="grid min-w-0 gap-4 sm:gap-5">
        {!productKnown && (
          <p role="status" className="rounded-xl border border-dashed p-4 text-sm">
            This product link is not in the installed catalog. Reset the filters to explore available services.
          </p>
        )}
        <RateFilters catalog={catalog} filters={filters} onChange={change} onClear={clear} />
        <Tabs value={panel} onValueChange={setPanel} className="min-w-0">
          <RateWorkspaceTabs />
          <TabsContent value="rates" forceMount className="mt-4 data-[state=inactive]:hidden">
            {selected && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 lg:hidden">
                <p className="text-xs font-medium text-muted-foreground">Selected component</p>
                <Button type="button" variant="ghost" size="sm" onClick={() => navigateToSection("rate-directory")}>
                  Browse {rows.length.toLocaleString("en-US")} matching rates <ArrowDown aria-hidden="true" />
                </Button>
              </div>
            )}
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <RateDirectory
                rows={rows}
                selectedId={selected?.id}
                limit={limit}
                onSelect={select}
                onMore={() => setLimit((value) => value + 12)}
                onClear={clear}
                onSelected={() => selected && select(selected.id)}
              />
              {selected && (
                <RateDetails
                  key={selected.id}
                  row={selected}
                  usage={planQuantityForUnitCost(portfolio, selected)}
                  action={planQuantityAction(portfolio, selected)}
                  onApply={(quantity) => onApplyUsage(selected, quantity)}
                  onResults={() => navigateToSection("rate-directory")}
                />
              )}
            </div>
          </TabsContent>
          <TabsContent value="compare" className="mt-4">
            {selected ? (
              <RateComparison rows={catalog.rows} selected={selected} onSelect={selectRegion} />
            ) : (
              <p className="rounded-xl border border-dashed bg-card p-5 text-sm text-muted-foreground">
                Choose a matching rate to compare its regional prices.
              </p>
            )}
          </TabsContent>
          <TabsContent value="evidence" className="mt-4">
            <RateEvidenceOverview rows={rows} />
          </TabsContent>
          <TabsContent value="downloads" forceMount className="mt-4 data-[state=inactive]:hidden">
            <RateDownloads catalog={catalog} rows={rows} onInspect={inspect} />
          </TabsContent>
        </Tabs>
        <RateCatalogNotes catalog={catalog} />
      </div>
    </article>
  );
}
