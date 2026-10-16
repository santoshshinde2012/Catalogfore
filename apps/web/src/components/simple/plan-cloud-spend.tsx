import { TEAM_PRESETS, type Cloud, type SimplePlan, type TeamPresetId, type Tier } from "@cayfore/engine";
import type { Dispatch, SetStateAction } from "react";
import { money } from "../../format";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import { CLOUDS, TIERS, Step, TEAM_ICONS, describePreset, pressedPreset } from "./plan-widgets";

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
        <ToggleGroup
          type="single"
          value={plan.cloud}
          onValueChange={(value) => value && onCloud(value as Cloud)}
          aria-label="Cloud"
          className="grid grid-cols-3"
        >
          {CLOUDS.map((cloud) => (
            <ToggleGroupItem key={cloud.id} value={cloud.id} className="h-auto flex-col gap-1 py-2">
              {cloud.glyph}
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
        <ToggleGroup
          type="single"
          value={pressedPreset(plan, listMonthly, usageLocked) ?? ""}
          onValueChange={(value) => value && onPreset(value as TeamPresetId)}
          aria-label="Team size"
          className="grid grid-cols-1 gap-2 bg-transparent p-0"
          disabled={usageLocked}
        >
          {TEAM_PRESETS.map((preset) => {
            const Icon = TEAM_ICONS[preset.id];
            return (
              <ToggleGroupItem
                key={preset.id}
                value={preset.id}
                className="h-auto items-start justify-start gap-3 rounded-lg border bg-card px-3 py-3 text-left shadow-none ring-0 data-[state=on]:border-foreground data-[state=on]:shadow-sm data-[state=on]:ring-1 data-[state=on]:ring-foreground"
              >
                <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span className="grid gap-0.5">
                  <span>
                    {preset.label}
                    <span className="ml-2 font-normal text-muted-foreground tabular-nums">
                      {money(preset.monthlySpend, 0)}
                    </span>
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">{preset.detail}</span>
                </span>
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
        <p className="text-sm text-muted-foreground" data-testid="mix-assumption">
          {mixLine}. {describePreset(plan)}
        </p>
      </Step>
    </>
  );
}
