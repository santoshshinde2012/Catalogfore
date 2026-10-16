import { type SimplePlan, type WorkloadMix } from "@cayfore/engine";
import type { Dispatch, SetStateAction } from "react";
import { Input } from "../ui/input";
import { Slider } from "../ui/slider";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
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
      <Step n="3" title="Mix" disabled={usageLocked}>
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
  plan,
  growthFocus,
  growthText,
  growthPercent,
  setGrowthFocus,
  setGrowthText,
  onGrowth,
  onCommit,
}: {
  plan: SimplePlan;
  growthFocus: boolean;
  growthText: string;
  growthPercent: number;
  setGrowthFocus: Dispatch<SetStateAction<boolean>>;
  setGrowthText: Dispatch<SetStateAction<string>>;
  onGrowth: (rate: number) => void;
  onCommit: (rate: number) => void;
}) {
  return (
    <>
      <Step n="4" title="Growth">
        <ToggleGroup
          type="single"
          value={growthValue(plan.monthlyGrowth)}
          onValueChange={(value) => {
            if (value) onGrowth(Number(value));
          }}
          aria-label="Monthly growth"
        >
          {GROWTH.map((rate) => (
            <ToggleGroupItem key={rate} value={String(rate)} className="h-9 min-w-14">
              {Math.round(rate * 100)}%
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <label className="flex items-center justify-between gap-4 text-sm font-medium">
          Custom
          <span className="relative block w-28 font-normal">
            <Input
              inputMode="decimal"
              aria-label="Custom monthly growth"
              className="h-9 pr-8 tabular-nums"
              value={growthFocus ? growthText : String(growthPercent)}
              onFocus={() => {
                setGrowthFocus(true);
                setGrowthText(String(growthPercent));
              }}
              onChange={(event) => setGrowthText(event.target.value)}
              onBlur={() => {
                setGrowthFocus(false);
                const value = Number(growthText);
                if (Number.isFinite(value)) onGrowth(value / 100);
              }}
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground">
              %
            </span>
          </span>
        </label>
        <div className="grid gap-2">
          <div className="flex items-center justify-between text-sm font-medium">
            <span>Commitment discount</span>
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
