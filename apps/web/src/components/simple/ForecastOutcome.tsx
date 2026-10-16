import type { Estimate, ForecastPoint, Portfolio, SimpleMonth, SimplePlan } from "@cayfore/engine";
import { pricesUpdatedOn } from "@cayfore/engine";
import { money } from "../../format";
import { Rise } from "../../lib/rise";
import { useAnimatedNumber } from "../../lib/use-animated-number";
import { ExportBar } from "../answer/ExportBar";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Breakdown } from "./Breakdown";
import { ForecastChart } from "./ForecastChart";
import { MonthTable } from "./MonthTable";

export function yearCopy(annual: number, spreadPercent: number, cloudShare: number) {
  const sentence =
    annual > 0 ? `About ${money(annual, 0)} per year, ±${spreadPercent}%.` : `About ${money(0, 0)} per year.`;
  const split =
    cloudShare <= 0.005
      ? "This mix has no separate machine charge."
      : `${Math.round(cloudShare * 100)}% of the bill is cloud machines.`;
  return { sentence, split };
}

export function ResultsPanel({
  annual,
  spreadPercent,
  cloudShare,
  firstMonth,
  months,
  plan,
  portfolio,
  estimate,
  points,
  notice,
  busy,
  onShare,
}: {
  annual: number;
  spreadPercent: number;
  cloudShare: number;
  firstMonth: number;
  months: SimpleMonth[];
  plan: SimplePlan;
  portfolio: Portfolio;
  estimate: Estimate;
  points: ForecastPoint[];
  notice: string;
  busy: boolean;
  onShare: () => void;
}) {
  const { sentence, split } = yearCopy(annual, spreadPercent, cloudShare);
  const animated = useAnimatedNumber(annual);
  const animatedFirst = useAnimatedNumber(firstMonth);
  const lastMonth = months[months.length - 1]?.expected ?? 0;
  const animatedLast = useAnimatedNumber(lastMonth);
  const growth = Math.round(plan.monthlyGrowth * 1000) / 10;
  return (
    <div id="forecast" className="grid gap-6">
      <Rise className="grid gap-4">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-muted-foreground">Next year</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" onClick={onShare}>
                {notice || "Copy link"}
              </Button>
              <ExportBar portfolio={portfolio} estimate={estimate} points={points} />
            </div>
          </div>
          {busy ? (
            <Skeleton className="mt-3 h-14 w-56" />
          ) : (
            <p className="mt-1 text-5xl font-semibold tracking-tight tabular-nums sm:text-6xl" data-testid="year-total">
              {money(animated, 0)}
            </p>
          )}
          <p className="mt-2 text-sm text-muted-foreground" data-testid="year-sentence" aria-live="polite">
            {sentence}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Tile label="First month" value={busy ? null : money(animatedFirst, 0)} />
          <Tile label="Month 12" value={busy ? null : money(animatedLast, 0)} />
          <Tile
            label="Cloud share"
            value={busy ? null : cloudShare <= 0.005 ? "None" : `${Math.round(cloudShare * 100)}%`}
          />
        </div>
        <div className="text-sm text-muted-foreground" data-testid="bill-split">
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="underline decoration-dotted decoration-foreground/30 underline-offset-4">
                {split.replace(/\.$/, "")}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              Cloud machines are the VMs under the workloads. The rest of the bill is Databricks usage.
            </TooltipContent>
          </Tooltip>
        </div>
      </Rise>
      <Tabs defaultValue="chart">
        <TabsList>
          <TabsTrigger value="chart">Chart</TabsTrigger>
          <TabsTrigger value="months">Months</TabsTrigger>
        </TabsList>
        <TabsContent value="chart">
          {busy ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ForecastChart months={months} label={`${sentence} ${split}`} />
          )}
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="h-0.5 w-4 rounded-full bg-foreground" />
              Expected
            </li>
            <li className="flex items-center gap-2">
              <span className="size-2.5 rounded-sm bg-lava/25" />
              Low to high
            </li>
          </ul>
          <div className="mt-6 border-t pt-6">
            <h2 className="text-sm font-semibold">This month</h2>
            <div className="mt-3">
              <Breakdown estimate={estimate} />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="months">
          <MonthTable months={months} />
        </TabsContent>
      </Tabs>
      <div>
        <h2 className="text-sm font-semibold">What drives this</h2>
        <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
          <li>
            {Math.round(plan.mix.etl * 100)}% pipelines, {Math.round(plan.mix.sql * 100)}% dashboards,{" "}
            {Math.round(plan.mix.ml * 100)}% models.
          </li>
          <li>
            {growth > 0 ? `Each month is ${growth}% higher than the one before.` : "Growth is flat across the year."}
          </li>
          <li>{split}</li>
        </ul>
      </div>
      <p className="text-xs text-muted-foreground">
        Estimates only. Prices updated {pricesUpdatedOn}. Not a Databricks quote, and not affiliated with Databricks.
      </p>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-lg border bg-background px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums">{value ?? <Skeleton className="h-5 w-16" />}</p>
    </div>
  );
}
