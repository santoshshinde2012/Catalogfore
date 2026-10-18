import { Bookmark } from "lucide-react";
import { useRef, useState } from "react";
import type { SimpleSession } from "../../hooks/useSimpleForecast";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { OptionSelect } from "../ui/option-select";

export function ScenarioControls({ session }: { session: SimpleSession }) {
  const [name, setName] = useState("");
  const [feedback, setFeedback] = useState("");
  const nameInput = useRef<HTMLInputElement>(null);
  const atCapacity = session.scenarios.length >= 20;
  return (
    <section className="min-w-0 self-start rounded-xl border bg-muted/20 p-4 sm:p-5" aria-labelledby="scenario-heading">
      <div className="flex items-center justify-between gap-3">
        <h3 id="scenario-heading" className="text-sm font-semibold">
          Saved scenarios
        </h3>
        <span className="text-xs tabular-nums text-muted-foreground">{session.scenarios.length} / 20 saved</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Save a baseline, change the plan, then compare. Saved scenarios stay in this browser.
      </p>
      <form
        className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim() && !atCapacity) {
            session.saveScenario(name.trim());
            setFeedback(`Saved ${name.trim()}. Select it below to compare with your current plan.`);
            setName("");
            nameInput.current?.focus();
          }
        }}
      >
        <label className="field min-w-0">
          Scenario name
          <Input
            aria-label="Scenario name"
            ref={nameInput}
            maxLength={80}
            placeholder="e.g. Current plan"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <Button type="submit" variant="outline" className="min-h-11 self-end" disabled={!name.trim() || atCapacity}>
          Save scenario
        </Button>
      </form>
      {atCapacity && <p className="mt-2 text-xs text-muted-foreground">Remove a scenario to save another.</p>}
      {feedback && (
        <p role="status" className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {feedback}
        </p>
      )}
      {session.scenarios.length > 0 && (
        <OptionSelect
          className="mt-5"
          tone="field"
          label="Compare current plan with"
          name="Compare scenario"
          value={session.comparison?.id ?? ""}
          onValueChange={(id) => {
            session.compareScenario(id || null);
            setFeedback(id ? "Comparison added to the forecast charts." : "Comparison removed.");
          }}
          options={[
            { value: "", label: "No comparison" },
            ...session.scenarios.map((scenario) => ({ value: scenario.id, label: scenario.name })),
          ]}
          searchable={false}
        />
      )}
      {session.scenarios.length === 0 && (
        <div className="mt-4 rounded-lg border border-dashed bg-background/60 px-4 py-6 text-center">
          <Bookmark className="mx-auto mb-2 size-5 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium">Keep a starting point</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Save this plan before exploring growth, budgets, or usage changes.
          </p>
        </div>
      )}
      <ul className="mt-3 grid gap-2">
        {session.scenarios.map((scenario) => (
          <li key={scenario.id} className="min-w-0 rounded-lg border bg-background p-3">
            <div className="flex items-start justify-between gap-2">
              <span className="min-w-0 break-words text-sm font-medium">{scenario.name}</span>
              {session.comparison?.id === scenario.id && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-foreground">
                  Comparing
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {scenario.portfolio.cloud.toUpperCase()} · {scenario.portfolio.workloads.length}{" "}
              {scenario.portfolio.workloads.length === 1 ? "workload" : "workloads"}
            </p>
            <div className="mt-2 flex flex-wrap gap-1 border-t pt-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="min-h-11"
                onClick={() => {
                  session.loadScenario(scenario.id);
                  setFeedback(`Opened ${scenario.name}.`);
                }}
                aria-label={`Open ${scenario.name}`}
              >
                Open
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="min-h-11"
                disabled={atCapacity}
                onClick={() => {
                  session.duplicateScenario(scenario.id);
                  setFeedback(`Created ${scenario.name} copy.`);
                }}
                aria-label={`Duplicate ${scenario.name}`}
              >
                Duplicate
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="ml-auto min-h-11"
                onClick={() => {
                  session.removeScenario(scenario.id);
                  setFeedback(`Deleted ${scenario.name}.`);
                  nameInput.current?.focus();
                }}
                aria-label={`Delete ${scenario.name}`}
              >
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
