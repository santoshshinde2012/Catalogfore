import { productCatalog } from "@cayfore/catalog";
import { pricesUpdatedOn, type PortfolioProjection } from "@cayfore/engine";
import { money } from "../../format";
import { Rise } from "../../lib/rise";
import { useAnimatedNumber } from "../../lib/use-animated-number";
import { ExportBar } from "../answer/ExportBar";
import { Button } from "../ui/button";
import { navigateToSection } from "../../lib/page-navigation";
import { ForecastViews } from "./ForecastViews";
import { PriceDisclosure } from "./PriceDisclosure";

export function yearCopy(annual: number, spreadPercent: number, cloudShare: number) {
  const sentence =
    annual !== 0 ? `About ${money(annual, 0)} per year, ±${spreadPercent}%.` : `About ${money(0, 0)} per year.`;
  const split =
    cloudShare <= 0.005
      ? "This plan has no separate machine charge."
      : `${Math.round(cloudShare * 100)}% of the bill is cloud machines.`;
  return { sentence, split };
}

export function ResultsPanel({
  projection,
  comparison,
  notice,
  busy,
  onShare,
  onReprice,
}: {
  projection: PortfolioProjection;
  comparison?: { name: string; projection: PortfolioProjection };
  notice: string;
  busy: boolean;
  onShare: () => void;
  onReprice?: () => void;
}) {
  const { annual, spreadPercent, cloudShare, months, portfolio, estimate, points, band } = projection;
  const { sentence, split } = yearCopy(annual, spreadPercent, cloudShare);
  const animated = useAnimatedNumber(annual);
  const animatedFirst = useAnimatedNumber(months[0]?.expected ?? 0);
  const animatedLast = useAnimatedNumber(months[11]?.expected ?? 0);
  const subtotal = estimate.coverage?.complete === false;
  return (
    <div id="forecast" tabIndex={-1} aria-busy={busy} className="grid gap-6">
      <Rise className="grid gap-4">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-muted-foreground">
              Next 12 months{subtotal ? " · known subtotal" : ""}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" onClick={onShare}>
                Copy link
              </Button>
              <ExportBar portfolio={portfolio} estimate={estimate} points={points} forecastResult={projection} />
            </div>
          </div>
          <p
            className="mt-3 break-words text-4xl font-semibold tracking-tight tabular-nums min-[390px]:text-5xl sm:text-6xl"
            data-testid="year-total"
          >
            {money(animated, 0)}
          </p>
          {busy && (
            <p className="mt-2 text-xs text-muted-foreground" role="status">
              Reading usage data…
            </p>
          )}
          <p className="mt-2 text-sm text-muted-foreground" data-testid="year-sentence" aria-live="polite">
            {sentence}
          </p>
          <p className="mt-1 text-sm tabular-nums" data-testid="annual-range">
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
        <div className="grid grid-cols-3 gap-2">
          <Tile label="First month" value={money(animatedFirst, 0)} />
          <Tile label="Month 12" value={money(animatedLast, 0)} />
          <Tile label="Cloud share" value={cloudShare <= 0.005 ? "None" : `${Math.round(cloudShare * 100)}%`} />
        </div>
        <p className="text-sm text-muted-foreground" data-testid="bill-split">
          {split}
        </p>
        {comparison && (
          <p className="rounded-lg border border-primary/25 bg-primary/5 p-3 text-sm" data-testid="scenario-delta">
            {Math.abs(annual - comparison.projection.annual) < 0.01
              ? `Same forecast total as ${comparison.name} over each plan’s first 12 months.`
              : `${money(Math.abs(annual - comparison.projection.annual), 0)} ${annual > comparison.projection.annual ? "more" : "less"} than ${comparison.name} over each plan’s first 12 months.`}
            {points[0]?.period !== comparison.projection.points[0]?.period &&
              " These plans start in different months; chart comparisons align calendar dates."}
          </p>
        )}
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
      <PriceDisclosure estimate={estimate} onReprice={onReprice} />
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
          <li>{split}</li>
        </ul>
      </div>
      <p className="text-xs text-muted-foreground">
        Prices updated on {pricesUpdatedOn}, catalog v{productCatalog.version}. Estimates only. Catalog{" "}
        {estimate.catalogVersion}, verified {estimate.verifiedOn}. The calculation stays in this browser. Not a
        Databricks quote, and not affiliated with Databricks.
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
