import { mapEntryById, productMap } from "@cayfore/catalog/map";
import { ArrowRight, ChevronDown, Route } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/utils";
import { DomainIcon, domainColor } from "./map-presentation";

export function LearningJourneys({ onSelectEntry }: { onSelectEntry: (id: string) => void }) {
  const [selected, setSelected] = useState(productMap.journeys[0]?.id);
  const journey = productMap.journeys.find((item) => item.id === selected);
  if (!journey) return null;
  return (
    <details className="group rounded-2xl border bg-card">
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 rounded-2xl p-4 hover:bg-muted/30 sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border bg-muted/40">
          <Route className="size-4 text-link" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <h2 id="architecture-heading" className="text-sm font-semibold">
            See how the pieces work together
          </h2>
          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
            Explore {productMap.journeys.length} example architectures, from ingestion to an application.
          </span>
        </span>
        <ChevronDown
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="border-t p-4 sm:p-5">
        <div role="group" aria-label="Example architectures" className="flex flex-wrap gap-2">
          {productMap.journeys.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={selected === item.id}
              className={cn(
                "min-h-11 rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
                selected === item.id
                  ? "border-primary bg-primary/5 text-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted",
              )}
              onClick={() => setSelected(item.id)}
            >
              {item.name}
            </button>
          ))}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{journey.summary}</p>
        <ol aria-label={`${journey.name} steps`} className="mt-4 grid gap-2 sm:flex sm:flex-wrap sm:items-center">
          {journey.steps.map((id, index) => {
            const entry = mapEntryById(id)!;
            return (
              <li key={id} className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSelectEntry(id)}
                  className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl border bg-background px-3 py-2 text-left text-xs font-medium hover:border-foreground/30"
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-md",
                      domainColor(entry.domainId),
                    )}
                  >
                    <DomainIcon id={entry.domainId} className="size-3.5" />
                  </span>
                  <span className="min-w-0 break-words">{entry.name}</span>
                </button>
                {index < journey.steps.length - 1 && (
                  <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                )}
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Illustrative combinations, not deployment instructions. Select a step to inspect its role and costs.
        </p>
      </div>
    </details>
  );
}
