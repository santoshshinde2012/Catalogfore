import type { SimpleMonth } from "@dcf/engine";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { money } from "../../format";
import { usePrefersReducedMotion } from "../../lib/use-animated-number";

interface ChartRow {
  month: number;
  low: number;
  span: number;
  expected: number;
  high: number;
}

export function ForecastChart({ months, label }: { months: SimpleMonth[]; label: string }) {
  const reduceMotion = usePrefersReducedMotion();
  const data: ChartRow[] = months.map((month) => ({
    month: month.month,
    low: month.low,
    span: Math.max(0, month.high - month.low),
    expected: month.expected,
    high: month.high,
  }));

  return (
    <div className="h-64 w-full" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickFormatter={(value: number) => `M${value}`}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={52}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickFormatter={(value: number) => axisMoney(value)}
          />
          <Tooltip content={<BandTip />} />
          <Area
            dataKey="low"
            stackId="band"
            stroke="none"
            fill="transparent"
            isAnimationActive={!reduceMotion}
            animationDuration={500}
          />
          <Area
            dataKey="span"
            stackId="band"
            stroke="none"
            fill="var(--lava)"
            fillOpacity={0.18}
            isAnimationActive={!reduceMotion}
            animationDuration={500}
          />
          <Line
            dataKey="expected"
            stroke="var(--foreground)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={!reduceMotion}
            animationDuration={500}
            type="monotone"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function BandTip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: ChartRow }> }) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium">Month {row.month}</p>
      <p className="mt-1 tabular-nums text-muted-foreground">Low {money(row.low, 0)}</p>
      <p className="tabular-nums">Expected {money(row.expected, 0)}</p>
      <p className="tabular-nums text-muted-foreground">High {money(row.high, 0)}</p>
    </div>
  );
}

function axisMoney(value: number): string {
  if (value >= 1_000_000) return `$${Math.round(value / 100_000) / 10}m`;
  if (value >= 1000) return `$${Math.round(value / 100) / 10}k`;
  return `$${Math.round(value)}`;
}
