import { domainById, productMap } from "@cayfore/catalog/map";
import { Check, Layers3 } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { InfoTooltip } from "../ui/tooltip";
import { DomainIcon, domainColor } from "./map-presentation";

export function DomainOverview({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  const active = domainById(selected);
  return (
    <section aria-labelledby="domain-map-heading" className="min-w-0 overflow-hidden">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="domain-map-heading" className="flex items-center gap-2 text-sm font-semibold">
          <Layers3 className="size-4 text-muted-foreground" aria-hidden="true" />
          Explore by domain
        </h2>
        <p className="text-xs text-muted-foreground">Eight connected parts of the platform</p>
      </div>
      <div
        role="group"
        aria-label="Product domains"
        className="grid min-w-0 auto-cols-[minmax(11.5rem,1fr)] grid-flow-col grid-rows-2 gap-2 overflow-x-auto pb-2 sm:grid-flow-row sm:grid-cols-4 sm:grid-rows-none"
      >
        {productMap.domains.map((domain) => {
          const count = productMap.entries.filter((entry) => entry.domainId === domain.id).length;
          const isSelected = selected === domain.id;
          return (
            <InfoTooltip key={domain.id} label={domain.name} description={domain.summary}>
              <button
                type="button"
                aria-pressed={isSelected}
                aria-controls="product-directory"
                onClick={() => onSelect(isSelected ? "" : domain.id)}
                className={cn(
                  "flex min-h-16 w-full min-w-0 items-center gap-2.5 rounded-xl border bg-card px-3 py-2.5 text-left transition-colors hover:border-foreground/30 hover:bg-muted/40",
                  isSelected && "border-primary bg-primary/5 ring-1 ring-inset ring-primary/15",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg border",
                    domainColor(domain.id),
                  )}
                >
                  <DomainIcon id={domain.id} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs leading-snug font-semibold">{domain.name}</span>
                  <span className="mt-1 block text-[10px] leading-snug text-muted-foreground">{domain.verb}</span>
                </span>
                {isSelected ? (
                  <Check className="size-3.5 shrink-0 text-link" aria-hidden="true" />
                ) : (
                  <span
                    className="self-start rounded-md bg-muted/70 px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground"
                    aria-label={`${count} primary entries`}
                  >
                    {count}
                  </span>
                )}
              </button>
            </InfoTooltip>
          );
        })}
      </div>
      {active && (
        <div className="mt-2 rounded-xl border bg-card px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">{active.name}</h3>
            <Button type="button" variant="ghost" size="sm" className="-mr-2" onClick={() => onSelect("")}>
              Clear domain
            </Button>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{active.summary}</p>
          <p className="mt-2 text-xs leading-relaxed">
            <span className="font-medium">Cost lens: </span>
            {active.billingContext}
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Results include primary and related capabilities; domain counts show primary entries.
          </p>
        </div>
      )}
    </section>
  );
}
