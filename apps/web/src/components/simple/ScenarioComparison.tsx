import type { PortfolioProjection } from "@cayfore/engine";
import { money } from "../../format";

export function ScenarioComparison({
  current,
  comparison,
}: {
  current: PortfolioProjection;
  comparison: { name: string; projection: PortfolioProjection };
}) {
  const difference = current.annual - comparison.projection.annual;
  const incomplete = current.hasUnpriced || comparison.projection.hasUnpriced;
  const same = Math.abs(difference) < 0.01;
  return (
    <div
      className="rounded-lg border border-primary/25 bg-primary/5 p-3 text-sm break-words"
      role="status"
      data-testid="scenario-delta"
    >
      <p>
        {same
          ? `Same ${incomplete ? "known subtotal" : "forecast total"} as ${comparison.name} over each plan’s first 12 months.`
          : `${money(Math.abs(difference), 0)} ${difference > 0 ? "more" : "less"} than ${comparison.name}${incomplete ? " in known costs" : ""} over each plan’s first 12 months.`}
      </p>
      {incomplete && (
        <p className="mt-2 font-medium">
          Unresolved charges are excluded from{" "}
          {current.hasUnpriced && comparison.projection.hasUnpriced
            ? "both plans"
            : current.hasUnpriced
              ? "the current plan"
              : comparison.name}
          . This is not a complete cost comparison.
        </p>
      )}
      {current.points[0]?.period !== comparison.projection.points[0]?.period && (
        <p className="mt-2 text-xs text-muted-foreground">
          These plans start in different months; chart comparisons align calendar dates.
        </p>
      )}
    </div>
  );
}
