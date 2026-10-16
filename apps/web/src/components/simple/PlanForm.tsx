import {
  listRegions,
  TEAM_PRESETS,
  type Cloud,
  type SimplePlan,
  type TeamPresetId,
  type Tier,
  type WorkloadMix,
} from "@dcf/engine";
import { useState } from "react";
import { money } from "../../format";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Separator } from "../ui/separator";
import { Slider } from "../ui/slider";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";

const CLOUDS: { id: Cloud; label: string }[] = [
  { id: "aws", label: "AWS" },
  { id: "azure", label: "Azure" },
  { id: "gcp", label: "GCP" },
];

const TIERS: { id: Tier; label: string }[] = [
  { id: "premium", label: "Premium" },
  { id: "enterprise", label: "Enterprise" },
];

const GROWTH = [0, 0.03, 0.05, 0.1];

const MIX_FIELDS: { key: keyof WorkloadMix; label: string }[] = [
  { key: "etl", label: "Pipelines" },
  { key: "sql", label: "Dashboards" },
  { key: "ml", label: "Models" },
];

const MIX_DOT: Record<keyof WorkloadMix, string> = {
  etl: "bg-lava",
  sql: "bg-[#146c43]",
  ml: "bg-[#b45309]",
};

export function PlanForm({
  plan,
  listMonthly,
  usageLocked,
  onCloud,
  onTier,
  onRegion,
  onSpend,
  onPreset,
  onMix,
  onGrowth,
  onCommit,
  onClearUsage,
}: {
  plan: SimplePlan;
  listMonthly: number;
  usageLocked: boolean;
  onCloud: (cloud: Cloud) => void;
  onTier: (tier: Tier) => void;
  onRegion: (region: string) => void;
  onSpend: (amount: number) => void;
  onPreset: (id: TeamPresetId) => void;
  onMix: (key: keyof WorkloadMix, value: number) => void;
  onGrowth: (rate: number) => void;
  onCommit: (rate: number) => void;
  onClearUsage: () => void;
}) {
  const [spendText, setSpendText] = useState("");
  const [spendFocus, setSpendFocus] = useState(false);
  const [growthText, setGrowthText] = useState("");
  const [growthFocus, setGrowthFocus] = useState(false);
  const regions = listRegions(plan.cloud);
  const growthPercent = Math.round(plan.monthlyGrowth * 1000) / 10;
  const mixLine = `${pct(plan.mix.etl)} pipelines, ${pct(plan.mix.sql)} dashboards, ${pct(plan.mix.ml)} models`;

  return (
    <form
      className="grid gap-6"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <fieldset className="grid gap-4" disabled={false}>
        <legend className="text-sm font-medium">Cloud and tier</legend>
        <ToggleGroup
          type="single"
          value={plan.cloud}
          onValueChange={(value) => value && onCloud(value as Cloud)}
          aria-label="Cloud"
          className="grid grid-cols-3"
        >
          {CLOUDS.map((cloud) => (
            <ToggleGroupItem key={cloud.id} value={cloud.id} className="h-9">
              {cloud.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <ToggleGroup
          type="single"
          value={plan.tier}
          onValueChange={(value) => value && onTier(value as Tier)}
          aria-label="Tier"
          className="grid grid-cols-2"
        >
          {TIERS.map((tier) => (
            <ToggleGroupItem key={tier.id} value={tier.id} className="h-9">
              {tier.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <label className="grid gap-2 text-sm font-medium">
          Region
          <Select value={plan.region} onValueChange={onRegion}>
            <SelectTrigger aria-label="Region">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {regions.map((region) => (
                <SelectItem key={region.id} value={region.id}>
                  {region.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <p className="text-sm text-muted-foreground">Optional. Each cloud starts in its reference region.</p>
      </fieldset>

      <Separator />

      <fieldset className="grid gap-4" disabled={usageLocked}>
        <legend className="text-sm font-medium">Starting point</legend>
        <label className="grid gap-2 text-sm font-medium">
          Starting monthly spend
          <span className="relative block font-normal">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              inputMode="decimal"
              aria-describedby="spend-hint"
              className="h-12 pl-7 text-lg tabular-nums"
              value={spendFocus ? spendText : String(Math.round(listMonthly))}
              onFocus={() => {
                setSpendFocus(true);
                setSpendText(String(Math.round(listMonthly)));
              }}
              onChange={(event) => setSpendText(event.target.value)}
              onBlur={() => {
                setSpendFocus(false);
                const amount = Number(spendText.replace(/[$,\s]/g, ""));
                if (Number.isFinite(amount)) onSpend(amount);
              }}
            />
          </span>
        </label>
        <p id="spend-hint" className="text-sm text-muted-foreground">
          Before any commitment discount. Or choose a team size.
        </p>
        <ToggleGroup
          type="single"
          value={pressedPreset(plan, listMonthly, usageLocked) ?? ""}
          onValueChange={(value) => value && onPreset(value as TeamPresetId)}
          aria-label="Team size"
          className="grid grid-cols-3"
          disabled={usageLocked}
        >
          {TEAM_PRESETS.map((preset) => (
            <ToggleGroupItem
              key={preset.id}
              value={preset.id}
              className="h-auto flex-col items-start gap-0.5 px-3 py-2"
            >
              {preset.label}
              <span className="text-xs font-normal text-muted-foreground tabular-nums">
                {money(preset.monthlySpend, 0)}
              </span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p className="text-sm text-muted-foreground" data-testid="mix-assumption">
          {mixLine}. {describePreset(plan)}
        </p>
      </fieldset>

      <fieldset className="grid gap-4" disabled={usageLocked}>
        <legend className="text-sm font-medium">Workload mix</legend>
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
        <div className="flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <span className="bg-lava" style={{ width: `${plan.mix.etl * 100}%` }} />
          <span className="bg-[#146c43]" style={{ width: `${plan.mix.sql * 100}%` }} />
          <span className="bg-[#b45309]" style={{ width: `${plan.mix.ml * 100}%` }} />
        </div>
      </fieldset>

      {usageLocked && (
        <p className="text-sm text-muted-foreground" data-testid="usage-summary">
          From your usage file: about {money(listMonthly, 0)} this month. {mixLine}.{" "}
          <button
            type="button"
            className="font-medium text-link underline-offset-4 hover:underline"
            onClick={onClearUsage}
          >
            Use the sliders instead
          </button>
        </p>
      )}

      <Separator />

      <fieldset className="grid gap-4">
        <legend className="text-sm font-medium">Growth and discount</legend>
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
      </fieldset>
    </form>
  );
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function describePreset(plan: SimplePlan): string {
  const match = TEAM_PRESETS.find(
    (preset) =>
      Math.abs(plan.mix.etl - preset.mix.etl) < 0.02 &&
      Math.abs(plan.mix.sql - preset.mix.sql) < 0.02 &&
      Math.abs(plan.mix.ml - preset.mix.ml) < 0.02,
  );
  return match ? match.detail : "Custom mix.";
}

function pressedPreset(plan: SimplePlan, listMonthly: number, usageLocked: boolean): TeamPresetId | null {
  if (usageLocked) return null;
  const match = TEAM_PRESETS.find(
    (preset) =>
      Math.abs(plan.mix.etl - preset.mix.etl) < 0.02 &&
      Math.abs(plan.mix.sql - preset.mix.sql) < 0.02 &&
      Math.abs(plan.mix.ml - preset.mix.ml) < 0.02 &&
      Math.abs(listMonthly - preset.monthlySpend) < 50,
  );
  return match?.id ?? null;
}

function growthValue(rate: number): string {
  const match = GROWTH.find((preset) => Math.abs(rate - preset) < 0.0005);
  return match === undefined ? "" : String(match);
}
