import {
  listRegions,
  type Cloud,
  type SimplePlan,
  type TeamPresetId,
  type Tier,
  type WorkloadMix,
} from "@cayfore/engine";
import { money } from "../../format";
import { Separator } from "../ui/separator";
import { CloudSection, SpendSection } from "./plan-cloud-spend";
import { GrowthSection, MixSection } from "./plan-mix-growth";
import { pct } from "./plan-widgets";

export function PlanForm({
  plan,
  source,
  listMonthly,
  usageLocked,
  detailLocked = false,
  fittedForecast = false,
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
  source: object;
  listMonthly: number;
  usageLocked: boolean;
  detailLocked?: boolean;
  fittedForecast?: boolean;
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
  const regions = listRegions(plan.cloud);
  const mixLine = `${pct(plan.mix.etl)} pipelines, ${pct(plan.mix.sql)} dashboards, ${pct(plan.mix.ml)} models`;

  return (
    <form
      className="grid min-w-0 gap-5"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <CloudSection plan={plan} regions={regions} onCloud={onCloud} onTier={onTier} onRegion={onRegion} />
      {usageLocked && (
        <p className="text-xs text-muted-foreground">
          Imported costs retain their source pricing. Cloud and region set defaults for new products and catalog
          estimates.
        </p>
      )}
      <Separator />
      {usageLocked || detailLocked ? (
        <div className="grid gap-2 text-sm">
          <p className="font-semibold">Monthly baseline · {money(listMonthly, 2)}</p>
          <p className="text-muted-foreground">
            {usageLocked
              ? "Imported products and costs set the baseline. Review the cost split and import details alongside the forecast."
              : "Your workload configurations set the baseline. Open Advanced to change individual products."}
          </p>
        </div>
      ) : (
        <>
          <SpendSection
            plan={plan}
            source={source}
            listMonthly={listMonthly}
            usageLocked={usageLocked || detailLocked}
            mixLine={mixLine}
            onSpend={onSpend}
            onPreset={onPreset}
          />
          <MixSection plan={plan} usageLocked={false} onMix={onMix} />
        </>
      )}
      {usageLocked && (
        <p className="text-sm text-muted-foreground" data-testid="usage-summary">
          Your usage file supplies the monthly baseline.{" "}
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
      {fittedForecast && (
        <p className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
          Your imported history sets the monthly forecast profile. Choosing a growth rate switches to a manual growth
          assumption.
        </p>
      )}
      <GrowthSection
        step={usageLocked || detailLocked ? "2" : "4"}
        plan={plan}
        source={source}
        onGrowth={onGrowth}
        onCommit={onCommit}
      />
    </form>
  );
}
