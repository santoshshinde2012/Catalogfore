import { buildUnitCostBreakdown, type UnitCostRow } from "@cayfore/engine/unit-costs";
import { ArrowDown, Route } from "lucide-react";
import { evidenceLabels, unitMoney } from "./rate-presentation";

export function RateBuildUp({ row }: { row: UnitCostRow }) {
  const breakdown = buildUnitCostBreakdown(row);
  return (
    <section aria-label="Unit cost calculation path" className="mt-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Route className="size-4 text-link" aria-hidden="true" />
        From source to unit cost
      </h3>
      {breakdown.steps.length > 0 && (
        <ol className="mt-3 grid gap-1.5">
          {breakdown.steps.map((step, index) => (
            <li key={step.id}>
              {index > 0 && <ArrowDown className="mx-auto mb-1.5 size-3.5 text-muted-foreground" aria-hidden="true" />}
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-[11px] font-medium text-muted-foreground">{step.label}</p>
                <p className="mt-1 break-words font-mono text-sm font-medium tabular-nums">
                  {step.kind === "money"
                    ? unitMoney(step.value)
                    : step.value.toLocaleString("en-US", { maximumFractionDigits: 12 })}
                  {step.unit && (
                    <span className="ml-1 font-sans text-xs font-normal text-muted-foreground">
                      {step.kind === "money" ? step.unit.replace(/^USD\s*/, "") : step.unit}
                    </span>
                  )}
                </p>
                {step.id === "result" && (
                  <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                    {evidenceLabels[row.evidenceLevel]}
                  </p>
                )}
                {step.id !== "result" && step.sources.length > 0 && (
                  <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                    Input evidence: {[...new Set(step.sources.map((source) => source.publisher))].join(" · ")}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{breakdown.reason ?? breakdown.explanation}</p>
      <details className="mt-3 rounded-lg border bg-background p-3">
        <summary className="cursor-pointer text-xs font-medium">Formula and billing rule</summary>
        <p className="mt-2 break-words font-mono text-xs leading-relaxed">{row.formula}</p>
      </details>
    </section>
  );
}
