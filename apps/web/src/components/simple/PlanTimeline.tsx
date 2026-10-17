import { uid, type PlanningEvent, type Portfolio } from "@cayfore/engine";
import { useRef, useState } from "react";
import { periodAt, periodLabel } from "../../lib/chart-data";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export function PlanTimeline({
  portfolio,
  startMonth,
  onChange,
}: {
  portfolio: Portfolio;
  startMonth: string;
  onChange: (portfolio: Portfolio) => void;
}) {
  const [name, setName] = useState("");
  const [month, setMonth] = useState(startMonth);
  const [change, setChange] = useState("20");
  const [target, setTarget] = useState("");
  const [feedback, setFeedback] = useState("");
  const nameInput = useRef<HTMLInputElement>(null);
  const events = portfolio.events ?? [];
  const selectedTarget = portfolio.workloads.some((workload) => workload.id === target) ? target : "";
  const percent = Number(change);
  const effectiveMonth = month < startMonth ? startMonth : month;
  const valid =
    name.trim() &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(effectiveMonth) &&
    change.trim() &&
    Number.isFinite(percent) &&
    percent >= -100 &&
    percent <= 1000 &&
    portfolio.workloads.length > 0;
  function add() {
    if (!valid) return;
    const event: PlanningEvent = {
      id: uid(),
      name: name.trim(),
      month: effectiveMonth,
      usageMultiplier: 1 + percent / 100,
      ...(selectedTarget ? { workloadId: selectedTarget } : {}),
    };
    onChange({ ...portfolio, events: [...events, event] });
    setFeedback(`Added ${event.name}, effective ${periodLabel(event.month)}.`);
    setName("");
    nameInput.current?.focus();
  }
  return (
    <details className="min-w-0 rounded-xl border bg-background p-4">
      <summary className="min-h-7 cursor-pointer text-sm font-semibold">
        <span>Plan launches and usage changes</span>
        {events.length > 0 && (
          <span className="ml-2 text-xs font-normal text-muted-foreground">{events.length} planned</span>
        )}
      </summary>
      <p className="mt-3 text-xs text-muted-foreground">
        Each change starts in its selected month and continues afterward. Changes to the same workload multiply
        together. Use −100% to retire a workload.
      </p>
      {events.length === 0 && (
        <p className="mt-3 rounded-lg bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
          No planned changes yet. Add a launch, expansion, or retirement to see when it affects your forecast.
        </p>
      )}
      <form
        className="mt-4 grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          add();
        }}
      >
        <label className="field">
          Change name
          <Input
            ref={nameInput}
            value={name}
            required
            maxLength={80}
            placeholder="e.g. Launch new pipeline"
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <label className="field min-w-0">
            Effective month
            <Input
              type="month"
              required
              min={startMonth}
              value={effectiveMonth}
              onChange={(event) => setMonth(event.target.value)}
            />
          </label>
          <label className="field min-w-0">
            Usage change (%)
            <Input
              type="number"
              required
              min={-100}
              max={1000}
              step={1}
              value={change}
              onChange={(event) => setChange(event.target.value)}
            />
          </label>
        </div>
        <label className="field">
          Applies to
          <select value={selectedTarget} onChange={(event) => setTarget(event.target.value)}>
            <option value="">All workloads</option>
            {portfolio.workloads.map((workload) => (
              <option key={workload.id} value={workload.id}>
                {workload.name}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" className="min-h-11" variant="outline" disabled={!valid}>
          Add planned change
        </Button>
      </form>
      {portfolio.workloads.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">Add a workload before scheduling a usage change.</p>
      )}
      {feedback && (
        <p role="status" className="mt-3 text-xs text-muted-foreground">
          {feedback}
        </p>
      )}
      <ul className="mt-4 grid gap-2">
        {[...events]
          .sort((left, right) => left.month.localeCompare(right.month))
          .map((event) => (
            <li key={event.id} className="flex items-start justify-between gap-3 border-t pt-3 text-sm">
              <span className="min-w-0 break-words pt-2 font-medium">
                {event.name}
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  {periodLabel(event.month)} ·{" "}
                  {event.usageMultiplier === 0
                    ? "Retire"
                    : `${event.usageMultiplier > 1 ? "+" : ""}${Math.round((event.usageMultiplier - 1) * 100)}%`}{" "}
                  · {portfolio.workloads.find((workload) => workload.id === event.workloadId)?.name ?? "All workloads"}
                </span>
                {event.month > periodAt(startMonth, 11) && (
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                    Begins after this 12-month forecast.
                  </span>
                )}
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="min-h-11 shrink-0"
                aria-label={`Remove ${event.name}`}
                onClick={() => {
                  onChange({ ...portfolio, events: events.filter((item) => item.id !== event.id) });
                  setFeedback(`Removed ${event.name}.`);
                  nameInput.current?.focus();
                }}
              >
                Remove
              </Button>
            </li>
          ))}
      </ul>
    </details>
  );
}
