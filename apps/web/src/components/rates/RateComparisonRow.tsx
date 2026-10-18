import type { UnitCostRow } from "@cayfore/engine/unit-costs";
import { ArrowUpRight, Check, MapPin } from "lucide-react";
import { cn } from "../../lib/utils";
import { evidenceLabels, rowBasis, rowPrice } from "./rate-presentation";

export function RateComparisonRow({
  point,
  delta,
  onSelect,
}: {
  point: { row: UnitCostRow; barPercent: number; isSelected: boolean };
  delta: string;
  onSelect: (row: UnitCostRow) => void;
}) {
  const { row, barPercent, isSelected } = point;
  const width = barPercent === 0 ? 0 : Math.max(barPercent, 1.5);
  return (
    <li>
      <button
        type="button"
        aria-pressed={isSelected}
        onClick={() => onSelect(row)}
        className={cn(
          "w-full min-w-0 rounded-xl border px-3 py-3 text-left transition-colors hover:border-foreground/30",
          isSelected ? "border-primary bg-primary/5 shadow-[inset_3px_0_0_var(--primary)]" : "bg-background",
        )}
      >
        <span className="flex items-start justify-between gap-3">
          <span className="flex min-w-0 items-start gap-2">
            {isSelected ? (
              <Check className="mt-0.5 size-3.5 shrink-0 text-link" aria-hidden="true" />
            ) : (
              <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            )}
            <span className="min-w-0">
              <span className="block break-words text-sm font-medium">
                {row.regionLabel ?? row.region ?? "Not region-specific"}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{evidenceLabels[row.evidenceLevel]}</span>
            </span>
          </span>
          <span className="shrink-0 text-right">
            <span className="block font-mono text-sm font-medium tabular-nums">
              {rowPrice(row)}
              <span className="sr-only"> per {rowBasis(row)}</span>
            </span>
            {delta && <span className="mt-0.5 block text-xs text-muted-foreground">{delta}</span>}
          </span>
        </span>
        <span className="mt-2.5 block h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <span className="block h-full rounded-full bg-[var(--chart-actual)]" style={{ width: `${width}%` }} />
        </span>
        <span className="mt-2 flex justify-end">
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium",
              isSelected ? "text-muted-foreground" : "text-link",
            )}
          >
            {isSelected ? "Selected region" : "Inspect source"}
            {!isSelected && <ArrowUpRight className="size-3" aria-hidden="true" />}
          </span>
        </span>
      </button>
    </li>
  );
}
