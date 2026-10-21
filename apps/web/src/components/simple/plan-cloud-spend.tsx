import { TEAM_PRESETS, type Cloud, type SimplePlan, type TeamPresetId, type Tier } from "@cayfore/engine";
import { useId, useState } from "react";
import { money } from "../../format";
import { Input } from "../ui/input";
import { OptionSelect } from "../ui/option-select";
import { SegmentedStrip, SegmentedStripItem } from "../ui/segmented-strip";
import { CLOUDS, TIERS, Step, describePreset, pressedPreset } from "./plan-widgets";

export function CloudSection({
  plan,
  regions,
  onCloud,
  onTier,
  onRegion,
}: {
  plan: SimplePlan;
  regions: { id: string; label: string }[];
  onCloud: (cloud: Cloud) => void;
  onTier: (tier: Tier) => void;
  onRegion: (region: string) => void;
}) {
  return (
    <>
      <Step
        id="plan-cloud"
        n="1"
        title="Cloud"
        hint="Sets the cloud, edition, and region used to price new workloads. Prices follow the selected region."
      >
        <SegmentedStrip label="Cloud" value={plan.cloud} onValueChange={(value) => value && onCloud(value as Cloud)}>
          {CLOUDS.map((cloud) => (
            <SegmentedStripItem key={cloud.id} value={cloud.id}>
              {cloud.glyph}
              {cloud.label}
            </SegmentedStripItem>
          ))}
        </SegmentedStrip>
        <div className="grid min-w-0 items-start gap-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="grid min-w-0 gap-2">
            <p className="text-sm font-medium">Edition</p>
            <SegmentedStrip label="Edition" value={plan.tier} onValueChange={(value) => value && onTier(value as Tier)}>
              {TIERS.map((tier) => (
                <SegmentedStripItem key={tier.id} value={tier.id}>
                  {tier.label}
                </SegmentedStripItem>
              ))}
            </SegmentedStrip>
          </div>
          <OptionSelect
            className="min-w-0"
            tone="field"
            label="Region"
            value={plan.region}
            onValueChange={onRegion}
            options={regions.map((region) => ({ value: region.id, label: region.label }))}
          />
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Prices follow the selected region. New plans start in each cloud's reference region.
        </p>
      </Step>
    </>
  );
}

export function SpendSection({
  plan,
  source,
  listMonthly,
  usageLocked,
  mixLine,
  onSpend,
  onPreset,
}: {
  plan: SimplePlan;
  source: object;
  listMonthly: number;
  usageLocked: boolean;
  mixLine: string;
  onSpend: (amount: number) => void;
  onPreset: (id: TeamPresetId) => void;
}) {
  const [spendText, setSpendText] = useState("");
  const [spendFocus, setSpendFocus] = useState(false);
  const [spendError, setSpendError] = useState("");
  const [previousSource, setPreviousSource] = useState(source);
  const errorId = useId();
  if (previousSource !== source) {
    setPreviousSource(source);
    setSpendText(String(plan.monthlySpend));
    setSpendError("");
  }
  return (
    <>
      <Step
        id="plan-spend"
        n="2"
        title="Starting spend"
        hint="Monthly amount before commitment discounts. Team-size presets replace this baseline. Enter $0 to $1,000,000,000."
        disabled={usageLocked}
      >
        <label className="grid gap-2 text-sm font-medium">
          Starting monthly spend
          <span className="relative block font-normal">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            >
              $
            </span>
            <Input
              inputMode="decimal"
              aria-describedby={`spend-hint${spendError ? ` ${errorId}` : ""}`}
              aria-invalid={Boolean(spendError)}
              className="h-12 pl-7 text-lg tabular-nums"
              value={spendFocus || spendError ? spendText : String(plan.monthlySpend)}
              onFocus={() => {
                setSpendFocus(true);
                if (!spendError) setSpendText(String(plan.monthlySpend));
              }}
              onChange={(event) => {
                setSpendText(event.target.value);
                setSpendError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
              }}
              onBlur={() => {
                setSpendFocus(false);
                const text = spendText.replace(/[$,\s]/g, "");
                const amount = Number(text);
                if (!text || !Number.isFinite(amount) || amount < 0 || amount > 1e9) {
                  setSpendError("Enter a monthly spend from $0 to $1,000,000,000.");
                  return;
                }
                setSpendError("");
                onSpend(amount);
              }}
            />
          </span>
        </label>
        {spendError && (
          <p id={errorId} className="text-sm text-destructive" role="alert">
            {spendError}
          </p>
        )}
        <p id="spend-hint" className="text-sm text-muted-foreground">
          Before any commitment discount. Or choose a team size.
        </p>
        {Math.abs(plan.monthlySpend - listMonthly) > 0.005 && (
          <p className="text-xs text-muted-foreground">
            Modeled monthly baseline: {money(listMonthly, 2)}. Sizing and machine-pricing assumptions can change this
            amount.
          </p>
        )}
        <SegmentedStrip
          label="Team size"
          variant="rail"
          disabled={usageLocked}
          value={pressedPreset(plan, listMonthly, usageLocked) ?? ""}
          onValueChange={(value) => {
            if (value) {
              setSpendError("");
              onPreset(value as TeamPresetId);
            }
          }}
        >
          {TEAM_PRESETS.map((preset) => (
            <SegmentedStripItem key={preset.id} value={preset.id}>
              <span className="text-sm font-semibold">{preset.label}</span>
              <span className="text-sm font-medium tabular-nums">{money(preset.monthlySpend, 0)}</span>
              <span className="hidden text-xs font-normal text-muted-foreground sm:block">{preset.detail}</span>
            </SegmentedStripItem>
          ))}
        </SegmentedStrip>
        <p className="text-sm text-muted-foreground" data-testid="mix-assumption">
          {mixLine}. {describePreset(plan)}
        </p>
      </Step>
    </>
  );
}
