import type { ForecastPoint } from "@cayfore/engine";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { axisMoney, compositionRows } from "../../lib/chart-data";
import { ChartTooltip } from "./ChartTooltip";

export function CompositionChart({
  points,
  startMonth,
  serviceLabel,
}: {
  points: ForecastPoint[];
  startMonth: string;
  serviceLabel: string;
}) {
  return (
    <div
      className="h-72 w-full min-w-0"
      role="group"
      aria-label={`Monthly forecast split into ${serviceLabel}, cloud machines, and add-ons`}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart
          stackOffset="sign"
          data={compositionRows(points, startMonth)}
          margin={{ top: 12, right: 8, left: 0, bottom: 0 }}
          accessibilityLayer
        >
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            minTickGap={24}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          />
          <YAxis
            width={58}
            tickFormatter={axisMoney}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          />
          <Tooltip content={<ChartTooltip serviceLabel={serviceLabel} />} />
          <Bar
            dataKey="dbuCost"
            name={serviceLabel}
            stackId="cost"
            fill="var(--foreground)"
            isAnimationActive={false}
          />
          <Bar dataKey="cloudCost" name="Cloud machines" stackId="cost" fill="var(--lava)" isAnimationActive={false} />
          <Bar
            dataKey="addonCost"
            name="Add-ons"
            stackId="cost"
            fill="var(--chart-comparison)"
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
