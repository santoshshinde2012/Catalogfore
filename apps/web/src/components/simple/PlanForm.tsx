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
      className="plan"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <fieldset>
        <legend>Cloud and tier</legend>
        <div className="choice-row" role="group" aria-label="Cloud">
          {CLOUDS.map((cloud) => (
            <button
              key={cloud.id}
              type="button"
              className="btn"
              aria-pressed={plan.cloud === cloud.id}
              onClick={() => onCloud(cloud.id)}
            >
              {cloud.label}
            </button>
          ))}
        </div>
        <div className="choice-row" role="group" aria-label="Tier">
          {TIERS.map((tier) => (
            <button
              key={tier.id}
              type="button"
              className="btn"
              aria-pressed={plan.tier === tier.id}
              onClick={() => onTier(tier.id)}
            >
              {tier.label}
            </button>
          ))}
        </div>
        <label className="field">
          Region
          <select value={plan.region} onChange={(event) => onRegion(event.target.value)}>
            {regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.label}
              </option>
            ))}
          </select>
        </label>
        <p className="hint">Region is optional. The default is the reference region for that cloud.</p>
      </fieldset>

      <fieldset disabled={usageLocked}>
        <legend>Starting point</legend>
        <label className="field">
          Starting monthly spend
          <input
            inputMode="decimal"
            aria-describedby="spend-hint"
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
        </label>
        <p id="spend-hint" className="hint">
          Before a commitment discount. Or start from a team size.
        </p>
        <div className="choice-row" role="group" aria-label="Team size">
          {TEAM_PRESETS.map((preset) => {
            const pressed =
              !usageLocked &&
              Math.abs(plan.mix.etl - preset.mix.etl) < 0.02 &&
              Math.abs(plan.mix.sql - preset.mix.sql) < 0.02 &&
              Math.abs(plan.mix.ml - preset.mix.ml) < 0.02 &&
              Math.abs(listMonthly - preset.monthlySpend) < 50;
            return (
              <button
                key={preset.id}
                type="button"
                className="btn"
                aria-pressed={pressed}
                onClick={() => onPreset(preset.id)}
              >
                {preset.label}
                <span className="btn-sub">{money(preset.monthlySpend, 0)}</span>
              </button>
            );
          })}
        </div>
        <p className="hint" data-testid="mix-assumption">
          {mixLine}. {describePreset(plan)}
        </p>
      </fieldset>

      <fieldset disabled={usageLocked}>
        <legend>Workload mix</legend>
        {MIX_FIELDS.map((field) => (
          <label key={field.key} className="field range-field">
            <span>
              {field.label}
              <strong>{pct(plan.mix[field.key])}</strong>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(plan.mix[field.key] * 100)}
              aria-valuetext={`${pct(plan.mix[field.key])} ${field.label.toLowerCase()}`}
              onChange={(event) => onMix(field.key, Number(event.target.value) / 100)}
            />
          </label>
        ))}
        <div className="mix-bar" aria-hidden="true">
          <span style={{ width: `${plan.mix.etl * 100}%` }} />
          <span style={{ width: `${plan.mix.sql * 100}%` }} />
          <span style={{ width: `${plan.mix.ml * 100}%` }} />
        </div>
      </fieldset>

      {usageLocked && (
        <p className="hint" data-testid="usage-summary">
          From your usage file: about {money(listMonthly, 0)} this month. {mixLine}.{" "}
          <button type="button" className="btn" onClick={onClearUsage}>
            Use the sliders instead
          </button>
        </p>
      )}

      <fieldset>
        <legend>Growth and discount</legend>
        <div className="choice-row" role="group" aria-label="Monthly growth">
          {GROWTH.map((rate) => (
            <button
              key={rate}
              type="button"
              className="btn"
              aria-pressed={Math.abs(plan.monthlyGrowth - rate) < 0.0005}
              onClick={() => onGrowth(rate)}
            >
              {Math.round(rate * 100)}%
            </button>
          ))}
        </div>
        <label className="field">
          Monthly growth, custom
          <input
            inputMode="decimal"
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
        </label>
        <label className="field range-field">
          <span>
            Commitment discount
            <strong>{Math.round(plan.commitDiscount * 100)}%</strong>
          </span>
          <input
            type="range"
            min={0}
            max={60}
            step={1}
            value={Math.round(plan.commitDiscount * 100)}
            aria-valuetext={`${Math.round(plan.commitDiscount * 100)} percent off the Databricks portion`}
            onChange={(event) => onCommit(Number(event.target.value) / 100)}
          />
        </label>
        <p className="hint">
          Optional. It reduces the Databricks portion, not the cloud machines. Leave it at 0 if you do not have one.
        </p>
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
