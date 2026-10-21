import type { Portfolio } from "@cayfore/engine";
import {
  buildUnitCostCatalog,
  filterUnitCosts,
  planQuantityAction,
  type UnitCostFilters,
  type UnitCostRow,
} from "@cayfore/engine/unit-costs";
import { ArrowDown } from "lucide-react";
import { useEffect, useMemo, useState, type RefObject } from "react";
import { navigateToSection } from "../../lib/page-navigation";
import type { RatePlacement } from "../../hooks/useAppView";
import { useRateWorkspace, type RateWorkspaceDraft } from "../../hooks/useRateWorkspace";
import { Button } from "../ui/button";
import { Tabs, TabsContent } from "../ui/tabs";
import { RateComparison } from "./RateComparison";
import { RateDetails } from "./RateDetails";
import { RateDirectory } from "./RateDirectory";
import { RateDownloads } from "./RateDownloads";
import { RateEvidenceOverview } from "./RateEvidenceOverview";
import { RateFilters } from "./RateFilters";
import { RatePlanFeedback } from "./RatePlanFeedback";
import { RateCatalogNotes, RateWorkspaceHeader } from "./RateWorkspaceHeader";
import { RateWorkspaceTabs } from "./RateWorkspaceTabs";

const catalog = buildUnitCostCatalog();

export function UnitCostsPage({
  portfolio,
  productId,
  onScope,
  onBack,
  onApplyUsage,
  onViewForecast,
  onUndo,
  canUndo,
  placement,
  cache,
}: {
  portfolio: Portfolio;
  productId: string;
  onScope: (filters: UnitCostFilters) => void;
  onBack: () => void;
  onApplyUsage: (row: UnitCostRow, quantity: number) => boolean;
  onViewForecast: () => void;
  onUndo: () => void;
  canUndo: boolean;
  placement?: RatePlacement;
  cache: RefObject<RateWorkspaceDraft | undefined>;
}) {
  const { draft, setDraft, change } = useRateWorkspace({ cache, portfolio, productId, placement, onScope });
  const { filters, selectedId, limit, panel, quantities } = draft;
  const patch = (next: Partial<RateWorkspaceDraft>) => setDraft((previous) => ({ ...previous, ...next }));
  const [changeNotice, setChangeNotice] = useState("");
  useEffect(() => {
    navigateToSection("unit-costs");
  }, []);
  const rows = useMemo(() => filterUnitCosts(catalog.rows, filters), [filters]);
  const selected = rows.find((row) => row.id === selectedId) ?? rows[0];
  function apply(row: UnitCostRow, quantity: number) {
    const action = planQuantityAction(portfolio, row);
    if (onApplyUsage(row, quantity)) {
      setChangeNotice(
        `${action === "add" ? "Added" : "Updated"} ${row.productName}: ${quantity.toLocaleString("en-US")} ${row.unit} per baseline month.`,
      );
      requestAnimationFrame(() => document.getElementById("rate-plan-feedback")?.focus());
    }
  }
  const productKnown = !productId || catalog.products.some((product) => product.id === productId);
  function clear() {
    change({});
    document.getElementById("rate-search")?.focus();
  }
  function select(id: string) {
    patch({ panel: "rates", selectedId: id });
    requestAnimationFrame(() => navigateToSection("rate-details"));
  }
  function selectRegion(row: UnitCostRow) {
    patch({ panel: "rates", selectedId: row.id });
    const next = { ...filters, region: row.region ?? undefined };
    change(
      filterUnitCosts([row], next).length > 0
        ? next
        : { ...next, query: undefined, status: undefined, evidenceLevel: undefined },
    );
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
  const feedback = changeNotice && (
    <RatePlanFeedback
      notice={changeNotice}
      canUndo={canUndo}
      onView={onViewForecast}
      onUndo={() => {
        onUndo();
        setChangeNotice("Change undone. Your previous forecast is restored.");
        requestAnimationFrame(() => document.getElementById("rate-plan-feedback")?.focus());
      }}
    />
  );
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
        {(panel !== "rates" || !selected) && feedback}
        <RateFilters catalog={catalog} filters={filters} onChange={change} onClear={clear} />
        <Tabs value={panel} onValueChange={(panel) => patch({ panel })} className="min-w-0">
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
                onMore={() => patch({ limit: limit + 12 })}
                onClear={clear}
                onSelected={() => selected && select(selected.id)}
              />
              {selected && (
                <RateDetails
                  key={selected.id}
                  row={selected}
                  feedback={panel === "rates" ? feedback : null}
                  portfolio={portfolio}
                  quantity={quantities[selected.id]}
                  onQuantity={(quantity) =>
                    setDraft((previous) => ({
                      ...previous,
                      quantities: { ...previous.quantities, [selected.id]: quantity },
                    }))
                  }
                  onApply={(quantity) => apply(selected, quantity)}
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
            <RateDownloads
              catalog={catalog}
              rows={rows}
              onInspect={inspect}
              draft={draft.downloads}
              filterKey={JSON.stringify(filters)}
              onDraft={(update) =>
                setDraft((previous) => ({
                  ...previous,
                  downloads: typeof update === "function" ? update(previous.downloads) : update,
                }))
              }
            />
          </TabsContent>
        </Tabs>
        <RateCatalogNotes catalog={catalog} />
      </div>
    </article>
  );
}
