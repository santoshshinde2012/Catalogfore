import type { UnitCostCatalog } from "@cayfore/engine/unit-costs";
import { ArrowLeft, CircleDollarSign, ShieldCheck } from "lucide-react";
import { Button } from "../ui/button";

export function RateWorkspaceHeader({ catalog, onBack }: { catalog: UnitCostCatalog; onBack: () => void }) {
  return (
    <header className="mb-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
          Back to planner
        </Button>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          Source registry reviewed {catalog.reviewedOn}
        </span>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            <CircleDollarSign className="size-3.5 text-link" aria-hidden="true" />
            Pricing workspace
          </p>
          <h1 id="unit-costs" tabIndex={-1} className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Unit costs
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Explore the price catalog, trace each source, and calculate component costs.
          </p>
        </div>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>
            <strong className="font-semibold text-foreground">{catalog.products.length}</strong> products & concepts
          </span>
          <span>
            <strong className="font-semibold text-foreground">{catalog.rows.length.toLocaleString("en-US")}</strong>{" "}
            dimensional rows
          </span>
        </p>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Bundled USD snapshot · Reference filters and calculations keep your forecast unchanged.
      </p>
    </header>
  );
}

export function RateCatalogNotes({ catalog }: { catalog: UnitCostCatalog }) {
  return (
    <details className="border-t py-3 text-xs leading-relaxed text-muted-foreground">
      <summary className="min-h-8 cursor-pointer py-1 font-medium text-foreground">
        About this price catalog and its limits
      </summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <p>
          A unit price is one part of the bill. DBU consumption, machines, storage, and network can be separate charges.
          Different units and alternative variants should not be added as a service total. Missing prices stay
          unresolved.
        </p>
        <p>
          Catalog {catalog.catalogVersion} · registry reviewed {catalog.reviewedOn}. Each row retains its own
          observation and review dates. This is a bundled snapshot rather than a live feed; a price does not confirm
          regional availability.
        </p>
        <p className="sm:col-span-2">{catalog.disclaimer}</p>
      </div>
    </details>
  );
}
