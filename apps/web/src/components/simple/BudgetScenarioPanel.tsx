import type { SimpleSession } from "../../hooks/useSimpleForecast";
import { useState } from "react";
import { money } from "../../format";
import { budgetPosition, periodAt, periodLabel } from "../../lib/chart-data";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { PlanTimeline } from "./PlanTimeline";
import { ScenarioControls } from "./ScenarioControls";
import { CommitmentPlanner } from "./CommitmentPlanner";
import { planStartingIn } from "../../lib/forecast-start";

export function BudgetScenarioPanel({ session }: { session: SimpleSession }) {
  const [dateNotice, setDateNotice] = useState("");
  const startMonth = session.points[0]?.period ?? session.estimate.verifiedOn.slice(0, 7);
  const budget = session.portfolio.budgetAnnual;
  const position = budget != null ? budgetPosition(session.months, budget) : null;
  return (
    <Card className="min-w-0 p-4 sm:p-6" aria-labelledby="planning-heading">
      <h2 id="planning-heading" className="text-lg font-semibold">
        Budget and scenarios
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Set a spending target, schedule changes, and compare your options.
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="grid content-start gap-5">
          <div className="grid min-w-0 items-start gap-3 sm:grid-cols-2">
            <label className="field min-w-0">
              Annual budget (USD)
              <Input
                type="number"
                min={0}
                step={100}
                aria-label="Annual budget"
                placeholder="Optional"
                aria-describedby="annual-budget-help"
                value={budget ?? ""}
                onChange={(event) => {
                  const raw = event.target.value;
                  const amount = Number(raw);
                  if (raw === "") session.setBudget(undefined);
                  else if (Number.isFinite(amount) && amount >= 0) session.setBudget(amount);
                }}
              />
              <span id="annual-budget-help" className="text-xs font-normal text-muted-foreground">
                For the 12 months shown in this forecast.
              </span>
            </label>
            <label className="field min-w-0">
              Forecast starts
              <Input
                type="month"
                aria-label="Forecast start month"
                value={startMonth}
                onChange={(event) => {
                  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value)) {
                    const updated = planStartingIn(session.portfolio, event.target.value);
                    session.editPortfolio(updated.portfolio);
                    setDateNotice(
                      updated.resetLegacyFit
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
                {position.delta === 0
                  ? "On the annual budget"
                  : `${money(Math.abs(position.delta), 0)} ${position.delta > 0 ? "over" : "under"} the annual budget`}
              </p>
              {(budget ?? 0) > 0 && position.forecast >= 0 && (
                <>
                  <div className="my-3 h-1.5 overflow-hidden rounded-full bg-foreground/10" aria-hidden="true">
                    <div
                      className={`h-full rounded-full ${position.delta > 0 ? "bg-destructive" : "bg-primary"}`}
                      style={{ width: `${Math.min(100, (position.forecast / (budget ?? 1)) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {Math.round((position.forecast / (budget ?? 1)) * 100)}% of your annual budget forecast to be used.
                  </p>
                </>
              )}
              <p className="mt-2 leading-relaxed text-muted-foreground">
                Budget is spread equally across 12 months: {money((budget ?? 0) / 12, 0)} per month.
                {position.firstOver != null &&
                  ` Cumulative forecast first exceeds that schedule in ${periodLabel(periodAt(startMonth, position.firstOver - 1))}.`}
              </p>
            </div>
          ) : (
            <p className="rounded-lg bg-muted/50 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
              Add a budget to see forecast headroom and the first month spending could exceed your budget schedule.
            </p>
          )}
          <label className="field">
            Cloud machine discount (%)
            <Input
              type="number"
              min={0}
              max={95}
              step={1}
              aria-label="Cloud machine discount"
              aria-describedby="cloud-discount-help"
              value={Math.round(session.portfolio.commitment.cloudDiscount * 100)}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (Number.isFinite(value) && value >= 0 && value <= 95) session.setCloudDiscount(value / 100);
              }}
            />
          </label>
          <p id="cloud-discount-help" className="-mt-3 text-xs leading-relaxed text-muted-foreground">
            A planning assumption on eligible on-demand machines. Spot machines keep their separate rate. This does not
            model a prepaid contract balance.
          </p>
          <PlanTimeline portfolio={session.portfolio} startMonth={startMonth} onChange={session.editPortfolio} />
        </div>
        <ScenarioControls session={session} />
      </div>
      <div className="mt-6 border-t pt-6">
        <CommitmentPlanner projection={session.forecastResult} />
      </div>
    </Card>
  );
}
