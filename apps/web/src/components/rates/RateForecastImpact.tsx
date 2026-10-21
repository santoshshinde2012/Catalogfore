import type { PlanQuantityPreview } from "@cayfore/engine/unit-costs";

const money = (amount: number) =>
  amount.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export function RateForecastImpact({ preview }: { preview: PlanQuantityPreview }) {
  return (
    <section aria-label="Forecast impact" className="mt-4 rounded-lg border bg-card p-3">
      <h4 className="text-sm font-semibold">Preview your forecast</h4>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {preview.hasUnpriced ? "Known subtotal; unresolved charges remain excluded." : "Whole-plan estimate in USD."}{" "}
        Includes your discounts, growth or fitted trend, and dated changes.
      </p>
      <dl className="mt-3 grid gap-3 text-xs">
        <Impact
          label="First forecast month"
          current={preview.currentMonthly}
          proposed={preview.proposedMonthly}
          testId="rate-proposed-monthly"
        />
        <Impact
          label="First 12 months"
          current={preview.currentAnnual}
          proposed={preview.proposedAnnual}
          testId="rate-proposed-annual"
        />
      </dl>
      <p className="mt-3 border-t pt-2 text-sm font-medium tabular-nums" aria-live="polite">
        {preview.annualDelta === 0
          ? "No change to the 12-month estimate"
          : `${money(Math.abs(preview.annualDelta))} ${preview.annualDelta > 0 ? "increase" : "decrease"} over 12 months`}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Preview only until you apply. Other workloads and your budget are preserved. Separate infrastructure and service
        charges still need their own workloads.
      </p>
    </section>
  );
}

function Impact({
  label,
  current,
  proposed,
  testId,
}: {
  label: string;
  current: number;
  proposed: number;
  testId: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="flex flex-wrap gap-x-2 tabular-nums">
        <span>
          <span className="sr-only">Current: </span>
          {money(current)}
        </span>
        <span aria-hidden="true">→</span>
        <strong data-testid={testId} data-value={proposed}>
          <span className="sr-only">After applying: </span>
          {money(proposed)}
        </strong>
      </dd>
    </div>
  );
}
