import {
  calculateUnitCost,
  MAX_PLAN_QUANTITY,
  type PlanQuantity,
  type PlanQuantityPreview,
  type UnitCostRow,
} from "@cayfore/engine/unit-costs";
import { Calculator } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { evidenceLabels, unitMoney } from "./rate-presentation";
import { RateForecastImpact } from "./RateForecastImpact";

export function RateCalculator({
  row,
  usage,
  action,
  onApply,
  onPreview,
  unavailableReason,
  quantity: draftQuantity,
  onQuantity,
  feedback,
}: {
  row: UnitCostRow;
  usage?: PlanQuantity | null;
  action?: "update" | "add" | null;
  onApply?: (quantity: number) => void;
  onPreview?: (quantity: number) => PlanQuantityPreview | null;
  unavailableReason?: string | null;
  quantity?: string;
  onQuantity: (quantity: string) => void;
  feedback?: ReactNode;
}) {
  const quantity = draftQuantity ?? (usage ? String(usage.quantity) : "100");
  const amount = Number(quantity);
  const calculation = calculateUnitCost(row, quantity.trim() === "" ? Number.NaN : amount);
  const usable = calculation.status !== "unavailable";
  const valid = calculation.status === "calculated";
  const applyValid = valid && amount <= MAX_PLAN_QUANTITY;
  const preview = useMemo(
    () => (action && applyValid ? onPreview?.(amount) : null),
    [action, applyValid, amount, onPreview],
  );
  const cannotStore = !!action && applyValid && !preview;
  const unchanged = action === "update" && usage?.quantity === amount;
  const total = calculation.totalUsd;
  return (
    <section
      aria-label="Unit cost calculator"
      className="mt-4 rounded-xl border border-primary/20 bg-primary/[0.035] p-4"
    >
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Calculator className="size-4" aria-hidden="true" />
        Try a quantity
      </h3>
      {usable ? (
        <>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {unitMoney(calculation.unitRateUsd!)} / {row.unit} · {evidenceLabels[row.evidenceLevel]}
          </p>
          <label className="field mt-3" htmlFor="rate-quantity">
            Billable quantity ({row.unit})
          </label>
          <Input
            id="rate-quantity"
            className="mt-2"
            type="number"
            min="0"
            max="1000000000000000"
            step="any"
            value={quantity}
            onChange={(event) => onQuantity(event.target.value)}
            aria-invalid={!valid || (!!action && !applyValid) || cannotStore}
            aria-describedby="rate-quantity-help rate-calculation rate-plan-help"
          />
          <p id="rate-quantity-help" className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Enter units after applicable allowances and consumption adjustments; this calculator multiplies an already
            billable quantity.{" "}
            {action &&
              "For the forecast, this is your monthly baseline before growth, fitted trends, and dated plan changes."}
          </p>
          <p
            id="rate-calculation"
            className="mt-3 break-words rounded-lg border bg-card p-3 text-base font-medium tabular-nums"
            role="status"
          >
            {total !== null && Number.isFinite(total)
              ? `${amount.toLocaleString("en-US", { maximumFractionDigits: 10 })} × ${unitMoney(calculation.unitRateUsd!)} = ${unitMoney(total)}`
              : calculation.reason}
          </p>
          {preview && <RateForecastImpact preview={preview} />}
          <div className="mt-3 flex flex-wrap gap-2">
            {usage && (
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-11 max-w-full whitespace-normal py-2 text-left sm:min-h-9"
                onClick={() => onQuantity(String(usage.quantity))}
              >
                Use my usage ({usage.quantity.toLocaleString("en-US")} {usage.unit})
              </Button>
            )}
            {onApply && action && (
              <Button type="button" onClick={() => onApply(amount)} disabled={!applyValid || !preview || unchanged}>
                {action === "update" ? "Update forecast" : "Add to forecast"}
              </Button>
            )}
          </div>
          {feedback && <div className="mt-3">{feedback}</div>}
          <p id="rate-plan-help" className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {action && valid && !applyValid
              ? `Forecast quantities must be between 0 and ${MAX_PLAN_QUANTITY.toLocaleString("en-US")} per month. The component calculation above is for reference only.`
              : cannotStore
                ? "This quantity cannot be stored with this plan’s usage calibration. Reduce the monthly quantity or review the workload in Advanced."
                : (unavailableReason ?? calculatorNote(usage, action))}
            {unchanged && " Enter a different quantity to update the forecast."}
          </p>
        </>
      ) : (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {calculation.reason} Consumption factors and allowances explain billing but cannot be treated as a dollar
          price.
        </p>
      )}
      {!usable && feedback && <div className="mt-3">{feedback}</div>}
    </section>
  );
}

function calculatorNote(usage: PlanQuantity | null | undefined, action: "update" | "add" | null | undefined): string {
  if (action === "update")
    return `Update forecast sets the combined monthly quantity for ${usage?.workloadIds.length ?? 1} matching workload${usage?.workloadIds.length === 1 ? "" : "s"}${(usage?.workloadIds.length ?? 0) > 1 ? (usage?.quantity === 0 ? ", assigned to the first workload because all current quantities are zero" : ", shared in proportion to their current quantities") : ""}. The component subtotal above is before plan discounts.`;
  if (action === "add")
    return "Add to forecast creates one catalog-priced workload for this monthly DBU quantity in the selected cloud, region, and edition. The component subtotal above is before plan discounts.";
  if (usage)
    return "This quantity is already in your usage. The forecast keeps that exported cost instead of replacing it with this subtotal.";
  return "This component only, before contract discounts, add-ons, taxes, and other service charges. For schedules or other usage drivers, edit the product in Advanced.";
}
