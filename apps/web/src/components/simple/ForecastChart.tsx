import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { axisMoney, cumulativeRows, monthlyRows, type ChartSeries } from "../../lib/chart-data";
import { ChartTooltip } from "./ChartTooltip";

export function ForecastChart({
  label,
  cumulative = false,
  ...series
}: ChartSeries & { label: string; cumulative?: boolean }) {
  const data = cumulative ? cumulativeRows(series) : monthlyRows(series);
  return (
    <div className="h-72 w-full min-w-0" role="group" aria-label={label} data-testid="forecast-chart">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <ComposedChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }} accessibilityLayer>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            minTickGap={24}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={58}
            tickFormatter={axisMoney}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            dataKey="band"
            name="Planning range"
            stroke="none"
            fill="var(--lava)"
            fillOpacity={0.13}
            isAnimationActive={false}
            connectNulls={false}
          />
          <Line
            dataKey="actual"
            name="Imported spend"
            stroke="var(--chart-actual)"
            strokeWidth={2.5}
            dot={{ r: 3 }}
            isAnimationActive={false}
            connectNulls={false}
          />
          <Line
            dataKey="expected"
            name="Forecast"
            stroke="var(--foreground)"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            isAnimationActive={false}
            connectNulls={false}
          />
          <Line
            dataKey="budget"
            name="Budget"
            stroke="var(--chart-budget)"
            strokeWidth={1.5}
            strokeDasharray="3 3"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="comparison"
            name={series.comparison?.name ?? "Saved scenario"}
            stroke="var(--chart-comparison)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
