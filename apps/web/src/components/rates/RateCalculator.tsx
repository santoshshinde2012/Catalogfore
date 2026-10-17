import { calculateUnitCost, type UnitCostRow } from "@cayfore/engine/unit-costs";
import { Calculator } from "lucide-react";
import { useState } from "react";
import { evidenceLabels, unitMoney } from "./rate-presentation";

export function RateCalculator({ row }: { row: UnitCostRow }) {
  const [quantity, setQuantity] = useState("100");
  const amount = Number(quantity);
  const calculation = calculateUnitCost(row, quantity.trim() === "" ? Number.NaN : amount);
  const usable = calculation.status !== "unavailable";
  const valid = calculation.status !== "invalid_quantity" && calculation.status !== "overflow";
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
          <input
            id="rate-quantity"
            className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
            type="number"
            min="0"
            max="1000000000000000"
            step="any"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            aria-invalid={!valid}
            aria-describedby="rate-quantity-help rate-calculation"
          />
          <p id="rate-quantity-help" className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Enter units after applicable allowances and consumption adjustments; this calculator multiplies an already
            billable quantity.
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
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            This component only, before contract discounts, add-ons, taxes, and other service charges. Your forecast
            stays unchanged.
          </p>
        </>
      ) : (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          A monetary rate is needed to calculate a cost. Consumption factors and allowances explain billing but cannot
          be treated as a dollar price.
        </p>
      )}
    </section>
  );
}
