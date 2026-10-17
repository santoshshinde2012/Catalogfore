import type { Estimate } from "@cayfore/engine";
import { money } from "../../format";
import { Button } from "../ui/button";

export function PriceDisclosure({ estimate, onReprice }: { estimate: Estimate; onReprice?: () => void }) {
  const coverage = estimate.coverage;
  return (
    <section className="rounded-lg border bg-muted/40 p-4 text-sm" aria-labelledby="price-heading">
      <h3 id="price-heading" className="font-semibold">
        What these prices include
      </h3>
      {coverage && (
        <p className="mt-1 text-xs text-muted-foreground">
          {coverage.pricedLines} priced · {coverage.approximateLines} approximate · {coverage.unpricedLines} unresolved
          · {coverage.freeLines} documented free
        </p>
      )}
      {coverage && !coverage.complete && (
        <p className="mt-2 font-medium text-destructive" role="status">
          Known subtotal only. Unresolved charges are excluded from the total.
        </p>
      )}
      {estimate.warnings.length > 0 && (
        <ul className="mt-3 grid list-disc gap-1.5 pl-4 text-xs text-muted-foreground">
          {estimate.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
      {onReprice && (
        <Button type="button" size="sm" variant="outline" className="mt-3" onClick={onReprice}>
          Accept current catalog
        </Button>
      )}
      <details className="mt-3">
        <summary className="cursor-pointer font-medium">Inspect rates and assumptions</summary>
        <ul className="mt-3 grid gap-3">
          {estimate.lines.map((line) => (
            <li key={line.workloadId} className="border-t pt-2">
              <p className="flex flex-wrap justify-between gap-2">
                <span>{line.name}</span>
                <span className="font-mono text-xs">
                  {line.priceStatus === "unpriced" ? `${money(line.total, 2)} known` : money(line.total, 2)}
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {line.priceStatus ?? "priced"} · {line.rateProvenance?.label ?? "Bundled catalog"}
                {line.rateProvenance?.verifiedOn ? ` · ${line.rateProvenance.verifiedOn}` : ""}
              </p>
              {line.notes.map((note) => (
                <p key={note} className="mt-1 text-xs text-muted-foreground">
                  {note}
                </p>
              ))}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
