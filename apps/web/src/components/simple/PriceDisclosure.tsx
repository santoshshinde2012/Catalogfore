import { regionInfo, type Estimate, type Portfolio } from "@cayfore/engine";
import type { RatePlacement } from "../../hooks/useAppView";
import { money } from "../../format";
import { Button } from "../ui/button";

export function PriceDisclosure({
  estimate,
  portfolio,
  onReprice,
  onReferenceCosts,
}: {
  estimate: Estimate;
  portfolio?: Portfolio;
  onReprice?: () => void;
  onReferenceCosts?: (productId: string, placement: RatePlacement) => void;
}) {
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
              {httpsSource(line.rateProvenance?.source) && (
                <a
                  className="mt-2 inline-block min-h-7 break-all text-xs text-link underline-offset-4 hover:underline"
                  href={httpsSource(line.rateProvenance?.source)}
                  target="_blank"
                  rel="noreferrer"
                >
                  View rate provenance source<span className="sr-only"> (opens in a new tab)</span>
                </a>
              )}
              {line.notes.map((note) => (
                <p key={note} className="mt-1 text-xs text-muted-foreground">
                  {note}
                </p>
              ))}
              {portfolio && onReferenceCosts && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2 max-w-full whitespace-normal"
                  onClick={() => {
                    const workload = portfolio.workloads.find((item) => item.id === line.workloadId);
                    const cloud = workload?.cloud ?? portfolio.cloud;
                    onReferenceCosts(workload?.productId ?? "", {
                      cloud,
                      region: regionInfo(cloud, workload?.region ?? portfolio.region).id,
                      tier: workload?.tier ?? portfolio.tier,
                    });
                  }}
                >
                  View reference unit costs
                </Button>
              )}
            </li>
          ))}
        </ul>
        {onReferenceCosts && (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Reference unit costs use the installed catalog before contract adjustments. Custom rates and imported billed
            or effective amounts can differ.
          </p>
        )}
      </details>
    </section>
  );
}

function httpsSource(source: string | undefined): string | undefined {
  if (!source) return undefined;
  try {
    const url = new URL(source);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined;
  } catch {
    return undefined;
  }
}
