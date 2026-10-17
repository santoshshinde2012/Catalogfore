import {
  listRegions,
  type Cloud,
  type SimplePlan,
  type TeamPresetId,
  type Tier,
  type WorkloadMix,
} from "@cayfore/engine";
import { useState } from "react";
import { money } from "../../format";
import { Separator } from "../ui/separator";
import { CloudSection, SpendSection } from "./plan-cloud-spend";
import { GrowthSection, MixSection } from "./plan-mix-growth";
import { pct } from "./plan-widgets";

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
      className="grid min-w-0 gap-6"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <CloudSection plan={plan} regions={regions} onCloud={onCloud} onTier={onTier} onRegion={onRegion} />
      <Separator />
      <SpendSection
        plan={plan}
        listMonthly={listMonthly}
        usageLocked={usageLocked}
        mixLine={mixLine}
        spendFocus={spendFocus}
        spendText={spendText}
        setSpendFocus={setSpendFocus}
        setSpendText={setSpendText}
        onSpend={onSpend}
        onPreset={onPreset}
      />
      <MixSection plan={plan} usageLocked={usageLocked} onMix={onMix} />
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
      <GrowthSection
        plan={plan}
        growthFocus={growthFocus}
        growthText={growthText}
        growthPercent={growthPercent}
        setGrowthFocus={setGrowthFocus}
        setGrowthText={setGrowthText}
        onGrowth={onGrowth}
        onCommit={onCommit}
      />
    </form>
  );
}
