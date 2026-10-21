import { type SimplePlan, type WorkloadMix } from "@cayfore/engine";
import { useId, useState } from "react";
import { Input } from "../ui/input";
import { Slider } from "../ui/slider";
import { SegmentedStrip, SegmentedStripItem } from "../ui/segmented-strip";
import { GROWTH, MIX_DOT, MIX_FIELDS, MixBar, Step, growthValue, pct } from "./plan-widgets";

export function MixSection({
  plan,
  usageLocked,
  onMix,
}: {
  plan: SimplePlan;
  usageLocked: boolean;
  onMix: (key: keyof WorkloadMix, value: number) => void;
}) {
  return (
    <>
      <Step id="plan-mix" n="3" title="Mix" disabled={usageLocked}>
        {MIX_FIELDS.map((field) => (
          <div key={field.key} className="grid gap-2">
            <div className="flex items-center justify-between text-sm font-medium">
              <span className="flex items-center gap-2">
                <span className={`size-2 rounded-full ${MIX_DOT[field.key]}`} aria-hidden="true" />
                {field.label}
              </span>
              <span className="tabular-nums">{pct(plan.mix[field.key])}</span>
            </div>
            <Slider
              aria-label={field.label}
              min={0}
              max={100}
              step={1}
              disabled={usageLocked}
              value={[Math.round(plan.mix[field.key] * 100)]}
              aria-valuetext={`${pct(plan.mix[field.key])} ${field.label.toLowerCase()}`}
              onValueChange={(value) => onMix(field.key, (value[0] ?? 0) / 100)}
            />
          </div>
        ))}
        <MixBar mix={plan.mix} disabled={usageLocked} onMix={onMix} />
      </Step>
    </>
  );
}

export function GrowthSection({
  step = "4",
  plan,
  source,
  onGrowth,
  onCommit,
}: {
  step?: string;
  plan: SimplePlan;
  source: object;
  onGrowth: (rate: number) => void;
  onCommit: (rate: number) => void;
}) {
  const growthPercent = Math.round(plan.monthlyGrowth * 1000) / 10;
  const [growthText, setGrowthText] = useState("");
  const [growthFocus, setGrowthFocus] = useState(false);
  const [growthError, setGrowthError] = useState("");
  const [previousSource, setPreviousSource] = useState(source);
  const errorId = useId();
  if (previousSource !== source) {
    setPreviousSource(source);
    setGrowthText(String(growthPercent));
    setGrowthError("");
  }
  return (
    <>
      <Step id="plan-growth" n={step} title="Monthly growth">
        <SegmentedStrip
          label="Monthly growth"
          value={growthValue(plan.monthlyGrowth)}
          onValueChange={(value) => {
            if (value) {
              setGrowthError("");
              onGrowth(Number(value));
            }
          }}
        >
          {GROWTH.map((rate) => (
            <SegmentedStripItem key={rate} value={String(rate)}>
              {Math.round(rate * 100)}%
            </SegmentedStripItem>
          ))}
        </SegmentedStrip>
        <label className="flex items-center justify-between gap-4 text-sm font-medium">
          Custom
          <span className="relative block w-28 font-normal">
            <Input
              inputMode="decimal"
              aria-label="Custom monthly growth"
              aria-describedby={growthError ? errorId : undefined}
              aria-invalid={Boolean(growthError)}
              className="h-11 pr-8 text-base tabular-nums sm:text-sm"
              value={growthFocus || growthError ? growthText : String(growthPercent)}
              onFocus={() => {
                setGrowthFocus(true);
                if (!growthError) setGrowthText(String(growthPercent));
              }}
              onChange={(event) => {
                setGrowthText(event.target.value);
                setGrowthError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
              }}
              onBlur={() => {
                setGrowthFocus(false);
                const value = Number(growthText);
                if (!growthText.trim() || !Number.isFinite(value) || value < -20 || value > 20) {
                  setGrowthError("Enter monthly growth from −20% to 20%.");
                  return;
                }
                setGrowthError("");
                onGrowth(value / 100);
              }}
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground">
              %
            </span>
          </span>
        </label>
        {growthError && (
          <p id={errorId} className="text-sm text-destructive" role="alert">
            {growthError}
          </p>
        )}
        <div className="grid gap-2 border-t pt-3">
          <div className="flex items-center justify-between text-sm font-medium">
            <span>Optional commitment discount</span>
            <span className="tabular-nums">{Math.round(plan.commitDiscount * 100)}%</span>
          </div>
          <Slider
            aria-label="Commitment discount"
            min={0}
            max={60}
            step={1}
            value={[Math.round(plan.commitDiscount * 100)]}
            aria-valuetext={`${Math.round(plan.commitDiscount * 100)} percent off the Databricks portion`}
            onValueChange={(value) => onCommit((value[0] ?? 0) / 100)}
          />
        </div>
        <p className="text-sm text-muted-foreground">Applies to the Databricks portion only, not cloud machines.</p>
      </Step>
    </>
  );
}
