import type { SimpleSession } from "../../hooks/useSimpleForecast";
import { useState } from "react";
import { money } from "../../format";
import { budgetPosition, periodAt, periodLabel } from "../../lib/chart-data";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { PlanTimeline } from "./PlanTimeline";
import { ScenarioControls } from "./ScenarioControls";
import { CommitmentPlanner } from "./CommitmentPlanner";
import { PlanningNumberField } from "./PlanningNumberField";

export function BudgetScenarioPanel({ session }: { session: SimpleSession }) {
  const [dateNotice, setDateNotice] = useState("");
  const startMonth = session.points[0]?.period ?? session.estimate.verifiedOn.slice(0, 7);
  const budget = session.portfolio.budgetAnnual;
  const incomplete = session.forecastResult.hasUnpriced;
  const position = budget != null ? budgetPosition(session.months, budget) : null;
  return (
    <Card id="budget-planning" tabIndex={-1} className="min-w-0 p-4 sm:p-6" aria-labelledby="planning-heading">
      <h2 id="planning-heading" className="text-lg font-semibold">
        Budget and scenarios
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Set a spending target, schedule changes, and compare your options.
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="grid content-start gap-5">
          <div className="grid min-w-0 items-start gap-3 sm:grid-cols-2">
            <PlanningNumberField
              label="Annual budget (USD)"
              name="Annual budget"
              value={budget}
              source={session.portfolio}
              max={1e12}
              step={100}
              optional
              errorMessage="Enter an annual budget from $0 to $1,000,000,000,000, or leave it blank."
              help="For the 12 months shown in this forecast."
              onCommit={session.setBudget}
            />
            <label className="field min-w-0">
              Forecast starts
              <Input
                type="month"
                min="1900-01"
                max="2199-12"
                aria-label="Forecast start month"
                value={startMonth}
                onChange={(event) => {
                  if (/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(event.target.value)) {
                    const resetLegacyFit = session.setForecastStart(event.target.value);
                    setDateNotice(
                      resetLegacyFit
                        ? "This older fitted plan has no calendar origin. The new start date uses your configured growth rate."
                        : "",
                    );
                  }
                }}
              />
            </label>
          </div>
          {dateNotice && (
            <p className="text-xs text-muted-foreground" role="status">
              {dateNotice}
            </p>
          )}
          {position ? (
            <div
              className={`rounded-lg border p-4 text-sm ${position.delta > 0 ? "border-destructive/25 bg-destructive/5" : "bg-muted/50"}`}
              role="status"
              data-testid="budget-variance"
            >
              <p className="font-semibold">
                {incomplete
                  ? position.delta > 0
                    ? `${money(position.delta, 0)} over the annual budget in known costs alone`
                    : "Budget headroom is not yet confirmed"
                  : position.delta === 0
                    ? "On the annual budget"
                    : `${money(Math.abs(position.delta), 0)} ${position.delta > 0 ? "over" : "under"} the annual budget`}
              </p>
              {incomplete && (
                <p className="mt-2 leading-relaxed text-muted-foreground">
                  Known subtotal: {money(position.forecast, 0)} against {money(budget ?? 0, 0)} budget. Unresolved
                  prices are excluded; resolve them before relying on the budget comparison.
                </p>
              )}
              {(budget ?? 0) > 0 && position.forecast >= 0 && (
                <>
                  <div className="my-3 h-1.5 overflow-hidden rounded-full bg-foreground/10" aria-hidden="true">
                    <div
                      className={`h-full rounded-full ${position.delta > 0 ? "bg-destructive" : "bg-primary"}`}
                      style={{ width: `${Math.min(100, (position.forecast / (budget ?? 1)) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {Math.round((position.forecast / (budget ?? 1)) * 100)}% of your annual budget{" "}
                    {incomplete ? "covered by known forecast costs." : "forecast to be used."}
                  </p>
                </>
              )}
              <p className="mt-2 leading-relaxed text-muted-foreground">
                Budget is spread equally across 12 months: {money((budget ?? 0) / 12, 0)} per month.
                {position.firstOver != null &&
                  ` Cumulative ${incomplete ? "known costs" : "forecast"} first exceed${incomplete ? "" : "s"} that schedule in ${periodLabel(periodAt(startMonth, position.firstOver - 1))}.`}
              </p>
            </div>
          ) : (
            <p className="rounded-lg bg-muted/50 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
              Add a budget to see forecast headroom and the first month spending could exceed your budget schedule.
            </p>
          )}
          <PlanningNumberField
            label="Cloud machine discount (%)"
            name="Cloud machine discount"
            value={Math.round(session.portfolio.commitment.cloudDiscount * 10000) / 100}
            source={session.portfolio}
            max={95}
            step={0.01}
            errorMessage="Enter a cloud machine discount from 0% to 95%."
            help="A planning assumption on eligible on-demand machines. Spot machines keep their separate rate. This does not model a prepaid contract balance."
            onCommit={(value) => session.setCloudDiscount((value ?? 0) / 100)}
          />
          <PlanTimeline portfolio={session.portfolio} startMonth={startMonth} onChange={session.setEvents} />
        </div>
        <ScenarioControls session={session} />
      </div>
      <div className="mt-6 border-t pt-6">
        <CommitmentPlanner projection={session.forecastResult} />
      </div>
    </Card>
  );
}
