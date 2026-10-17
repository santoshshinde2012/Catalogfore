import { TEAM_PRESETS, type Cloud, type SimplePlan, type TeamPresetId, type Tier } from "@cayfore/engine";
import { useId, useState, type Dispatch, type SetStateAction } from "react";
import { money } from "../../format";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
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
      <Step n="1" title="Cloud">
        <SegmentedStrip label="Cloud" value={plan.cloud} onValueChange={(value) => value && onCloud(value as Cloud)}>
          {CLOUDS.map((cloud) => (
            <SegmentedStripItem key={cloud.id} value={cloud.id}>
              {cloud.glyph}
              {cloud.label}
            </SegmentedStripItem>
          ))}
        </SegmentedStrip>
        <SegmentedStrip
          label="Tier"
          className="w-fit max-w-full"
          value={plan.tier}
          onValueChange={(value) => value && onTier(value as Tier)}
        >
          {TIERS.map((tier) => (
            <SegmentedStripItem key={tier.id} value={tier.id}>
              {tier.label}
            </SegmentedStripItem>
          ))}
        </SegmentedStrip>
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
      </Step>
    </>
  );
}

export function SpendSection({
  plan,
  listMonthly,
  usageLocked,
  mixLine,
  spendFocus,
  spendText,
  setSpendFocus,
  setSpendText,
  onSpend,
  onPreset,
}: {
  plan: SimplePlan;
  listMonthly: number;
  usageLocked: boolean;
  mixLine: string;
  spendFocus: boolean;
  spendText: string;
  setSpendFocus: Dispatch<SetStateAction<boolean>>;
  setSpendText: Dispatch<SetStateAction<string>>;
  onSpend: (amount: number) => void;
  onPreset: (id: TeamPresetId) => void;
}) {
  const [spendError, setSpendError] = useState("");
  const errorId = useId();
  return (
    <>
      <Step n="2" title="Starting point" disabled={usageLocked}>
        <label className="grid gap-2 text-sm font-medium">
          Starting monthly spend
          <span className="relative block font-normal">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
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
