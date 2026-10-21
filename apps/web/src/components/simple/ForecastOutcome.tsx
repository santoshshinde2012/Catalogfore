import type { PortfolioProjection } from "@cayfore/engine";
import { money } from "../../format";
import { Rise } from "../../lib/rise";
import { useAnimatedNumber } from "../../lib/use-animated-number";
import { ExportBar } from "../answer/ExportBar";
import { Button } from "../ui/button";
import { navigateToSection } from "../../lib/page-navigation";
import type { RatePlacement } from "../../hooks/useAppView";
import { ForecastViews } from "./ForecastViews";
import { PriceDisclosure } from "./PriceDisclosure";
import { periodAt, periodLabel } from "../../lib/chart-data";
import { InfoTooltip } from "../ui/tooltip";
import { ScenarioComparison } from "./ScenarioComparison";

export function yearCopy(annual: number, cloudShare: number, range: { low: number; high: number }, incomplete = false) {
  const sentence = `${incomplete ? `Known annual subtotal ${money(annual, 0)}; unresolved charges are excluded.` : `About ${money(annual, 0)} per year.`} Planning range ${money(range.low, 0)} to ${money(range.high, 0)}.`;
  const split =
    cloudShare <= 0.005
      ? "The first month has no separate machine charge."
      : `${Math.round(cloudShare * 100)}% of the first-month bill is cloud machines.`;
  return { sentence, split };
}

export function ResultsPanel({
  projection,
  comparison,
  notice,
  busy,
  onShare,
  onReprice,
  onReferenceCosts,
}: {
  projection: PortfolioProjection;
  comparison?: { name: string; projection: PortfolioProjection };
  notice: string;
  busy: boolean;
  onShare: () => void;
  onReprice?: () => void;
  onReferenceCosts?: (productId: string, placement: RatePlacement) => void;
}) {
  const { annual, cloudShare, months, portfolio, estimate, points, band } = projection;
  const subtotal = projection.hasUnpriced;
  const { sentence, split } = yearCopy(annual, cloudShare, band, subtotal);
  const animated = useAnimatedNumber(annual);
  const animatedFirst = useAnimatedNumber(months[0]?.expected ?? 0);
  const animatedLast = useAnimatedNumber(months[11]?.expected ?? 0);
  const startMonth = points[0]?.period ?? estimate.verifiedOn.slice(0, 7);
  const endMonth = points[11]?.period ?? periodAt(startMonth, 11);
  return (
    <div id="forecast" tabIndex={-1} aria-busy={busy} className="grid gap-6">
      <Rise className="grid gap-4">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Next 12 months</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {periodLabel(startMonth)}–{periodLabel(endMonth)} · USD
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <InfoTooltip
                label="Share this forecast"
                description="Copy a link with your current plan and assumptions so someone else can open it."
              >
                <Button type="button" onClick={onShare}>
                  Copy link
                </Button>
              </InfoTooltip>
              <ExportBar portfolio={portfolio} estimate={estimate} points={points} forecastResult={projection} />
            </div>
          </div>
          <p className="mt-4">
            <span className="sr-only" data-testid="year-sentence" aria-live="polite">
              {sentence}
            </span>
            <span
              aria-hidden="true"
              className="block break-words text-4xl font-semibold tracking-tight tabular-nums min-[390px]:text-5xl sm:text-6xl"
              data-testid="year-total"
            >
              {money(animated, 0)}
            </span>
          </p>
          {subtotal && (
            <p className="mt-2 text-sm font-medium text-destructive">
              Known subtotal · some components have unresolved prices
            </p>
          )}
          {busy && (
            <p className="mt-2 text-xs text-muted-foreground" role="status">
              Reading usage data…
            </p>
          )}
          <p className="mt-2 text-sm tabular-nums text-muted-foreground" data-testid="annual-range">
            Planning range {money(band.low, 0)}–{money(band.high, 0)}
          </p>
          {portfolio.usage?.sourceLabel && (
            <p className="mt-2 text-xs font-medium text-muted-foreground">{portfolio.usage.sourceLabel}</p>
          )}
          {notice && (
            <p className="mt-2 text-sm text-muted-foreground" role="status">
              {notice}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Tile label="First month" value={money(animatedFirst, 0)} />
          <Tile label="Month 12" value={money(animatedLast, 0)} />
        </div>
        <p className="text-sm text-muted-foreground" data-testid="bill-split">
          {split}
        </p>
        <Button
          type="button"
          variant="outline"
          className="justify-self-start"
          onClick={() => navigateToSection("budget-planning")}
        >
          Budget and scenarios
        </Button>
        {comparison && <ScenarioComparison current={projection} comparison={comparison} />}
      </Rise>
      {portfolio.workloads.length === 0 && (
        <div className="rounded-xl border border-dashed bg-muted/30 p-5 text-sm">
          <h3 className="font-semibold">Build your first forecast</h3>
          <p className="mt-1 text-muted-foreground">
            Add a product in Advanced, import a usage file, or choose a quick starting amount.
          </p>
          <Button type="button" variant="outline" className="mt-3" onClick={() => navigateToSection("plan-inputs")}>
            Choose a starting point
          </Button>
        </div>
      )}
      <ForecastViews projection={projection} comparison={comparison} />
      <PriceDisclosure
        estimate={estimate}
        portfolio={portfolio}
        onReprice={onReprice}
        onReferenceCosts={onReferenceCosts}
      />
      <div>
        <h3 className="text-sm font-semibold">What drives this</h3>
        <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
          <li>
            {portfolio.usage
              ? `Based on ${portfolio.usage.selectedMonth ?? "undated"} imported ${portfolio.usage.costBasis} usage. ${portfolio.usage.source === "focus" ? "Only services present in this file are included." : "Separate cloud VM invoices are not included."}`
              : portfolio.simple
                ? `${Math.round(portfolio.simple.mix.etl * 100)}% pipelines, ${Math.round(portfolio.simple.mix.sql * 100)}% dashboards, ${Math.round(portfolio.simple.mix.ml * 100)}% models.`
                : `${portfolio.workloads.length} detailed workloads drive this forecast.`}
          </li>
          <li>{projection.assumptions[0]}</li>
          {(portfolio.events?.length ?? 0) > 0 && <li>{portfolio.events!.length} dated usage changes are included.</li>}
        </ul>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Price book dated {estimate.verifiedOn}, catalog v{estimate.catalogVersion}. Estimates only. The calculation
        stays in this browser. Not a Databricks quote.
      </p>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border bg-background px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
