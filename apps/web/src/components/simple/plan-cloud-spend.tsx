import { TEAM_PRESETS, type Cloud, type SimplePlan, type TeamPresetId, type Tier } from "@cayfore/engine";
import type { Dispatch, SetStateAction } from "react";
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
        <SegmentedStrip
          label="Team size"
          variant="rail"
          disabled={usageLocked}
          value={pressedPreset(plan, listMonthly, usageLocked) ?? ""}
          onValueChange={(value) => value && onPreset(value as TeamPresetId)}
        >
          {TEAM_PRESETS.map((preset) => (
            <SegmentedStripItem key={preset.id} value={preset.id}>
              <span className="text-sm font-semibold">{preset.label}</span>
              <span className="text-sm font-medium tabular-nums">{money(preset.monthlySpend, 0)}</span>
              <span className="text-xs font-normal text-muted-foreground">{preset.detail}</span>
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
