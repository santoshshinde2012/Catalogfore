import { simulateCommitment, type PortfolioProjection } from "@cayfore/engine";
import { useMemo, useState } from "react";
import { money } from "../../format";
import { periodLabel } from "../../lib/chart-data";
import { Input } from "../ui/input";

export function CommitmentPlanner({ projection }: { projection: PortfolioProjection }) {
  const [faceValue, setFaceValue] = useState("");
  const [eligible, setEligible] = useState("");
  const [discount, setDiscount] = useState("25");
  const result = useMemo(() => {
    const allowance = Number(faceValue);
    const monthly = Number(eligible);
    const rate = Number(discount) / 100;
    if (
      !faceValue.trim() ||
      !eligible.trim() ||
      !discount.trim() ||
      !Number.isFinite(allowance) ||
      !Number.isFinite(monthly) ||
      !Number.isFinite(rate) ||
      allowance < 0 ||
      monthly < 0 ||
      rate < 0 ||
      rate >= 1
    )
      return null;
    const first = projection.points[0]?.dbuCost ?? 0;
    const costs = projection.points
      .slice(0, 12)
      .map((point) => monthly * (first > 0 ? Math.max(0, point.dbuCost) / first : 1));
    return simulateCommitment(costs, allowance, rate);
  }, [projection.points, faceValue, eligible, discount]);
  return (
    <details className="min-w-0 rounded-xl border bg-background p-4 sm:p-5">
      <summary className="min-h-7 cursor-pointer text-sm font-semibold">Commitment break-even what-if</summary>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Enter a USD allowance at list value and the eligible list spend from your contract. Eligible spend follows the
        monthly profile of this forecast. This separate what-if includes unused prepaid value and pay-as-you-go overage;
        it does not change the main plan.
      </p>
      <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-3">
        <label className="field min-w-0">
          12-month list-value allowance (USD)
          <Input
            type="number"
            min={0}
            step={0.01}
            placeholder="e.g. 120000"
            value={faceValue}
            onChange={(event) => setFaceValue(event.target.value)}
          />
        </label>
        <label className="field min-w-0">
          First-month eligible list spend (USD)
          <Input
            type="number"
            min={0}
            step={0.01}
            placeholder="e.g. 10000"
            value={eligible}
            onChange={(event) => setEligible(event.target.value)}
          />
        </label>
        <label className="field min-w-0">
          Purchase discount (%)
          <Input
            type="number"
            min={0}
            max={99.99}
            step={0.01}
            value={discount}
            onChange={(event) => setDiscount(event.target.value)}
          />
        </label>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        No DBCU conversion, rollover, tax, or cancellation terms are inferred. Enter list spend explicitly; billed or
        effective net cost is not an eligible list-spend measure.
      </p>
      {!result && (
        <p role="status" className="mt-4 rounded-lg bg-muted/60 p-3 text-sm leading-relaxed text-muted-foreground">
          {faceValue.trim() && eligible.trim()
            ? "Use non-negative USD amounts and a discount from 0% to below 100%."
            : "Enter an allowance and eligible monthly spend to compare the commitment with pay as you go."}
        </p>
      )}
      {result && (
        <>
          <div
            className={`mt-4 rounded-lg border p-4 ${result.savings < 0 ? "border-destructive/25 bg-destructive/5" : "bg-primary/5"}`}
            role="status"
          >
            <p className="text-sm font-semibold">
              {result.savings === 0
                ? "Same estimated cost as pay as you go"
                : `${money(Math.abs(result.savings), 2)} ${result.savings > 0 ? "estimated saving" : "additional cost"} versus pay as you go`}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Total eligible cost {money(result.totalCost, 2)} versus {money(result.payAsYouGo, 2)} PAYG. Break-even
              requires consuming {money(result.breakEvenConsumption, 2)} of eligible list value.
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Prepaid purchase" value={result.purchaseCost} />
            <Metric label="PAYG overage" value={result.overage} />
            <Metric label="Unused allowance" value={result.unused} />
            <Metric
              label={result.savings >= 0 ? "Estimated saving" : "Additional cost"}
              value={Math.abs(result.savings)}
            />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {result.faceValue === 0
              ? "There is no prepaid allowance; eligible consumption remains pay as you go."
              : result.exhaustedMonth
                ? `The allowance is exhausted in ${forecastMonth(projection, result.exhaustedMonth)}.`
                : " The allowance is not exhausted within the year."}
            {(projection.points[0]?.dbuCost ?? 0) <= 0 &&
              " With no positive first-month DBU cost, eligible spend is spread equally across the year."}
          </p>
          <details className="mt-4 border-t pt-3">
            <summary className="min-h-7 cursor-pointer text-sm font-medium">Monthly allowance drawdown</summary>
            <div
              className="mt-3 overflow-x-auto rounded-lg border"
              role="region"
              aria-label="Monthly commitment allowance"
              tabIndex={0}
            >
              <table className="w-full min-w-[420px] text-right text-xs tabular-nums">
                <caption className="sr-only">
                  Eligible spend, pay-as-you-go overage, and remaining list-value allowance by forecast month, in USD.
                </caption>
                <thead className="bg-muted/60 text-muted-foreground">
                  <tr>
                    <th scope="col" className="p-3 text-left font-medium">
                      Month
                    </th>
                    <th scope="col" className="p-3 font-medium">
                      Eligible spend
                    </th>
                    <th scope="col" className="p-3 font-medium">
                      PAYG overage
                    </th>
                    <th scope="col" className="p-3 font-medium">
                      Remaining
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.months.map((month) => (
                    <tr key={month.month} className="border-t">
                      <th scope="row" className="whitespace-nowrap p-3 text-left font-medium">
                        {forecastMonth(projection, month.month)}
                      </th>
                      <td className="p-3">{money(month.eligibleListCost, 2)}</td>
                      <td className="p-3">{money(month.overage, 2)}</td>
                      <td className="p-3">{money(month.remaining, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </details>
  );
}

function forecastMonth(projection: PortfolioProjection, month: number) {
  const period = projection.points[month - 1]?.period;
  return period ? periodLabel(period) : `month ${month}`;
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums">{money(value, 0)}</p>
    </div>
  );
}
