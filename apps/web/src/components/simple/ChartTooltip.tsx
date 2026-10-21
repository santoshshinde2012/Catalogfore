import { money } from "../../format";
import type { ChartRow } from "../../lib/chart-data";

export function ChartTooltip({
  active,
  payload,
  serviceLabel = "Databricks",
  comparisonLabel = "Saved scenario",
}: {
  serviceLabel?: string;
  comparisonLabel?: string;
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: ChartRow }>;
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="max-w-[min(20rem,calc(100vw-2rem))] rounded-lg border bg-popover px-3 py-2 text-xs break-words shadow-md">
      <p className="font-semibold">{row.label}</p>
      {row.actual != null && <p className="mt-1 tabular-nums">Imported spend {money(row.actual, 2)}</p>}
      {row.expected != null && <p className="mt-1 tabular-nums">Forecast {money(row.expected, 2)}</p>}
      {row.band && (
        <p className="tabular-nums text-muted-foreground">
          Planning range {money(row.band[0], 0)}–{money(row.band[1], 0)}
        </p>
      )}
      {row.comparison != null && (
        <p className="tabular-nums">
          {comparisonLabel} {money(row.comparison, 2)}
        </p>
      )}
      {row.budget != null && <p className="tabular-nums">Budget {money(row.budget, 2)}</p>}
      {row.dbuCost != null && (
        <p className="tabular-nums">
          {serviceLabel} {money(row.dbuCost, 2)}
        </p>
      )}
      {row.cloudCost != null && <p className="tabular-nums">Cloud machines {money(row.cloudCost, 2)}</p>}
      {row.addonCost != null && <p className="tabular-nums">Add-ons {money(row.addonCost, 2)}</p>}
    </div>
  );
}
