import { summarizeUnitCostEvidence, type UnitCostRow } from "@cayfore/engine/unit-costs";
import { BookOpen, ShieldCheck } from "lucide-react";
import { evidenceLabels } from "./rate-presentation";

export function RateEvidenceOverview({ rows }: { rows: UnitCostRow[] }) {
  const coverage = summarizeUnitCostEvidence(rows);
  return (
    <section aria-label="Evidence coverage" className="rounded-2xl border bg-card p-4 sm:p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <ShieldCheck className="size-4 text-link" aria-hidden="true" />
        Understand the evidence behind these rates
      </h2>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Counts describe the current filtered rows. A price does not confirm product availability in your region.
      </p>
      {coverage.total > 0 && (
        <div className="mt-4 flex h-4 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          {coverage.buckets.map(({ level, percent }) => (
            <span key={level} className={coverageColors[level]} style={{ width: `${percent}%` }} />
          ))}
        </div>
      )}
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {coverage.total.toLocaleString("en-US")} filtered rows · Evidence coverage, not a breakdown of spending.
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {coverage.buckets.map(({ level, count, percent }) => (
          <div key={level} className="flex min-w-0 flex-col rounded-xl border bg-muted/20 p-3">
            <dt className="order-2 mt-1 text-[11px] leading-relaxed text-muted-foreground">{evidenceLabels[level]}</dt>
            <dd className="order-1 text-xl font-semibold tabular-nums">
              <span className="flex items-center gap-2">
                <span className={`size-2.5 shrink-0 rounded-full ${coverageColors[level]}`} aria-hidden="true" />
                {count.toLocaleString("en-US")}
              </span>
              <span className="mt-1 block text-[10px] font-normal text-muted-foreground">
                {percent.toLocaleString("en-US", { maximumFractionDigits: 1 })}% of rows
              </span>
            </dd>
          </div>
        ))}
      </dl>
      <details className="mt-4 border-t pt-3">
        <summary className="cursor-pointer text-xs font-semibold">
          <BookOpen className="mr-2 inline size-3.5 align-text-bottom" aria-hidden="true" />
          How to read the sources
        </summary>
        <div className="mt-3 grid gap-3 text-xs leading-relaxed text-muted-foreground sm:grid-cols-2">
          <p>
            <strong className="font-medium text-foreground">Official list price</strong> means a first-party numeric
            price matches the billing dimension. <strong className="font-medium text-foreground">Derived</strong>{" "}
            applies published consumption rules or eligible conditions. A monetary value combines those rules with
            first-party prices.
          </p>
          <p>
            <strong className="font-medium text-foreground">Planning estimate</strong> includes assumptions, regional
            proxies, seeded values, and third-party references. An official documentation link can explain a service
            without establishing its numeric price.
          </p>
          <p>
            <strong className="font-medium text-foreground">Unresolved</strong> means a price is missing or sources
            conflict. <strong className="font-medium text-foreground">Platform context</strong> explains a service with
            no standalone rate in this catalog; underlying workloads can still incur charges.
          </p>
          <p>
            <strong className="font-medium text-foreground">Observation and review dates are separate.</strong> A
            reviewed website does not refresh the stored price snapshot. Public list prices can differ from your
            contract, invoice, taxes, and separately billed components.
          </p>
        </div>
      </details>
    </section>
  );
}

const coverageColors: Record<UnitCostRow["evidenceLevel"], string> = {
  official: "bg-[var(--chart-actual)]",
  derived: "bg-[var(--chart-comparison)]",
  estimate: "bg-[var(--chart-budget)]",
  unresolved: "bg-muted-foreground",
  not_applicable: "bg-foreground/30",
};
