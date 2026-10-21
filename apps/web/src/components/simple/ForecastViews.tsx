import type { PortfolioProjection } from "@cayfore/engine";
import { ChartColumnIncreasing, ChartNoAxesCombined, Layers, Table2 } from "lucide-react";
import { lazy, Suspense } from "react";
import { periodAt, periodLabel, type ChartSeries } from "../../lib/chart-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { InfoTooltip } from "../ui/tooltip";
import { Breakdown } from "./Breakdown";
import { MonthTable } from "./MonthTable";

const Chart = lazy(() => import("./ForecastChart").then((module) => ({ default: module.ForecastChart })));
const Composition = lazy(() => import("./CompositionChart").then((module) => ({ default: module.CompositionChart })));

export function ForecastViews({
  projection,
  comparison,
}: {
  projection: PortfolioProjection;
  comparison?: { name: string; projection: PortfolioProjection };
}) {
  const { portfolio, points, months, estimate } = projection;
  const startMonth = points[0]?.period ?? estimate.verifiedOn.slice(0, 7);
  const series: ChartSeries = {
    months,
    startMonth,
    budgetAnnual: portfolio.budgetAnnual,
    history: portfolio.usage?.observedUnit === "usd" ? portfolio.usage.observedMonths : undefined,
    comparison: comparison
      ? {
          name: `${comparison.name}${comparison.projection.hasUnpriced ? " (known subtotal)" : ""}`,
          months: comparison.projection.months,
          startMonth: comparison.projection.points[0]?.period ?? startMonth,
        }
      : undefined,
  };
  return (
    <Tabs defaultValue="chart">
      <TabsList
        aria-label="Forecast views"
        className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:inline-flex sm:w-auto sm:gap-0 sm:p-0"
      >
        <InfoTooltip
          label="Monthly spend"
          description="Explore forecast costs by month, including the planning range, imported history, and budget when available."
        >
          <TabsTrigger className="rounded-lg border-0 px-3 sm:rounded-none" value="chart">
            <span className="inline-flex items-center gap-2">
              <ChartColumnIncreasing aria-hidden="true" className="size-4" />
              Chart
            </span>
          </TabsTrigger>
        </InfoTooltip>
        <InfoTooltip
          label="Cumulative spend"
          description="Track accumulated forecast costs and compare with an equally phased annual budget when one is set."
        >
          <TabsTrigger className="rounded-lg border-0 px-3 sm:rounded-none" value="cumulative">
            <span className="inline-flex items-center gap-2">
              <ChartNoAxesCombined aria-hidden="true" className="size-4" />
              Cumulative
            </span>
          </TabsTrigger>
        </InfoTooltip>
        <InfoTooltip
          label="Understand the cost split"
          description="Break each forecast month into Databricks usage, cloud machines, and add-ons. Imported service costs keep their billing basis."
        >
          <TabsTrigger className="rounded-lg border-0 px-3 sm:rounded-none" value="composition">
            <span className="inline-flex items-center gap-2">
              <Layers aria-hidden="true" className="size-4" />
              Cost split
            </span>
          </TabsTrigger>
        </InfoTooltip>
        <InfoTooltip
          label="Monthly values"
          description="Review the first 12 forecast months in a table, with expected costs and the low-to-high planning range."
        >
          <TabsTrigger className="rounded-lg border-0 px-3 sm:rounded-none" value="months">
            <span className="inline-flex items-center gap-2">
              <Table2 aria-hidden="true" className="size-4" />
              Months
            </span>
          </TabsTrigger>
        </InfoTooltip>
      </TabsList>
      <TabsContent value="chart">
        <ChartHeading title="Monthly spend" startMonth={startMonth} />
        <Suspense fallback={<ChartLoading />}>
          <Chart {...series} label="Imported spend and monthly forecast with a planning range" />
        </Suspense>
        <ChartLegend series={series} />
        <p className="mt-2 text-xs text-muted-foreground">
          Future values are estimates. The shaded planning range reflects assumptions; it is not a calibrated
          probability interval.
        </p>
        {portfolio.usage && (
          <p className="mt-2 text-xs text-muted-foreground">
            History: {portfolio.usage.costBasis}.{" "}
            {portfolio.usage.observedUnit === "dbu"
              ? "Unpriced DBU history is shown in the import details, separately from dollar forecasts."
              : "Imported history ends before the forecast begins."}
          </p>
        )}
        <div className="mt-5 border-t pt-4">
          <h3 className="mb-3 text-sm font-semibold">Monthly baseline</h3>
          <Breakdown
            estimate={estimate}
            serviceLabel={portfolio.usage?.source === "focus" ? "Imported service costs" : undefined}
          />
        </div>
      </TabsContent>
      <TabsContent value="cumulative">
        <ChartHeading title="Cumulative spend" startMonth={startMonth} />
        <Suspense fallback={<ChartLoading />}>
          <Chart {...series} cumulative label="Cumulative forecast and equally phased annual budget" />
        </Suspense>
        <ChartLegend series={{ ...series, history: [] }} />
        <p className="mt-2 text-xs text-muted-foreground">
          Forecast months accumulate from zero. An annual budget is divided equally over 12 months.
          {comparison && " Comparisons accumulate only overlapping calendar months."}
        </p>
      </TabsContent>
      <TabsContent value="composition">
        <ChartHeading title="Monthly cost components" startMonth={startMonth} />
        <Suspense fallback={<ChartLoading />}>
          <Composition
            points={points}
            startMonth={startMonth}
            serviceLabel={portfolio.usage?.source === "focus" ? "Imported service costs" : "Databricks usage"}
          />
        </Suspense>
        <ul className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
          {[
            {
              label: portfolio.usage?.source === "focus" ? "Imported service costs" : "Databricks usage",
              color: "var(--foreground)",
            },
            { label: "Cloud machines", color: "var(--lava)" },
            { label: "Add-ons", color: "var(--chart-comparison)" },
          ].map((item) => (
            <li key={item.label} className="flex items-center gap-2">
              <span aria-hidden="true" className="size-2.5 rounded-sm" style={{ background: item.color }} />
              {item.label}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">
          The stacked components reconcile to each forecast month. Imported billing does not add an inferred VM bill.
        </p>
      </TabsContent>
      <TabsContent value="months">
        <ChartHeading title="Monthly forecast" startMonth={startMonth} />
        <MonthTable months={months.slice(0, 12)} startMonth={startMonth} />
      </TabsContent>
    </Tabs>
  );
}

function ChartHeading({ title, startMonth }: { title: string; startMonth: string }) {
  return (
    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-1 text-xs text-muted-foreground">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p>
        {periodLabel(startMonth)}–{periodLabel(periodAt(startMonth, 11))} · USD
      </p>
    </div>
  );
}

function ChartLoading() {
  return (
    <div
      className="flex h-72 items-center justify-center rounded-lg bg-muted/40 text-sm text-muted-foreground"
      role="status"
    >
      Loading chart…
    </div>
  );
}

function ChartLegend({ series }: { series: ChartSeries }) {
  const items = [
    { label: "Forecast", color: "var(--foreground)" },
    { label: "Planning range", color: "var(--lava)" },
    ...(series.history?.length ? [{ label: "Imported spend", color: "var(--chart-actual)" }] : []),
    ...(series.budgetAnnual != null ? [{ label: "Budget", color: "var(--chart-budget)" }] : []),
    ...(series.comparison ? [{ label: series.comparison.name, color: "var(--chart-comparison)" }] : []),
  ];
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
      {items.map((item) => (
        <li key={`${item.color}:${item.label}`} className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={item.label === "Planning range" ? "h-2.5 w-4 rounded-sm opacity-40" : "h-0.5 w-4"}
            style={{ background: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
