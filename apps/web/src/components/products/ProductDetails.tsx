import { productCatalog } from "@cayfore/catalog";
import { domainById, mapEntryById, productMap, type ProductMapEntry } from "@cayfore/catalog/map";
import { ArrowLeft, ArrowRight, BookOpen, ExternalLink, Link2, Plus } from "lucide-react";
import { Button } from "../ui/button";
import { InfoTooltip } from "../ui/tooltip";
import { CoverageBadge, DomainIcon, domainColor } from "./map-presentation";
import { cn } from "../../lib/utils";

export function ProductDetails({
  entry,
  onAdd,
  onSelect,
  onInspectCosts,
  onResults,
}: {
  entry: ProductMapEntry;
  onAdd: (id: string) => void;
  onSelect: (id: string) => void;
  onInspectCosts: (id: string) => void;
  onResults: () => void;
}) {
  const product = entry.product;
  const related = productMap.relationships.filter((link) => link.from === entry.id || link.to === entry.id);
  const domains = [entry.domainId, ...entry.relatedDomainIds].map((id) => domainById(id)!);
  const canEstimate = product && product.listPrice !== "unpublished";
  return (
    <section
      id="product-details"
      aria-label="Product details"
      tabIndex={-1}
      className="min-w-0 self-start rounded-2xl border bg-card p-5 shadow-sm sm:p-6 lg:sticky lg:top-24 lg:max-h-[calc(100svh-7rem)] lg:overflow-y-auto lg:overscroll-contain"
    >
      <Button type="button" variant="ghost" size="sm" className="-ml-2 mb-4 lg:hidden" onClick={onResults}>
        <ArrowLeft />
        Back to results
      </Button>
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-2xl border",
            domainColor(entry.domainId),
          )}
        >
          <DomainIcon id={entry.domainId} className="size-6" />
        </span>
        <CoverageBadge entry={entry} />
      </div>
      <p className="mt-5 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        Product details
      </p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-balance">{entry.name}</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{entry.summary}</p>
      {entry.aliases.length > 0 && (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Also found as: </span>
          {entry.aliases.join(" · ")}
        </p>
      )}
      {product && product.menuLabel !== entry.name && (
        <p className="mt-2 text-xs text-muted-foreground">
          Cayfore pricing entry: <span className="font-medium">{product.menuLabel}</span>
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {domains.map((domain, index) => (
          <span key={domain.id} className="rounded-md border bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
            {domain.name}
            {index === 0 ? " · primary" : " · related"}
          </span>
        ))}
      </div>
      <div className="mt-6 border-t pt-5">
        <h3 className="text-sm font-semibold">When you would use it</h3>
        <ul className="mt-3 grid list-disc gap-2 pl-4 text-sm leading-relaxed text-muted-foreground">
          {entry.useCases.map((useCase) => (
            <li key={useCase}>{useCase}</li>
          ))}
        </ul>
      </div>
      <div className="mt-5 rounded-xl border bg-muted/30 p-4">
        <h3 className="text-sm font-semibold">What drives the cost</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{entry.billingContext}</p>
        {product && (
          <>
            <p className="mt-3 text-xs">
              <span className="font-semibold">Catalog unit: </span>
              {product.billingUnit}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{product.drivers.join(" · ")}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              <span className="font-semibold">Pricing evidence: </span>
              {product.confidence === "measured"
                ? "retrieved meter"
                : product.confidence === "cited"
                  ? "cited reference"
                  : product.confidence === "secondary"
                    ? "secondary reference"
                    : "no separate published rate"}
              . This describes the catalog evidence, not forecast accuracy.
            </p>
          </>
        )}
      </div>
      <Button type="button" variant="outline" className="mt-4 min-h-11 w-full" onClick={() => onInspectCosts(entry.id)}>
        Inspect unit costs <ArrowRight aria-hidden="true" />
      </Button>
      {canEstimate ? (
        <div className="mt-5">
          <InfoTooltip
            label="Add to your current plan"
            description="Append the stored catalog components, keep existing workloads, and open Advanced to review usage and coverage."
          >
            <Button type="button" className="min-h-11 w-full" onClick={() => onAdd(product.id)}>
              <Plus />
              Add to forecast
            </Button>
          </InfoTooltip>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Uses catalog defaults in your selected cloud. Review usage and rate coverage in Advanced; Undo restores your
            previous plan.
          </p>
        </div>
      ) : (
        <p className="mt-5 rounded-xl border border-dashed px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          {product
            ? "No catalog rate is available for this entry. Consult the official documentation and your contract before estimating it."
            : "This is a platform concept, not a standalone estimate in Cayfore. Supporting workloads can still incur compute, storage, and network charges."}
        </p>
      )}
      {related.length > 0 && (
        <div className="mt-6 border-t pt-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Link2 className="size-4 text-muted-foreground" aria-hidden="true" />
            How it connects
          </h3>
          <ul className="mt-3 grid gap-2">
            {related.map((link) => {
              const target = mapEntryById(link.from === entry.id ? link.to : link.from)!;
              return (
                <li key={`${link.from}-${link.to}-${link.label}`}>
                  <button
                    type="button"
                    className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left hover:bg-muted"
                    onClick={() => onSelect(target.id)}
                  >
                    <span className="min-w-0">
                      <span className="block text-xs font-medium">{target.name}</span>
                      <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">
                        {mapEntryById(link.from)!.name} — {link.label} → {mapEntryById(link.to)!.name}
                      </span>
                    </span>
                    <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <div className="mt-6 border-t pt-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <BookOpen className="size-4 text-muted-foreground" aria-hidden="true" />
          Sources and context
        </h3>
        <ul className="mt-3 grid gap-2">
          {entry.sources.map((source) => (
            <li key={source.url}>
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-7 items-start gap-2 text-xs leading-relaxed text-link underline-offset-4 hover:underline"
              >
                {source.title}
                <ExternalLink className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Mapping reviewed {productMap.reviewedOn}. Pricing catalog dated {productCatalog.verifiedOn}. Availability and
          commercial terms vary by cloud, region, edition, and release stage.
        </p>
      </div>
    </section>
  );
}
