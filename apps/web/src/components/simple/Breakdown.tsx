import type { Estimate } from "@cayfore/engine";
import { useEffect, useState } from "react";
import { money } from "../../format";
import type { MixPie as MixPieComponent } from "./MixPie";

const FILLS: Record<string, string> = {
  "mix-etl": "#ff3621",
  "mix-sql": "#146c43",
  "mix-ml": "#b45309",
};

export function Breakdown({ estimate }: { estimate: Estimate }) {
  const workloads = estimate.lines
    .filter((line) => line.total > 0)
    .map((line) => ({
      name: line.name,
      value: line.total,
      fill: FILLS[line.workloadId] ?? "var(--foreground)",
    }));
  const parts = [
    { label: "Databricks usage", value: estimate.dbuCost, className: "bg-foreground" },
    { label: "Cloud machines", value: estimate.cloudCost, className: "bg-lava" },
    ...(estimate.addonCost > 0
      ? [{ label: "Add-ons", value: estimate.addonCost, className: "bg-muted-foreground" }]
      : []),
  ].filter((part) => part.value > 0);
  const partSum = parts.reduce((sum, part) => sum + part.value, 0);
  const summary = workloads.map((row) => `${row.name} ${money(row.value, 0)}`).join(", ");
  const [PieView, setPieView] = useState<typeof MixPieComponent | null>(null);
  useEffect(() => {
    let live = true;
    void import("./MixPie").then((module) => {
      if (live) setPieView(() => module.MixPie);
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className="grid gap-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center">
      <div className="h-36" role="img" aria-label={summary || "No workload split yet"}>
        {PieView && workloads.length > 0 ? <PieView workloads={workloads} /> : null}
      </div>
      <div className="grid gap-3">
        <ul className="grid gap-1.5 text-sm">
          {workloads.map((row) => (
            <li key={row.name} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: row.fill }} />
                {row.name}
              </span>
              <span className="tabular-nums text-muted-foreground">{money(row.value, 0)}</span>
            </li>
          ))}
        </ul>
        {partSum > 0 && (
          <div>
            <div className="flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              {parts.map((part) => (
                <span
                  key={part.label}
                  className={part.className}
                  style={{ width: `${(part.value / partSum) * 100}%` }}
                />
              ))}
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {parts.map((part) => (
                <li key={part.label} className="flex items-center gap-1.5">
                  <span className={`size-2 rounded-full ${part.className}`} />
                  {part.label} {money(part.value, 0)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
