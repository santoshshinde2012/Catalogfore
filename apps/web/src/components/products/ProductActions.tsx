import type { ProductMapEntry } from "@cayfore/catalog/map";
import { ArrowRight, Plus } from "lucide-react";
import { Button } from "../ui/button";
import { InfoTooltip } from "../ui/tooltip";

export function ProductActions({
  entry,
  onAdd,
  onInspectCosts,
}: {
  entry: ProductMapEntry;
  onAdd: (id: string) => void;
  onInspectCosts: (id: string) => void;
}) {
  const product = entry.product;
  const canEstimate = product && product.listPrice !== "unpublished";
  return (
    <div className="mt-5 rounded-xl border bg-background/70 p-3">
      <div className={canEstimate ? "grid gap-2 sm:grid-cols-2" : "grid gap-2"}>
        <InfoTooltip
          label="See the cost behind this entry"
          description="Inspect component units, source links, observation dates, and regional price coverage in the shared unit-cost inventory."
        >
          <Button type="button" className="min-h-11 w-full" onClick={() => onInspectCosts(entry.id)}>
            Inspect unit costs <ArrowRight aria-hidden="true" />
          </Button>
        </InfoTooltip>
        {canEstimate && (
          <InfoTooltip
            label="Add to your current plan"
            description="Append the stored catalog components, keep existing workloads, and open Advanced to review usage and coverage."
          >
            <Button type="button" variant="outline" className="min-h-11 w-full" onClick={() => onAdd(product.id)}>
              <Plus aria-hidden="true" />
              Add to forecast
            </Button>
          </InfoTooltip>
        )}
      </div>
      <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground">
        {canEstimate
          ? "Add uses defaults in your selected cloud. Review usage and coverage in Advanced; Undo restores your previous plan."
          : product
            ? "This entry has no resolved catalog rate. Inspect its source context and underlying charges before estimating."
            : "A platform concept has no standalone estimate here. Connected compute, storage and network services can still incur charges."}
      </p>
    </div>
  );
}
