import type { Estimate, ForecastPoint, Portfolio, SimpleMonth } from "@dcf/engine";
import { money } from "../../format";
import { useAnimatedNumber } from "../../lib/use-animated-number";
import { ExportBar } from "../answer/ExportBar";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
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
  portfolio: Portfolio;
  estimate: Estimate;
  points: ForecastPoint[];
  notice: string;
  busy: boolean;
  onShare: () => void;
}) {
  const { sentence, split } = yearCopy(annual, spreadPercent, cloudShare);
  const animated = useAnimatedNumber(annual);
  return (
    <div id="forecast" className="grid gap-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Next year</p>
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
        <div className="mt-1 text-sm text-muted-foreground" data-testid="bill-split">
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
          . First month {money(firstMonth, 0)}.
        </div>
      </div>
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
        </TabsContent>
        <TabsContent value="months">
          <MonthTable months={months} />
        </TabsContent>
      </Tabs>
      <div className="flex flex-wrap items-center gap-2 border-t pt-6">
        <Button type="button" onClick={onShare}>
          {notice || "Copy link"}
        </Button>
        <ExportBar portfolio={portfolio} estimate={estimate} points={points} />
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">
        Estimates only. Not a Databricks quote, and not affiliated with Databricks.
      </p>
    </div>
  );
}
