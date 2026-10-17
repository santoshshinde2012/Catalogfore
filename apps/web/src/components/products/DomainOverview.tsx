import { domainById, productMap } from "@cayfore/catalog/map";
import { ArrowRight, Check, Layers3 } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { DomainIcon, domainColor } from "./map-presentation";

const stages = [
  { name: "Bring data in", ids: ["ingestion"] },
  { name: "Build and serve", ids: ["engineering", "ai_ml", "apps"] },
  { name: "Use and collaborate", ids: ["analytics", "sharing"] },
];

export function DomainOverview({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  const active = domainById(selected);
  function card(id: string) {
    const domain = domainById(id);
    if (!domain) return null;
    const count = productMap.entries.filter((entry) => entry.domainId === id).length;
    const examples = productMap.entries
      .filter((entry) => entry.domainId === id)
      .sort((a, b) => Number(Boolean(a.product)) - Number(Boolean(b.product)))
      .slice(0, 3);
    return (
      <button
        key={id}
        type="button"
        aria-pressed={selected === id}
        onClick={() => onSelect(selected === id ? "" : id)}
        className={cn(
          "group flex min-h-24 w-full items-start gap-3 rounded-xl border bg-card p-3.5 text-left transition-colors hover:border-foreground/30",
          selected === id && "border-primary ring-1 ring-primary/20",
        )}
      >
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl border", domainColor(id))}>
          <DomainIcon id={id} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2 text-sm font-semibold">
            {domain.name}
            {selected === id && <Check className="size-4 shrink-0 text-link" aria-hidden="true" />}
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{domain.verb}</span>
          <span className="mt-2 block text-[11px] leading-relaxed">
            {examples.map((entry) => entry.name).join(" · ")}
          </span>
          <span className="mt-2 block text-[10px] font-medium text-muted-foreground">{count} primary entries</span>
        </span>
      </button>
    );
  }
  return (
    <section
      aria-labelledby="domain-map-heading"
      className="overflow-hidden rounded-2xl border bg-card/80 p-4 shadow-sm sm:p-6"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            The platform, connected
          </p>
          <h2 id="domain-map-heading" className="mt-1 text-lg font-semibold tracking-tight">
            Start with the job to be done
          </h2>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground">
          <Layers3 className="size-3.5" aria-hidden="true" />
          {productMap.domains.length} learning domains
        </span>
      </div>
      <div role="group" aria-label="Product domains">
        <div className="grid gap-4 md:grid-cols-3">
          {stages.map((stage, index) => (
            <div key={stage.name} className="min-w-0">
              <p className="mb-3 flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>
                  <span className="mr-2 font-mono text-link">0{index + 1}</span>
                  {stage.name}
                </span>
                {index < 2 && <ArrowRight className="hidden size-4 md:block" aria-hidden="true" />}
              </p>
              <div className="grid gap-2.5">{stage.ids.map(card)}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 border-t pt-4">
          <p className="mb-3 text-xs font-semibold text-muted-foreground">Shared foundations across the workflow</p>
          <div className="grid gap-2.5 sm:grid-cols-2">{["governance", "platform"].map(card)}</div>
        </div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Select a domain to explore its products and related capabilities. This is a conceptual workflow; the arrows do
        not mean every service is required.
      </p>
      {active && (
        <div className="mt-4 rounded-xl border bg-background p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold">{active.name}</h3>
            <Button variant="ghost" size="sm" onClick={() => onSelect("")}>
              Clear domain
            </Button>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{active.summary}</p>
          <p className="mt-3 text-xs leading-relaxed">
            <span className="font-semibold">Cost lens: </span>
            {active.billingContext}
          </p>
        </div>
      )}
    </section>
  );
}
