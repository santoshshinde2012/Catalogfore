import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { money } from "../../format";

export function MixPie({ workloads }: { workloads: { name: string; value: number; fill: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={workloads}
          dataKey="value"
          nameKey="name"
          innerRadius={42}
          outerRadius={62}
          paddingAngle={2}
          stroke="none"
          isAnimationActive={false}
        >
          {workloads.map((row) => (
            <Cell key={row.name} fill={row.fill} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            const row = payload?.[0]?.payload as { name?: string; value?: number } | undefined;
            if (!active || !row) return null;
            return (
              <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                <p className="font-medium">{row.name}</p>
                <p className="tabular-nums">{money(row.value ?? 0, 0)} this month</p>
              </div>
            );
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
